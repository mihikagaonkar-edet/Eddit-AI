"""
Read data/billboard1s.csv (one row per week a song held Billboard Hot 100
rank 1) and aggregate by INDIVIDUAL artist, splitting collaboration credits
(e.g. "Eminem Featuring Rihanna", "Cardi B, Bad Bunny & J Balvin") so each
artist is credited separately. Counts how many distinct songs each artist
had at rank 1. Saves result to data/billboard1s_artists.csv.

Splitting rules:
  1. Always split on collaboration keywords: featuring/feat/ft/with/x.
  2. Split remaining segments on '&', ',' and ' and '.
  3. A curated exception list protects real single-act names that happen to
     contain '&' or ',' (e.g. "Kool & The Gang", "The Mamas & The Papas",
     "Sammy Davis, Jr.") from being incorrectly split into fake artists.
  4. A small manual-override map rewrites a handful of one-off credits that
     don't fit the generic rules (e.g. "Silk Sonic (Bruno Mars & Anderson
     .Paak)" -> Bruno Mars, Anderson .Paak).

This is a heuristic over messy 65+ years of chart credit formatting, not a
perfect parser -- reviewed against every distinct credit string in the
dataset, but edge cases may remain.

Run from backend/ directory:
    python scripts/aggregate_billboard_ones_by_artist.py
"""

import csv
import re
from collections import defaultdict
from pathlib import Path

INPUT_PATH  = Path(__file__).resolve().parent.parent / "data" / "billboard1s.csv"
OUTPUT_PATH = Path(__file__).resolve().parent.parent / "data" / "billboard1s_artists.csv"

FEAT_RE = re.compile(r"\s+(featuring|feat\.?|ft\.?|with|x)\s+", re.IGNORECASE)
FEAT_KEYWORDS = {"featuring", "feat", "feat.", "ft", "ft.", "with", "x"}
SUB_SPLIT_RE = re.compile(r"\s*&\s*|\s*,\s*|\s+and\s+", re.IGNORECASE)

# Real single-act names containing '&' or ',' that must NOT be split into
# separate artists (backing bands, duo acts billed as one name, punctuation
# that isn't a separator, etc). Matched case-insensitively as a whole segment.
DO_NOT_SPLIT = {
    "earth, wind & fire",
    "peter, paul & mary",
    "hamilton, joe frank & reynolds",
    "lipps, inc.",
    "? (question mark) & the mysterians",
    "kool & the gang",
    "the mamas & the papas",
    "captain & tennille",
    "the captain & tennille",
    "rick dees & his cast of idiots",
    "sly & the family stone",
    "maurice williams & the zodiacs",
    "van mccoy & the soul city symphony",
    "walter murphy & the big apple band",
    "wayne fontana & the mindbenders",
    "archie bell & the drells",
    "billy vera & the beaters",
    "bruce hornsby & the range",
    "joan jett & the blackhearts",
    "joey dee & the starliters",
    "huey lewis & the news",
    "the product g&b",
    "sammy davis, jr.",
    "dionne & friends",
}

# One-off credits that don't fit the generic rules: exact raw string
# (case-sensitive, as it appears in the CSV) -> list of individual artists.
MANUAL_SPLITS: dict[str, list[str]] = {
    "Silk Sonic (Bruno Mars & Anderson .Paak)": ["Bruno Mars", "Anderson .Paak"],
    "THE SCOTTS, Travis Scott & Kid Cudi": ["Travis Scott", "Kid Cudi"],
    "Paul & Linda McCartney": ["Paul McCartney", "Linda McCartney"],
    "HUNTR/X: EJAE, Audrey Nuna & REI AMI": ["EJAE", "Audrey Nuna", "REI AMI"],
}


def split_segment(segment: str) -> list[str]:
    key = segment.strip().lower()
    if key in DO_NOT_SPLIT:
        return [segment.strip()]
    return [s.strip() for s in SUB_SPLIT_RE.split(segment) if s.strip()]


def split_artists(raw: str) -> list[str]:
    raw = raw.strip()
    # Some multi-artist credits in the source data are wrapped in a stray
    # pair of literal quote characters (e.g. '"Cardi B, Bad Bunny & J Balvin"')
    # left over from how hot100.csv was generated. Strip them before parsing.
    if len(raw) > 1 and raw[0] == '"' and raw[-1] == '"':
        raw = raw[1:-1].strip()
    if raw in MANUAL_SPLITS:
        return MANUAL_SPLITS[raw]

    parts = FEAT_RE.split(raw)
    parts = [p for p in parts if p.strip().lower() not in FEAT_KEYWORDS]

    artists: list[str] = []
    for part in parts:
        artists.extend(split_segment(part))
    return artists


def main():
    with open(INPUT_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        songs_by_artist: dict[str, set[str]] = defaultdict(set)
        for row in reader:
            song = row["Song"].strip()
            for artist in split_artists(row["Artist"]):
                songs_by_artist[artist].add(song)

    counts = sorted(
        ((artist, len(songs)) for artist, songs in songs_by_artist.items()),
        key=lambda x: -x[1],
    )

    with open(OUTPUT_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["Artist Name", "Billboard #1"])
        writer.writerows(counts)

    print(f"Aggregated into {len(counts)} individual artists.")
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
