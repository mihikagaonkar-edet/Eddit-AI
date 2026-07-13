"""
For every artist in data/missing_spotify_monthly_listeners.txt, check
kworb.net/spotify/listeners2.html through listeners11.html (ranks 2501-27500)
for a monthly listener count.

If found:
  - fill in their 'spotify monthly listeners' value in data/youtube_artists.csv
  - remove them from data/missing_spotify_monthly_listeners.txt

If still not found after checking all pages, they stay in the missing file
untouched.

Run from backend/ directory:
    python scripts/check_more_spotify_pages.py
"""

import csv
import re
import sys
import time
import unicodedata
from pathlib import Path

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

CSV_PATH     = Path(__file__).resolve().parent.parent / "data" / "youtube_artists.csv"
MISSING_PATH = Path(__file__).resolve().parent.parent / "data" / "missing_spotify_monthly_listeners.txt"
PAGE_URL     = "https://kworb.net/spotify/listeners{}.html"
PAGES        = range(2, 12)  # listeners2.html .. listeners11.html


def normalize(s: str) -> str:
    return unicodedata.normalize("NFD", s.lower()).encode("ascii", "ignore").decode()


ALIASES: dict[str, str] = {
    "beyonce":              "Beyoncé",
    "dr dre":               "Dr. Dre",
    "jay z":                "JAY-Z",
    "bone thugs":           "Bone Thugs-N-Harmony",
    "notorious big":        "The Notorious B.I.G.",
    "a boogie":             "A Boogie Wit da Hoodie",
    "salt n pepa":          "Salt-N-Pepa",
    "nore":                 "N.O.R.E.",
    "the game":             "The Game",
    "run dmc":              "Run-DMC",
    "ti":                   "T.I.",
    "mc hammer":            "Hammer",
    "2pac":                 "2Pac",
    "young ma":             "Young M.A",
    "yo gotti":             "Yo Gotti",
    "juicy j":              "Juicy J",
    "nipsey hussle":        "Nipsey Hussle",
    "plies":                "Plies",
    "cypress hill":         "Cypress Hill",
    "juvenile":             "Juvenile",
    "method man":           "Method Man",
    "kris kross":           "Kris Kross",
    "pusha t":              "Pusha T",
    "da brat":              "Da Brat",
    "est gee":              "EST Gee",
    "foxy brown":           "Foxy Brown",
    "blueface":             "Blueface",
    "dej loaf":             "Dej Loaf",
    "boosie badazz":        "Boosie Badazz",
    "jj fad":               "J.J. Fad",
    "joe budden":           "Joe Budden",
    "troy ave":             "Troy Ave",
    "maino":                "Maino",
    "the sequence":         "The Sequence",
    "queen latifah":        "Queen Latifah",
    "mc lyte":              "MC Lyte",
    "fabolous":             "Fabolous",
}


def make_session() -> requests.Session:
    session = requests.Session()
    session.headers.update({
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        )
    })
    retry = Retry(total=5, backoff_factor=2, status_forcelist=[429, 500, 502, 503, 504])
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session


def fetch_page_table(session: requests.Session, page_num: int) -> dict[str, int]:
    """Returns {normalized_name: monthly_listeners_int} for one listenersN.html page."""
    resp = session.get(PAGE_URL.format(page_num), timeout=30)
    resp.raise_for_status()
    resp.encoding = "utf-8"

    rows = re.findall(
        r'<a href="artist/[^"]+">([^<]+)</a></div></td><td>([\d,]+)</td>',
        resp.text,
    )
    result: dict[str, int] = {}
    for name, count in rows:
        n = int(count.replace(",", ""))
        result[name.lower()] = n
        result[normalize(name)] = n
    return result


def resolve(name: str, table: dict[str, int]) -> int | None:
    key = name.lower().strip()
    key_norm = normalize(name)

    if key in table:
        return table[key]
    if key_norm in table:
        return table[key_norm]

    alias = ALIASES.get(key)
    if alias:
        ak, ak_norm = alias.lower(), normalize(alias)
        if ak in table:
            return table[ak]
        if ak_norm in table:
            return table[ak_norm]

    if key.startswith("the "):
        stripped = key[4:]
        if stripped in table:
            return table[stripped]
        stripped_norm = normalize(stripped)
        if stripped_norm in table:
            return table[stripped_norm]

    return None


def load_missing_names() -> list[str]:
    lines = MISSING_PATH.read_text(encoding="utf-8").splitlines()
    return [line.strip() for line in lines[3:] if line.strip()]


def main():
    missing_names = load_missing_names()
    print(f"Loaded {len(missing_names)} artists from {MISSING_PATH.name}\n")

    session = make_session()
    combined_table: dict[str, int] = {}
    for page_num in PAGES:
        print(f"Fetching listeners{page_num}.html...", flush=True)
        page_table = fetch_page_table(session, page_num)
        combined_table.update(page_table)
        time.sleep(1)

    print(f"\nCombined table covers pages 2-11.\n")

    resolved: dict[str, int] = {}
    still_missing: list[str] = []
    for name in missing_names:
        listeners = resolve(name, combined_table)
        if listeners is not None:
            resolved[name] = listeners
            print(f"  FOUND: {name} -> {listeners:,}")
        else:
            still_missing.append(name)

    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = list(reader.fieldnames)
        rows = list(reader)

    updated = 0
    for row in rows:
        name = row["Artist Name"].strip()
        if name in resolved:
            row["spotify monthly listeners"] = resolved[name]
            updated += 1

    with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    MISSING_PATH.write_text(
        "Artists with no Spotify monthly listener data (not found on kworb.net/spotify/listeners.html pages 1-11)\n"
        f"Last checked: 2026-07-10\n\n"
        + "\n".join(still_missing),
        encoding="utf-8",
    )

    print(f"\nDone. Found {len(resolved)}/{len(missing_names)} artists on pages 2-11.")
    print(f"Updated {updated} rows in {CSV_PATH.name}.")
    print(f"Still missing: {len(still_missing)} (saved to {MISSING_PATH.name})")


if __name__ == "__main__":
    main()
