"""
Scrape Billboard Hot 100 #1 singles from Wikipedia for the past 20 years
(2005-2024) and update the 'Billboard #1' column in artists.csv with the
total number of weeks each artist spent at #1 across those years.

Each Wikipedia year page contains a summary table "Weeks at No. 1" — we use
that directly instead of parsing the full per-week table, so rowspan handling
is not needed.

Artists not matched to any CSV row are saved to data/missing_billboard_ones.txt.

Run from backend/ directory:
    python scripts/scrape_billboard_number_ones.py
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
MISSING_PATH = Path(__file__).resolve().parent.parent / "data" / "missing_billboard_ones.txt"

YEARS = list(range(2005, 2025))  # 20 years: 2005–2024 inclusive


def normalize(s: str) -> str:
    return unicodedata.normalize("NFD", s.lower()).encode("ascii", "ignore").decode()


FEAT_RE = re.compile(r'\s+(featuring|feat\.?|ft\.?|with|x)\s+', re.IGNORECASE)

def split_artists(raw: str) -> list[str]:
    """Split 'Artist A featuring Artist B & Artist C' into individual names."""
    parts = FEAT_RE.split(raw)
    keywords = {"featuring", "feat", "feat.", "ft", "ft.", "with", "x"}
    parts = [p.strip() for p in parts if p.strip().lower() not in keywords]
    result = []
    for part in parts:
        for sub in re.split(r'\s*[&/]\s*|\s+and\s+', part, flags=re.IGNORECASE):
            s = sub.strip()
            if s:
                result.append(s)
    return result


# CSV name (lowercase) → list of Wikipedia name variants
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
}


def build_lookup(csv_artists: list[str]) -> dict[str, str]:
    """normalized_variant → csv_name_lowercase"""
    lookup: dict[str, str] = {}
    for name in csv_artists:
        key = name.lower().strip()
        lookup[key] = key
        lookup[normalize(key)] = key
        for alias in ALIASES.get(key, []):
            lookup[alias.lower()] = key
            lookup[normalize(alias)] = key
    return lookup


def fetch_year_summary(session: requests.Session, year: int) -> list[tuple[str, int]]:
    """
    Returns list of (artist_name, weeks_at_number_one) from the year's
    summary table on Wikipedia.
    """
    url = f"https://en.wikipedia.org/wiki/List_of_Billboard_Hot_100_number_ones_of_{year}"
    resp = session.get(url, timeout=20)
    resp.raise_for_status()
    resp.encoding = "utf-8"
    soup = BeautifulSoup(resp.text, "html.parser")

    # Find the summary table that has "Weeks at No. 1" column
    for table in soup.find_all("table", class_="wikitable"):
        headers = [th.get_text(strip=True) for th in table.find_all("th")]
        if not any("Weeks" in h for h in headers):
            continue

        # Detect column layout: 3-col (Position|Artist|Weeks) or 2-col (Artist|Weeks)
        has_position = any("Position" in h for h in headers)
        artist_idx = 1 if has_position else 0
        weeks_idx  = 2 if has_position else 1

        results = []
        for row in table.find_all("tr")[1:]:  # skip header
            cells = row.find_all(["td", "th"])
            if len(cells) < 2:
                continue
            artist_cell = cells[artist_idx]
            weeks_cell  = cells[weeks_idx]

            artist_name = artist_cell.get_text(separator=" ", strip=True)
            artist_name = re.sub(r'\[\d+\]', '', artist_name).strip()

            try:
                weeks = int(re.search(r'\d+', weeks_cell.get_text(strip=True)).group())
            except (AttributeError, ValueError):
                continue

            if artist_name:
                results.append((artist_name, weeks))
        return results

    return []


def main():
    rows: list[dict] = []
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        rows = list(reader)

    csv_artists = [r["Artist Name"].strip() for r in rows]
    lookup = build_lookup(csv_artists)

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
        entries = fetch_year_summary(session, year)
        year_matched = 0
        for artist_name, weeks in entries:
            # Try matching each credited artist (handle features)
            matched_any = False
            for part in split_artists(artist_name):
                k = part.lower().strip()
                csv_key = lookup.get(k) or lookup.get(normalize(part))
                if csv_key:
                    counts[csv_key] += weeks
                    year_matched += weeks
                    matched_any = True
                    break  # count primary match only per entry
            if not matched_any:
                unmatched[artist_name] += weeks
        print(f"{len(entries)} artists, {year_matched} matched weeks")
        time.sleep(0.8)

    # Update CSV rows
    updated = 0
    for row in rows:
        name = row["Artist Name"].strip().lower()
        if name in counts:
            old = row["Billboard #1"]
            row["Billboard #1"] = str(counts[name])
            updated += 1
            print(f"  {row['Artist Name']}: {old} -> {counts[name]}")

    with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    # Save unmatched
    sorted_unmatched = sorted(unmatched.items(), key=lambda x: -x[1])
    lines = [
        "Wikipedia Billboard #1 artists not matched to artists.csv",
        "Last checked: 2026-07-06 (years 2005-2024)",
        "",
    ]
    for name, weeks in sorted_unmatched:
        lines.append(f"{weeks:3d} week(s): {name}")
    MISSING_PATH.write_text("\n".join(lines), encoding="utf-8")

    print(f"\nDone. Updated {updated} artists across 2005-2024.")
    print(f"\nTop unmatched (had #1s but not in our CSV):")
    for name, weeks in sorted_unmatched[:15]:
        print(f"  {weeks:3d}w: {name}")


if __name__ == "__main__":
    main()
