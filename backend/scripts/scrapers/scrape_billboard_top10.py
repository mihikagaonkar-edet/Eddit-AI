"""
Scrape Billboard Hot 100 top-ten singles from Wikipedia for the past 20 years
(2005-2024) and update the 'Billboard top 10' column in artists.csv with the
count of distinct songs each artist had in the top ten across that period.

Each row in the yearly tables = one song that entered the top ten.
Featured artists are credited too (e.g. "Drake featuring Rihanna" → both get +1).

Missing artists saved to data/missing_billboard_top10.txt.

Run from backend/ directory:
    python scripts/scrape_billboard_top10.py
"""

import csv
import re
import time
import unicodedata
from collections import defaultdict
from pathlib import Path

import requests
from bs4 import BeautifulSoup

CSV_PATH     = Path(__file__).resolve().parent.parent / "data" / "artists.csv"
MISSING_PATH = Path(__file__).resolve().parent.parent / "data" / "missing_billboard_top10.txt"

YEARS = list(range(2005, 2025))


def normalize(s: str) -> str:
    return unicodedata.normalize("NFD", s.lower()).encode("ascii", "ignore").decode()


FEAT_RE = re.compile(r'\s+(featuring|feat\.?|ft\.?|with)\s+', re.IGNORECASE)

def split_artists(raw: str) -> list[str]:
    """Split 'Artist A featuring Artist B and Artist C' into individual names."""
    parts = FEAT_RE.split(raw)
    keywords = {"featuring", "feat", "feat.", "ft", "ft.", "with"}
    parts = [p.strip() for p in parts if p.strip().lower() not in keywords]
    result = []
    for part in parts:
        for sub in re.split(r'\s*[&/]\s*|\s+and\s+', part, flags=re.IGNORECASE):
            s = sub.strip()
            # Remove annotation markers like [A], [B], (↑), (#1)
            s = re.sub(r'\s*[\[\(][^\]\)]*[\]\)]', '', s).strip()
            if s:
                result.append(s)
    return result


ALIASES: dict[str, list[str]] = {
    "beyonce":              ["Beyoncé", "Beyonce"],
    "jay z":                ["Jay-Z", "JAY-Z", "Jay Z"],
    "notorious big":        ["The Notorious B.I.G.", "Notorious B.I.G."],
    "ti":                   ["T.I."],
    "2pac":                 ["2Pac", "Tupac Shakur"],
    "dr dre":               ["Dr. Dre"],
    "dj khaled":            ["DJ Khaled"],
    "nle choppa":           ["NLE Choppa"],
    "6ix9ine":              ["6ix9ine", "Tekashi 6ix9ine"],
    "megan thee stallion":  ["Megan Thee Stallion"],
    "a boogie":             ["A Boogie wit da Hoodie"],
    "wizkid":               ["WizKid"],
    "lil durk":             ["Lil Durk"],
    "rod wave":             ["Rod Wave"],
    "polo g":               ["Polo G"],
    "roddy ricch":          ["Roddy Ricch"],
    "glorilla":             ["GloRilla"],
    "sexyy red":            ["Sexyy Red"],
    "nore":                 ["N.O.R.E."],
    "run dmc":              ["Run-DMC"],
    "salt n pepa":          ["Salt-N-Pepa"],
    "young ma":             ["Young M.A"],
    "bone thugs":           ["Bone Thugs-N-Harmony"],
    "kanye west":           ["Kanye West", "Ye"],
    "lil wayne":            ["Lil Wayne"],
    "cardi b":              ["Cardi B"],
    "doja cat":             ["Doja Cat"],
    "ice spice":            ["Ice Spice"],
    "latto":                ["Latto"],
    "gunna":                ["Gunna"],
    "kodak black":          ["Kodak Black"],
    "offset":               ["Offset"],
    "quavo":                ["Quavo"],
}


def build_lookup(csv_artists: list[str]) -> dict[str, str]:
    lookup: dict[str, str] = {}
    for name in csv_artists:
        key = name.lower().strip()
        lookup[key] = key
        lookup[normalize(key)] = key
        for alias in ALIASES.get(key, []):
            lookup[alias.lower()] = key
            lookup[normalize(alias)] = key
    return lookup


