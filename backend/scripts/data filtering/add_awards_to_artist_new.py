"""
Add an "awards" column to data/artist_new.csv: the number of distinct
awards each artist has received, per Wikidata's `award received` (P166)
property.

For each artist name:
  1. Resolve it to a Wikidata entity via the wbsearchentities API, preferring
     a candidate whose description looks like a music act (singer, band,
     rapper, etc.) and falling back to the top search result otherwise.
  2. Run a SPARQL query counting distinct P166 (award received) statements
     on that entity.
  3. If the name can't be resolved, or has no P166 statements, awards = 0.

Unresolved artists are saved to data/missing_awards.txt.

Run from backend/ directory:
    python scripts/add_awards_to_artist_new.py
"""

import csv
import time
from pathlib import Path

import requests

ARTIST_NEW_PATH = Path(__file__).resolve().parent.parent / "data" / "artist_new.csv"
MISSING_PATH    = Path(__file__).resolve().parent.parent / "data" / "missing_awards.txt"

SEARCH_URL = "https://www.wikidata.org/w/api.php"
SPARQL_URL = "https://query.wikidata.org/sparql"
HEADERS = {"User-Agent": "ArtistDataResearch/1.0 (educational data aggregation script)"}

MUSIC_KEYWORDS = (
    "singer", "band", "musician", "rapper", "group", "duo", "songwriter",
    "rock", "pop", "hip hop", "r&b", "dj", "composer", "girl group",
    "boy band", "musical", "recording artist", "vocalist",
)


def get_with_retry(url: str, params: dict, max_retries: int = 5):
    delay = 2
    for attempt in range(max_retries):
        resp = requests.get(url, params=params, headers=HEADERS, timeout=30)
        if resp.status_code == 429:
            wait = int(resp.headers.get("Retry-After", delay))
            print(f"    rate limited, waiting {wait}s...")
            time.sleep(wait)
            delay *= 2
            continue
        resp.raise_for_status()
        return resp
    resp.raise_for_status()
    return resp


def search_candidates(name: str) -> list[dict]:
    resp = get_with_retry(SEARCH_URL, {
        "action": "wbsearchentities",
        "search": name,
        "language": "en",
        "format": "json",
        "type": "item",
        "limit": 5,
    })
    return resp.json().get("search", [])


def pick_entity(candidates: list[dict]) -> str | None:
    if not candidates:
        return None
    for c in candidates:
        desc = (c.get("description") or "").lower()
        if any(kw in desc for kw in MUSIC_KEYWORDS):
            return c["id"]
    return candidates[0]["id"]


def award_count(qid: str) -> int:
    query = f"SELECT (COUNT(DISTINCT ?award) AS ?awardCount) WHERE {{ wd:{qid} wdt:P166 ?award. }}"
    resp = get_with_retry(SPARQL_URL, {"query": query, "format": "json"})
    bindings = resp.json()["results"]["bindings"]
    return int(bindings[0]["awardCount"]["value"]) if bindings else 0


def main():
    with open(ARTIST_NEW_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = list(reader.fieldnames)
        rows = list(reader)

    if "awards" not in fieldnames:
        fieldnames.append("awards")

    unresolved: list[str] = []

    for row in rows:
        name = row["Artist Name"].strip()
        try:
            candidates = search_candidates(name)
            qid = pick_entity(candidates)
            count = award_count(qid) if qid else 0
        except requests.RequestException as e:
            print(f"  {name}: request failed ({e}), setting 0")
            count = 0
            qid = None

        if qid is None:
            unresolved.append(name)

        row["awards"] = count
        print(f"  {name}: {count}")
        time.sleep(1)

    with open(ARTIST_NEW_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    MISSING_PATH.write_text(
        "Artists that could not be resolved to a Wikidata entity (awards set to 0)\n"
        "Last checked: 2026-07-12\n\n"
        + "\n".join(unresolved),
        encoding="utf-8",
    )

    print(f"\nDone. Added 'awards' column for {len(rows)} artists.")
    print(f"Unresolved: {len(unresolved)} (saved to {MISSING_PATH.name})")


if __name__ == "__main__":
    main()
