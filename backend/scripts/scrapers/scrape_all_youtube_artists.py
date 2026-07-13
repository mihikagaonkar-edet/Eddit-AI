"""
Scrape ALL artists listed on kworb.net/youtube/archive.html and build a new,
standalone artist database CSV (separate from data/artists.csv).

For each artist on the kworb page, records their total YouTube views in
millions (kworb's "Total" column is already denominated in millions, e.g.
41,343.8 == 41,343.8M == ~41.3B views).

Artists present in data/artists.csv but NOT found on the kworb page are
appended at the end, with their existing "Youtube views" value (e.g. "34.1B",
"72.1M") converted to a plain millions figure so the whole file uses
consistent units.

This script only reads data/artists.csv — it never modifies it. Output is
written to a brand new file: data/youtube_artists.csv

Run from backend/ directory:
    python scripts/scrape_all_youtube_artists.py
"""

import csv
import re
import unicodedata
from pathlib import Path

import requests

ARTISTS_CSV_PATH = Path(__file__).resolve().parent.parent / "data" / "artists.csv"
OUTPUT_CSV_PATH  = Path(__file__).resolve().parent.parent / "data" / "youtube_artists.csv"
KWORB_URL        = "https://kworb.net/youtube/archive.html"


def normalize(s: str) -> str:
    return unicodedata.normalize("NFD", s.lower()).encode("ascii", "ignore").decode()


# CSV name (lowercase) -> exact kworb artist name, same aliases used by
# scripts/scrape_youtube_views.py so matching stays consistent.
ALIASES: dict[str, str] = {
    "beyonce":          "Beyoncé",
    "jay z":            "Jay-Z",
    "notorious big":    "The Notorious B.I.G.",
    "bone thugs":       "Bone Thugs-N-Harmony",
    "a boogie":         "A Boogie wit da Hoodie",
    "salt n pepa":      "Salt-N-Pepa",
    "nore":             "N.O.R.E.",
    "the game":         "The Game",
    "run dmc":          "Run-DMC",
    "ti":               "T.I.",
    "mc hammer":        "Hammer",
    "2pac":             "2Pac",
    "young ma":         "Young M.A",
    "dr dre":           "Dr. Dre",
    "dj khaled":        "DJ Khaled",
    "wu-tang clan":     "Wu-Tang Clan",
    "6ix9ine":          "6ix9ine",
    "nle choppa":       "NLE Choppa",
    "lil durk":         "Lil Durk",
    "rod wave":         "Rod Wave",
    "polo g":           "Polo G",
    "roddy ricch":      "Roddy Ricch",
    "megan thee stallion": "Megan Thee Stallion",
}


def fetch_kworb_artists() -> list[tuple[str, float]]:
    """Returns [(artist_name, total_views_millions), ...] for every artist on the page."""
    session = requests.Session()
    session.headers.update({
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        )
    })
    resp = session.get(KWORB_URL, timeout=20)
    resp.raise_for_status()
    resp.encoding = "utf-8"

    rows = re.findall(
        r'<a href="artist/[^"]+">([^<]+)</a></div></td><td>([\d,\.]+)</td>',
        resp.text,
    )
    return [(name, float(total.replace(",", ""))) for name, total in rows]


def parse_existing_views(value: str) -> float | None:
    """Convert an artists.csv 'Youtube views' value like '34.1B' or '72.1M' to millions."""
    value = value.strip()
    match = re.match(r"^([\d.]+)\s*([BM])$", value, re.IGNORECASE)
    if not match:
        return None
    number, unit = match.groups()
    number = float(number)
    return number * 1000 if unit.upper() == "B" else number


def load_artists_csv_names() -> list[tuple[str, str]]:
    """Returns [(artist_name, youtube_views_raw), ...] from data/artists.csv."""
    with open(ARTISTS_CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return [(row["Artist Name"].strip(), row["Youtube views"]) for row in reader]


def main():
    print("Fetching full artist list from kworb.net...")
    kworb_rows = fetch_kworb_artists()
    print(f"Found {len(kworb_rows)} artists on kworb.net\n")

    kworb_lookup: set[str] = set()
    for name, _ in kworb_rows:
        kworb_lookup.add(name.lower())
        kworb_lookup.add(normalize(name))

    def is_on_kworb(csv_name: str) -> bool:
        key = csv_name.lower().strip()
        if key in kworb_lookup or normalize(csv_name) in kworb_lookup:
            return True
        alias = ALIASES.get(key)
        if alias and (alias.lower() in kworb_lookup or normalize(alias) in kworb_lookup):
            return True
        return False

    print("Loading data/artists.csv to find artists missing from kworb.net...")
    artists_csv_rows = load_artists_csv_names()

    extra_rows: list[tuple[str, float]] = []
    for name, raw_views in artists_csv_rows:
        if is_on_kworb(name):
            continue
        views = parse_existing_views(raw_views)
        extra_rows.append((name, views if views is not None else ""))

    print(f"Found {len(extra_rows)} artists in artists.csv not present on kworb.net\n")

    with open(OUTPUT_CSV_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["Artist Name", "youtube views"])
        for name, views in kworb_rows:
            writer.writerow([name, views])
        for name, views in extra_rows:
            writer.writerow([name, views])

    total = len(kworb_rows) + len(extra_rows)
    print(f"Wrote {total} artists to {OUTPUT_CSV_PATH}")
    print(f"  - {len(kworb_rows)} from kworb.net")
    print(f"  - {len(extra_rows)} appended from artists.csv (not on kworb)")


if __name__ == "__main__":
    main()
