"""
Scrape Spotify monthly listeners directly from open.spotify.com for artists
that were not found on kworb.net.

Strategy:
  1. Search for the artist via Spotify's public search endpoint (no auth needed
     for the internal web API used by the open.spotify.com SPA).
  2. Extract the artist Spotify ID from the first result.
  3. Fetch the artist page and parse the monthly listener count from the
     embedded JSON (window.__INITIAL_STATE__ or Next.js props).
  4. Throttle requests to ~3 seconds apart to avoid rate limiting.

Run from backend/ directory:
    python scripts/scrape_spotify_direct.py
"""

import csv
import json
import re
import time
import random
from pathlib import Path

import requests

CSV_PATH = Path(__file__).resolve().parent.parent / "data" / "artists.csv"
MISSING_PATH = Path(__file__).resolve().parent.parent / "data" / "missing_spotify_listeners.txt"

# Artists known to not be on kworb — loaded from the missing file
def load_missing() -> list[str]:
    lines = MISSING_PATH.read_text(encoding="utf-8").splitlines()
    # Skip header lines (those without artist names start after the blank line)
    artists = [l.strip() for l in lines if l.strip() and not l.startswith("Artist") and not l.startswith("Last") and not l.startswith("These") and not l.startswith("Run")]
    return artists

# Known Spotify artist IDs to skip the search step (avoids extra requests)
KNOWN_IDS: dict[str, str] = {
    "mc hammer":     "3MZsBdqDrRTJihTHQrO6Dq",
    "fabolous":      "0eZPMLOR6jFJpHxR31aFT1",
    "salt n pepa":   "0NDBMnTsEBFMfzMpWHSpHd",
    "juicy j":       "3EiLUeyEcA6fbRPSHkG5kb",
    "yo gotti":      "2LIVqgUOAEzn3pVwJC4gqK",
    "nipsey hussle": "3Q4WeURsa8OH0SMTroDmlM",
    "plies":         "2cTMSXWMRBVGc5gMeR5JDF",
    "cypress hill":  "4P0dddbxPil35MNN9G2MEX",
    "juvenile":      "2YRIgQKMEcNUeHFlXkfabr",
    "method man":    "27T030eWyCVFMKOiQ1DJiS",
    "kris kross":    "4Ga5bFtL9B99YIwR9T2tOP",
    "run dmc":       "3AuMNF8rR2fF235Tz69xeP",
    "pusha t":       "6I3MElirhT5t6Kf7p0hGk9",
    "da brat":       "3WBSxrHzNqFRQFEiSFSRn7",
    "est gee":       "5IgDCHfq4wCyBVw4zAHmLM",
    "young ma":      "6xAxxABFLGXCEhNHbTsMYY",
    "nore":          "7HB0s00LhkwjRnCnQeKB5T",
    "queen latifah": "4evryBmwenMjUiMbBbLcYM",
    "mc lyte":       "1QQcuFP1VNuWTy0kGD6n8l",
    "foxy brown":    "14zFvEnVc5S3bRk7dLVNdI",
    "blueface":      "9fBhqCV2cSDCJCIBMzKKvH",
    "dej loaf":      "5ZsFI1h6hIdQRw2ti0hz81",
    "boosie badazz": "6Ip8FS7vWT1uKknjOyGb8E",
    "jim jones":     "4iLDMNPDHqPyYKHYhLzeDJ",
    "jj fad":        "0e3AQqhMGFBmFXJl4GFNgZ",
    "joe budden":    "5xNXULRgaRaO0CZXZQ2cWd",
    "troy ave":      "5xYZXIgVAND5sGKPLHJBBm",
    "maino":         "5W4vKhkS9mXJMFmFJGI2JR",
    "the sequence":  "3YJl8gQ7XxAp0vf7kIB4yM",
}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "DNT": "1",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}


def get_spotify_id(session: requests.Session, artist_name: str) -> str | None:
    """Search Spotify's internal API (no auth) to find an artist's ID."""
    url = "https://api.spotify.com/v1/search"
    # Use Spotify's public token endpoint — returns anonymous access token
    token_resp = session.get(
        "https://open.spotify.com/get_access_token?reason=transport&productType=web_player",
        headers={**HEADERS, "referer": "https://open.spotify.com/"},
        timeout=10,
    )
    if not token_resp.ok:
        print(f"    Could not get Spotify token: {token_resp.status_code}")
        return None
    token = token_resp.json().get("accessToken")
    if not token:
        return None

    search_resp = session.get(
        url,
        params={"q": artist_name, "type": "artist", "limit": 1},
        headers={**HEADERS, "Authorization": f"Bearer {token}"},
        timeout=10,
    )
    if not search_resp.ok:
        print(f"    Search failed: {search_resp.status_code}")
        return None
    items = search_resp.json().get("artists", {}).get("items", [])
    if not items:
        return None
    return items[0]["id"]


def get_monthly_listeners(session: requests.Session, spotify_id: str) -> int | None:
    """Fetch an artist page and extract monthly listeners from embedded JSON."""
    url = f"https://open.spotify.com/artist/{spotify_id}"
    resp = session.get(url, headers=HEADERS, timeout=15)
    if not resp.ok:
        print(f"    Artist page {resp.status_code}")
        return None

    # Spotify embeds stats in a <script id="initial-state"> JSON blob
    # Pattern: "monthlyListeners":12345678
    m = re.search(r'"monthlyListeners"\s*:\s*(\d+)', resp.text)
    if m:
        return int(m.group(1))

    # Fallback: look for "monthly listeners" text on the page
    m2 = re.search(r'([\d,]+)\s*monthly listeners', resp.text, re.IGNORECASE)
    if m2:
        return int(m2.group(1).replace(",", ""))

    return None


def fmt(n: int) -> str:
    return f"{round(n / 1_000_000, 1)}M"


def main():
    missing = load_missing()
    print(f"Attempting Spotify scrape for {len(missing)} artists...\n")

    rows = []
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        rows = list(reader)

    name_to_row = {r["Artist Name"].strip().lower(): r for r in rows}

    session = requests.Session()
    session.headers.update(HEADERS)

    updated = 0
    failed = []

    for artist in missing:
        key = artist.lower().strip()
        print(f"  {artist}: ", end="", flush=True)

        spotify_id = KNOWN_IDS.get(key)
        if not spotify_id:
            print("no ID, trying search... ", end="", flush=True)
            spotify_id = get_spotify_id(session, artist)
            time.sleep(random.uniform(2, 4))

        if not spotify_id:
            print("ID not found, skipping")
            failed.append(artist)
            continue

        listeners = get_monthly_listeners(session, spotify_id)
        # Polite delay: 3-5 seconds between page fetches
        time.sleep(random.uniform(3, 5))

        if listeners is None:
            print("listeners not found on page")
            failed.append(artist)
            continue

        formatted = fmt(listeners)
        row = name_to_row.get(key)
        if row:
            old = row["Spotify listeners"]
            row["Spotify listeners"] = formatted
            updated += 1
            print(f"{old} -> {formatted}")
        else:
            print(f"found {formatted} but no CSV row match")

    with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nDone. Updated {updated}/{len(missing)} artists.")
    if failed:
        print(f"Still missing ({len(failed)}): {', '.join(failed)}")


if __name__ == "__main__":
    main()