def fetch_year(session: requests.Session, year: int) -> list[str]:
    """
    Returns list of raw artist strings, one per top-ten entry (song).
    Each string may be compound e.g. 'Drake featuring Lil Wayne'.
    """
    url = f"https://en.wikipedia.org/wiki/List_of_Billboard_Hot_100_top-ten_singles_in_{year}"
    resp = session.get(url, timeout=20)
    resp.raise_for_status()
    resp.encoding = "utf-8"
    soup = BeautifulSoup(resp.text, "html.parser")

    artist_entries: list[str] = []

    for table in soup.find_all("table", class_="wikitable"):
        headers = [th.get_text(strip=True) for th in table.find_all("th")]
        # Only process tables with an Artist(s) column
        if not any("artist" in h.lower() for h in headers):
            continue

        # Find the row that actually has column headers (may not be the first tr)
        artist_col = None
        col_header_row_idx = 0
        for ri, tr in enumerate(table.find_all("tr")):
            cells = tr.find_all(["th", "td"])
            for i, cell in enumerate(cells):
                if "artist" in cell.get_text(strip=True).lower():
                    artist_col = i
                    col_header_row_idx = ri
                    break
            if artist_col is not None:
                break
        if artist_col is None:
            continue

        # Count expected columns from the header row (for rowspan detection)
        all_rows = table.find_all("tr")
        header_cells_count = len(all_rows[col_header_row_idx].find_all(["th", "td"]))

        current_artist: str = ""
        remaining_span: int = 0

        for row in all_rows[col_header_row_idx + 1:]:
            cells = row.find_all(["td", "th"])
            # Skip section-header rows (colspan, e.g. "Singles from 2023")
            if len(cells) == 1 or (len(cells) > 0 and cells[0].get("colspan")):
                continue

            # Detect continuation row: fewer cells than expected means the
            # artist cell was consumed by a rowspan from the previous row
            is_continuation = len(cells) < header_cells_count - 1

            if is_continuation and remaining_span > 0:
                remaining_span -= 1
                if current_artist:
                    artist_entries.append(current_artist)
                continue

            if len(cells) <= artist_col:
                continue

            artist_cell = cells[artist_col]
            if artist_cell.get("colspan"):
                continue  # section sub-header

            raw = artist_cell.get_text(separator=" ", strip=True)
            raw = re.sub(r'\[\w+\]', '', raw).strip()

            # If the cell contains just a number 1-10, it's a chart peak position,
            # not an artist — the artist cell was consumed by a rowspan above
            if re.match(r'^\d{1,2}$', raw) and int(raw) <= 10:
                if current_artist:
                    artist_entries.append(current_artist)
                continue

            span = int(artist_cell.get("rowspan", 1))
            current_artist = raw
            remaining_span = span - 1  # how many more continuation rows follow

            if raw:
                artist_entries.append(raw)

    return artist_entries


def main():
    rows: list[dict] = []
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        rows = list(reader)

    csv_artists = [r["Artist Name"].strip() for r in rows]
    lookup = build_lookup(csv_artists)

    # Count distinct top-10 songs per CSV artist
    counts: dict[str, int] = defaultdict(int)
    unmatched: dict[str, int] = defaultdict(int)

    session = requests.Session()
    session.headers.update({
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        )
    })

    for year in YEARS:
        print(f"  Fetching {year}...", end=" ", flush=True)
        entries = fetch_year(session, year)
        year_matched = 0
        for raw in entries:
            matched_keys = set()
            for part in split_artists(raw):
                k = part.lower().strip()
                csv_key = lookup.get(k) or lookup.get(normalize(part))
                if csv_key and csv_key not in matched_keys:
                    counts[csv_key] += 1
                    matched_keys.add(csv_key)
                    year_matched += 1
            if not matched_keys:
                # Accumulate unmatched for the missing file
                # Use the primary artist (first part before "featuring")
                primary = split_artists(raw)[0] if split_artists(raw) else raw
                unmatched[primary] += 1
        print(f"{len(entries)} songs, {year_matched} matched")
        time.sleep(0.8)

    # Update CSV
    updated = 0
    for row in rows:
        name = row["Artist Name"].strip().lower()
        if name in counts:
            old = row["Billboard top 10"]
            row["Billboard top 10"] = str(counts[name])
            updated += 1
            print(f"  {row['Artist Name']}: {old} -> {counts[name]}")

    with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    # Save unmatched
    sorted_unmatched = sorted(unmatched.items(), key=lambda x: -x[1])
    lines = [
        "Billboard Hot 100 top-ten artists not matched to artists.csv",
        "Last checked: 2026-07-06 (years 2005-2024)",
        "",
    ]
    for name, count in sorted_unmatched:
        lines.append(f"{count:3d} song(s): {name}")
    MISSING_PATH.write_text("\n".join(lines), encoding="utf-8")

    print(f"\nDone. Updated {updated} artists.")
    print(f"\nTop unmatched (had top-10 songs but not in our CSV):")
    for name, count in sorted_unmatched[:15]:
        print(f"  {count:3d}: {name}")


if __name__ == "__main__":
    main()
