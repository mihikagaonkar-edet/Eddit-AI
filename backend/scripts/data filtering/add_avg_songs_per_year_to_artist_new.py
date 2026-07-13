"""
Add an "Avg. song per yr" column to data/artist_new.csv using MusicBrainz.

For each artist:
  1. Resolve the name to a MusicBrainz artist MBID via the artist search API
     (top-scored match).
  2. Browse their release-groups of primary type Album or EP with no
     secondary type (excludes Live, Compilation, Remix, Soundtrack, Mixtape,
     etc.), so re-recordings/deluxe reissues still count as their own
     release-groups (a known over-count -- see caveat below).
  3. For each qualifying release-group, fetch one representative release
     (preferring status "Official") and sum its track counts to get a total
     song count.
  4. Years active = (current year - earliest qualifying release's year) + 1.
  5. Avg. song per yr = round(total songs / years active).

Caveat: MusicBrainz catalogs re-recordings (e.g. "Fearless (Taylor's
Version)") and deluxe/expanded reissues as separate release-groups, so an
artist's song total can include some duplicate/overlapping tracks rather
than a strictly deduplicated original-song count. This is a heuristic, not
an exact figure.

Artists with no qualifying release-groups get 0 and are logged to
data/missing_avg_songs_per_year.txt.

Respects MusicBrainz's courtesy rate limit (~1 request/second).

Run from backend/ directory:
    python scripts/add_avg_songs_per_year_to_artist_new.py
    python scripts/add_avg_songs_per_year_to_artist_new.py --start-from "Lewis Capaldi"
"""

import argparse
import csv
import time
from pathlib import Path

import requests

ARTIST_NEW_PATH = Path(__file__).resolve().parent.parent / "data" / "artist_new.csv"
MISSING_PATH    = Path(__file__).resolve().parent.parent / "data" / "missing_avg_songs_per_year.txt"

BASE_URL = "https://musicbrainz.org/ws/2"
HEADERS = {"User-Agent": "ArtistDataAggregator/1.0 (mihika@edetcorp.com)"}
CURRENT_YEAR = 2026

QUALIFYING_TYPES = {"Album", "EP"}
REQUEST_DELAY = 1.1


def get_with_retry(url: str, params: dict, max_retries: int = 5) -> dict:
    delay = 2
    for attempt in range(max_retries):
        resp = requests.get(url, params=params, headers=HEADERS, timeout=30)
        time.sleep(REQUEST_DELAY)
        if resp.status_code in (429, 503):
            print(f"    rate limited ({resp.status_code}), waiting {delay}s...")
            time.sleep(delay)
            delay *= 2
            continue
        resp.raise_for_status()
        return resp.json()
    resp.raise_for_status()
    return {}


def search_artist_mbid(name: str) -> str | None:
    data = get_with_retry(f"{BASE_URL}/artist/", {"query": f'artist:"{name}"', "fmt": "json", "limit": 5})
    artists = data.get("artists", [])
    return artists[0]["id"] if artists else None


def fetch_release_groups(mbid: str) -> list[dict]:
    release_groups = []
    offset = 0
    while True:
        data = get_with_retry(f"{BASE_URL}/release-group/", {
            "artist": mbid, "type": "album|ep", "limit": 100, "offset": offset, "fmt": "json",
        })
        batch = data.get("release-groups", [])
        release_groups.extend(batch)
        total = data.get("release-group-count", 0)
        offset += len(batch)
        if offset >= total or not batch:
            break
    return [
        rg for rg in release_groups
        if rg.get("primary-type") in QUALIFYING_TYPES and not rg.get("secondary-types")
    ]


def track_count_for_release_group(rgid: str) -> int:
    """Only counts release-groups with a real "Official" release, so
    bootlegs/mixtapes/snippet-tapes cataloged as plain "Album" don't inflate
    the count."""
    data = get_with_retry(f"{BASE_URL}/release/", {
        "release-group": rgid, "inc": "media", "fmt": "json", "limit": 10,
    })
    releases = data.get("releases", [])
    official = next((r for r in releases if r.get("status") == "Official"), None)
    if official is None:
        return 0
    return sum(m.get("track-count", 0) for m in official.get("media", []))


def parse_year(date_str: str) -> int | None:
    if not date_str:
        return None
    try:
        return int(date_str[:4])
    except ValueError:
        return None


def compute_avg_songs_per_year(name: str) -> int | None:
    mbid = search_artist_mbid(name)
    if not mbid:
        return None

    release_groups = fetch_release_groups(mbid)
    if not release_groups:
        return None

    total_songs = 0
    years = []
    for rg in release_groups:
        count = track_count_for_release_group(rg["id"])
        if count == 0:
            continue  # no "Official" release found -- likely a bootleg/mixtape
        year = parse_year(rg.get("first-release-date", ""))
        if year:
            years.append(year)
        total_songs += count

    if not years or total_songs == 0:
        return None

    years_active = max(1, CURRENT_YEAR - min(years) + 1)
    return round(total_songs / years_active)


def load_previous_missing() -> list[str]:
    if not MISSING_PATH.exists():
        return []
    lines = MISSING_PATH.read_text(encoding="utf-8").splitlines()
    return [line.strip() for line in lines[3:] if line.strip()]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--start-from",
        help="Artist name to resume from (rows before it in artist_new.csv are left untouched)",
    )
    args = parser.parse_args()

    with open(ARTIST_NEW_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = list(reader.fieldnames)
        rows = list(reader)

    if "Avg. song per yr" not in fieldnames:
        fieldnames.append("Avg. song per yr")

    start_index = 0
    if args.start_from:
        names_lower = [r["Artist Name"].strip().lower() for r in rows]
        target = args.start_from.strip().lower()
        if target not in names_lower:
            raise SystemExit(f"'{args.start_from}' not found in {ARTIST_NEW_PATH.name}")
        start_index = names_lower.index(target)
        print(f"Resuming from '{rows[start_index]['Artist Name']}' (row {start_index + 1}/{len(rows)})\n")

    skipped_names = {r["Artist Name"].strip() for r in rows[:start_index]}
    unresolved = [n for n in load_previous_missing() if n in skipped_names]

    for row in rows[start_index:]:
        name = row["Artist Name"].strip()
        try:
            avg = compute_avg_songs_per_year(name)
        except requests.RequestException as e:
            print(f"  {name}: request failed ({e}), setting 0")
            avg = None

        if avg is None:
            unresolved.append(name)
            avg = 0

        row["Avg. song per yr"] = avg
        print(f"  {name}: {avg}")

    with open(ARTIST_NEW_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    MISSING_PATH.write_text(
        "Artists with no usable MusicBrainz release-group data (Avg. song per yr set to 0)\n"
        "Last checked: 2026-07-12\n\n"
        + "\n".join(unresolved),
        encoding="utf-8",
    )

    print(f"\nDone. Added 'Avg. song per yr' for {len(rows)} artists.")
    print(f"Unresolved: {len(unresolved)} (saved to {MISSING_PATH.name})")


if __name__ == "__main__":
    main()
