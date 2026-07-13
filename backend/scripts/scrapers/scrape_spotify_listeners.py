"""
Scrape Spotify monthly listeners from kworb.net and update 'Spotify listeners'
column in artists.csv (stored as e.g. "62.3M").

kworb.net publishes a ranked table of all artists by monthly listeners — no
login or API key needed. One page fetch covers all artists.

Run from any directory:
    python scripts/scrape_spotify_listeners.py
"""

import csv
import re
import unicodedata
import requests
from pathlib import Path

CSV_PATH = Path(__file__).resolve().parent.parent / "data" / "artists.csv"
KWORB_URL = "https://kworb.net/spotify/listeners.html"

# Strip accents for normalized comparison
def normalize(s: str) -> str:
    return unicodedata.normalize("NFD", s.lower()).encode("ascii", "ignore").decode()

# Explicit aliases: CSV name → exact Spotify/kworb name
ALIASES = {
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


def fetch_listener_table() -> dict[str, int]:
    """Returns {artist_name_lower: monthly_listeners_int}"""
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
    resp.encoding = "utf-8"  # ensure é and other accented chars decode correctly

    # Table rows: <a href="artist/...">Name</a></div></td><td>123,456,789</td>
    rows = re.findall(
        r'<a href="artist/[^"]+">([^<]+)</a></div></td><td>([\d,]+)</td>',
        resp.text,
    )
    # Build table keyed by both original-lower and accent-normalized
    result = {}
    for name, count in rows:
        n = int(count.replace(",", ""))
        result[name.lower()] = n
        result[normalize(name)] = n
    return result


def resolve(csv_name: str, table: dict[str, int]) -> int | None:
    key = csv_name.lower().strip()
    key_norm = normalize(csv_name)

    # 1. Direct match (original or accent-normalized)
    if key in table:
        return table[key]
    if key_norm in table:
        return table[key_norm]

    # 2. Explicit alias
    alias = ALIASES.get(key)
    if alias:
        ak = alias.lower()
        ak_norm = normalize(alias)
        if ak in table:
            return table[ak]
        if ak_norm in table:
            return table[ak_norm]

    return None


def fmt(n: int) -> str:
    return f"{round(n / 1_000_000, 1)}M"


def main():
    print("Fetching listener table from kworb.net...")
    table = fetch_listener_table()
    print(f"Loaded {len(table)} artists from kworb.net\n")

    rows = []
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        rows = list(reader)

    updated = 0
    not_found = []

    for row in rows:
        name = row["Artist Name"].strip()
        listeners = resolve(name, table)
        if listeners is not None:
            old = row["Spotify listeners"]
            row["Spotify listeners"] = fmt(listeners)
            updated += 1
            print(f"  {name}: {old} -> {fmt(listeners)}")
        else:
            print(f"  {name}: NOT FOUND on kworb.net")
            not_found.append(name)

    with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nDone. Updated {updated}/{len(rows)} artists.")
    if not_found:
        print(f"Not found ({len(not_found)}): {', '.join(not_found)}")


if __name__ == "__main__":
    main()
