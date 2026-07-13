"""
For every artist in data/artists.csv, query the MusicBrainz artist search API
(https://musicbrainz.org/ws/2/artist) and check whether the name matches an
existing MusicBrainz artist.

For each row this determines one of:
  OK          - exact (case-insensitive) match found, no change needed
  CLOSE MATCH - no exact match, but MusicBrainz's top result is a high-confidence
                (score >= 90) near match, so the row's Artist Name is corrected
                to MusicBrainz's spelling
  NOT FOUND   - no match with score >= 50 (or the request failed), name could
                not be verified

data/artists.csv is rewritten in place with corrected spellings for every
CLOSE MATCH row. Artists that could not be verified (NOT FOUND / LOW
CONFIDENCE / request errors) are left untouched in artists.csv and their
names are written to data/missing_musicbrainz_matches.txt instead.

MusicBrainz's API requires a descriptive User-Agent and asks that clients
stay under ~1 request/second, so this script sends one request per artist
with a 1.1s delay between calls.

Run from backend/ directory:
    python scripts/verify_artist_spelling.py
"""

import csv
import sys
import time
from pathlib import Path

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

CSV_PATH = Path(__file__).resolve().parent.parent / "data" / "artists.csv"
NOT_FOUND_PATH = Path(__file__).resolve().parent.parent / "data" / "missing_musicbrainz_matches.txt"
MUSICBRAINZ_URL = "https://musicbrainz.org/ws/2/artist"
USER_AGENT = "EdditAI-ArtistSpellCheck/1.0 (mihika@edetcorp.com)"
REQUEST_DELAY_SECONDS = 1.1
CLOSE_MATCH_SCORE_THRESHOLD = 90
NOT_FOUND_SCORE_THRESHOLD = 50


def make_session() -> requests.Session:
    session = requests.Session()
    session.headers.update({
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
    })
    retry = Retry(total=5, backoff_factor=2, status_forcelist=[429, 500, 502, 503, 504])
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session


def search_artist(session: requests.Session, name: str) -> list[dict]:
    """Query MusicBrainz artist search, return list of candidate artists sorted by score desc."""
    params = {
        "query": f'artist:"{name}"',
        "fmt": "json",
        "limit": 5,
    }
    resp = session.get(MUSICBRAINZ_URL, params=params, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    return data.get("artists", [])


def evaluate(name: str, candidates: list[dict]) -> tuple[str, str, int]:
    """Returns (status, best_match_name, best_score)."""
    if not candidates:
        return "NOT FOUND", "", 0

    best = candidates[0]
    best_name = best.get("name", "")
    best_score = int(best.get("score", 0))

    for candidate in candidates:
        if candidate.get("name", "").strip().lower() == name.strip().lower():
            return "OK", candidate.get("name", ""), int(candidate.get("score", 0))

    if best_score >= CLOSE_MATCH_SCORE_THRESHOLD:
        return "CLOSE MATCH", best_name, best_score

    if best_score >= NOT_FOUND_SCORE_THRESHOLD:
        return "LOW CONFIDENCE", best_name, best_score

    return "NOT FOUND", best_name, best_score


def main():
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = list(reader.fieldnames)
        rows = list(reader)

    print(f"Loaded {len(rows)} artists from {CSV_PATH.name}\n")

    session = make_session()
    not_found: list[str] = []
    corrected = 0

    for i, row in enumerate(rows, 1):
        name = row["Artist Name"].strip()
        print(f"[{i}/{len(rows)}] Checking '{name}'...", flush=True)

        try:
            candidates = search_artist(session, name)
        except requests.RequestException as e:
            print(f"  ERROR: {e}")
            not_found.append(name)
            time.sleep(REQUEST_DELAY_SECONDS)
            continue

        status, suggested_name, score = evaluate(name, candidates)

        if status == "CLOSE MATCH":
            print(f"  CORRECTING: '{name}' -> '{suggested_name}' (score {score})")
            row["Artist Name"] = suggested_name
            corrected += 1
        elif status != "OK":
            print(f"  {status}: best match '{suggested_name}' (score {score})")
            not_found.append(name)

        time.sleep(REQUEST_DELAY_SECONDS)

    with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    NOT_FOUND_PATH.write_text(
        "Artists that could not be verified against the MusicBrainz artist search API\n"
        f"Checked: {len(rows)} total, {len(not_found)} unresolved\n\n"
        + "\n".join(not_found),
        encoding="utf-8",
    )

    print(f"\nCorrected {corrected} artist name(s) in {CSV_PATH.name}.")
    print(f"{len(not_found)} artist(s) could not be verified, saved to {NOT_FOUND_PATH.name}.")


if __name__ == "__main__":
    main()
