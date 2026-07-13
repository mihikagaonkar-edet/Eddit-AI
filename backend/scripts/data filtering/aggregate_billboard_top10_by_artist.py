"""
Read data/hot100.csv (weekly Billboard Hot 100 chart history), keep every
row where Rank is between 1 and 10, and aggregate by INDIVIDUAL artist --
splitting collaboration credits (e.g. "Drake Featuring Rihanna", "Cardi B,
Bad Bunny & J Balvin") so each artist is credited separately. Counts how
many distinct songs each artist had in the top 10. Saves result to
data/billboardtop10_artists.csv with "Artist Name" and "Billboard top 10"
columns.

Splitting rules:
  1. Always split on collaboration keywords: featuring/feat/ft/with/x/or.
  2. Split remaining segments on '/', then on '&', ',', '+' and ' and '.
  3. A curated exception list protects real single-act names that happen to
     contain one of those characters (e.g. "Kool & The Gang", "Tyler, The
     Creator", "Florence + The Machine", "The Sanford/Townsend Band") from
     being incorrectly split into fake artists.
  4. A small manual-override map rewrites a handful of one-off credits that
     don't fit the generic rules (e.g. "Ike & Tina Turner" -> Ike Turner,
     Tina Turner; "Marvin Hamlisch/\"The Sting\"" -> Marvin Hamlisch).

This is a heuristic over 65+ years of messy chart-credit formatting, not a
perfect parser -- reviewed against every distinct multi-artist credit
string in the top-10 subset of the dataset, but rare edge cases may remain.

Run from backend/ directory:
    python scripts/aggregate_billboard_top10_by_artist.py
"""

import csv
import re
from collections import defaultdict
from pathlib import Path

HOT100_PATH = Path(__file__).resolve().parent.parent / "data" / "hot100.csv"
OUTPUT_PATH = Path(__file__).resolve().parent.parent / "data" / "billboardtop10_artists.csv"

FEAT_RE = re.compile(r"\s+(featuring|feat\.?|ft\.?|with|x|or)\s+", re.IGNORECASE)
FEAT_KEYWORDS = {"featuring", "feat", "feat.", "ft", "ft.", "with", "x", "or"}
SLASH_RE = re.compile(r"\s*/\s*")
SUB_SPLIT_RE = re.compile(r"\s*&\s*|\s*,\s*|\s*\+\s*|\s+and\s+", re.IGNORECASE)

# Real single-act names containing '&', ',', '+' or '/' that must NOT be
# split into separate artists (backing bands, duo acts billed as one name,
# punctuation that isn't a separator, etc). Matched case-insensitively as a
# whole segment.
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
    "b-rock & the bizz",
    "billy joe & the checkmates",
    "bob seger & the silver bullet band",
    "booker t. & the mg's",
    "dennis coffey & the detroit guitar band",
    "derek & the dominos",
    "disco tex & the sex-o-lettes",
    "franke & the knockouts",
    "garnet mimms & the enchanters",
    "herb alpert & the tijuana brass",
    "hootie & the blowfish",
    "jay & the americans",
    "leon russell & the shelter people",
    "jr. walker & the all stars",
    "kenny rogers & the first edition",
    "lil jon & the east side boyz",
    "marky mark & the funky bunch",
    "martha & the vandellas",
    "merrilee rush & the turnabouts",
    "paul revere & the raiders",
    "randy & the rainbows",
    "blood, sweat & tears",
    "carl dobkins, jr.",
    "grover washington, jr.",
    "hugo montenegro, his orchestra and chorus",
    "russell thompkins,jr.",
    "tyler, the creator",
    "alive & kicking",
    "cliff nobles & co.",
    "commander cody & his lost planet airmen",
    "cornelius brothers & sister rose",
    "c+c music factory",
    "mike + the mechanics",
    "florence + the machine",
    "the sanford/townsend band",
    "edie brickell & new bohemians",
    "ernie fields & orch.",
    "jorgen ingmann & his guitar",
    "kai winding & orchestra",
    "lisa lisa and cult jam",
    "reg owen & his orchestra",
    "tones and i",
    "jay and the techniques",
}

# One-off credits that don't fit the generic rules: exact raw string
# (case-sensitive, as it appears in the CSV) -> list of individual artists.
MANUAL_SPLITS: dict[str, list[str]] = {
    "Silk Sonic (Bruno Mars & Anderson .Paak)": ["Bruno Mars", "Anderson .Paak"],
    "THE SCOTTS, Travis Scott & Kid Cudi": ["Travis Scott", "Kid Cudi"],
    "Paul & Linda McCartney": ["Paul McCartney", "Linda McCartney"],
    "HUNTR/X: EJAE, Audrey Nuna & REI AMI": ["EJAE", "Audrey Nuna", "REI AMI"],
    "Puff Daddy & The Family (Feat. The Notorious B.I.G. & Mase)":
        ["Puff Daddy", "The Notorious B.I.G.", "Mase"],
    "Saja Boys: Andrew Choi, Neckwav, Danny Chung, Kevin Woo & samUIL Lee":
        ["Andrew Choi", "Neckwav", "Danny Chung", "Kevin Woo", "samUIL Lee"],
    'Marvin Hamlisch/"The Sting"': ["Marvin Hamlisch"],
    "Donny & Marie Osmond": ["Donny Osmond", "Marie Osmond"],
    "Ike & Tina Turner": ["Ike Turner", "Tina Turner"],
    "James & Bobby Purify": ["James Purify", "Bobby Purify"],
    "Seals & Crofts (Featuring Carolyn Willis)": ["Seals", "Crofts", "Carolyn Willis"],
    "Sylvia (R&B)": ["Sylvia"],
}


def split_segment(segment: str) -> list[str]:
    segment = segment.strip()
    key = segment.lower()
    if key in DO_NOT_SPLIT:
        return [segment]

    slash_parts = [p for p in SLASH_RE.split(segment) if p.strip()]
    if len(slash_parts) > 1:
        result: list[str] = []
        for part in slash_parts:
            result.extend(split_segment(part))
        return result

    return [s.strip() for s in SUB_SPLIT_RE.split(segment) if s.strip()]


def split_artists(raw: str) -> list[str]:
    raw = raw.strip()
    if raw in MANUAL_SPLITS:
        return MANUAL_SPLITS[raw]

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
    with open(HOT100_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        songs_by_artist: dict[str, set[str]] = defaultdict(set)
        for row in reader:
            rank = row["Rank"].strip()
            if not rank.isdigit() or not (1 <= int(rank) <= 10):
                continue
            song = row["Song"].strip()
            for artist in split_artists(row["Artist"]):
                songs_by_artist[artist].add(song)

    counts = sorted(
        ((artist, len(songs)) for artist, songs in songs_by_artist.items()),
        key=lambda x: -x[1],
    )

    with open(OUTPUT_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["Artist Name", "Billboard top 10"])
        writer.writerows(counts)

    print(f"Aggregated into {len(counts)} individual artists.")
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
