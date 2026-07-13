"""
Add a 'spotify monthly listeners' column to data/youtube_artists.csv by
scraping the monthly listener count for every artist from
kworb.net/spotify/listeners.html.

Artists not found on that page get 0 for their monthly listeners, and their
names are written to data/missing_spotify_monthly_listeners.txt.

Run from backend/ directory:
    python scripts/add_spotify_listeners_to_youtube_artists.py
"""

import csv
import re
import unicodedata
from pathlib import Path

import requests

CSV_PATH     = Path(__file__).resolve().parent.parent / "data" / "youtube_artists.csv"
MISSING_PATH = Path(__file__).resolve().parent.parent / "data" / "missing_spotify_monthly_listeners.txt"
KWORB_URL    = "https://kworb.net/spotify/listeners.html"


def normalize(s: str) -> str:
    return unicodedata.normalize("NFD", s.lower()).encode("ascii", "ignore").decode()


# CSV name (lowercase) -> exact kworb/Spotify artist name
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
    "juicy j":               "Juicy J",
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
    """Returns {normalized_name: monthly_listeners_int}"""
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
        r'<a href="artist/[^"]+">([^<]+)</a></div></td><td>([\d,]+)</td>',
        resp.text,
    )
    result: dict[str, int] = {}
    for name, count in rows:
        n = int(count.replace(",", ""))
        result[name.lower()] = n
        result[normalize(name)] = n
    return result


def resolve(csv_name: str, table: dict[str, int]) -> int | None:
    key = csv_name.lower().strip()
    key_norm = normalize(csv_name)

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


def main():
    print("Fetching Spotify monthly listener table from kworb.net...")
    table = fetch_listener_table()
    print(f"Loaded {len(table) // 2} artists from kworb.net\n")

    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = list(reader.fieldnames)
        if "spotify monthly listeners" not in fieldnames:
            fieldnames.append("spotify monthly listeners")
        rows = list(reader)

    found = 0
    not_found: list[str] = []

    for row in rows:
        name = row["Artist Name"].strip()
        listeners = resolve(name, table)
        if listeners is not None:
            row["spotify monthly listeners"] = listeners
            found += 1
        else:
            row["spotify monthly listeners"] = 0
            not_found.append(name)

    with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    MISSING_PATH.write_text(
        "Artists with no Spotify monthly listener data (not found on kworb.net/spotify/listeners.html)\n"
        f"Last checked: 2026-07-10\n\n"
        + "\n".join(not_found),
        encoding="utf-8",
    )

    print(f"Done. Found listeners for {found}/{len(rows)} artists.")
    print(f"Not found: {len(not_found)} (saved to {MISSING_PATH.name})")


if __name__ == "__main__":
    main()
