"""
Scrape total YouTube views per artist from kworb.net/youtube/archive.html
and update the 'Youtube views' column in artists.csv.

The kworb table reports totals in millions (e.g. 34,070.1 = 34.1B views).
Values are written as "XB" (billions, 1 decimal) or "XM" (millions, no decimal)
to match the existing CSV format.

Artists not found on kworb are saved to data/missing_youtube_views.txt.

Run from backend/ directory:
    python scripts/scrape_youtube_views.py
"""

import csv
import re
import unicodedata
from pathlib import Path

import requests

CSV_PATH    = Path(__file__).resolve().parent.parent / "data" / "artists.csv"
MISSING_PATH = Path(__file__).resolve().parent.parent / "data" / "missing_youtube_views.txt"
KWORB_URL   = "https://kworb.net/youtube/archive.html"


def normalize(s: str) -> str:
    return unicodedata.normalize("NFD", s.lower()).encode("ascii", "ignore").decode()


# CSV name (lowercase) → exact kworb artist name
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


def fetch_view_table() -> dict[str, float]:
    """Returns {normalized_name: total_views_in_millions}"""
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
    result: dict[str, float] = {}
    for name, total in rows:
        val = float(total.replace(",", ""))
        result[name.lower()] = val
        result[normalize(name)] = val
    return result


def resolve(csv_name: str, table: dict[str, float]) -> float | None:
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

    return None


def fmt(views_millions: float) -> str:
    """Convert millions float to 'XB' or 'XM' string."""
    if views_millions >= 1000:
        b = views_millions / 1000
        # Round to 1 decimal, drop .0
        s = f"{b:.1f}B"
        if s.endswith(".0B"):
            s = s[:-3] + "B"
        return s
    else:
        m = round(views_millions)
        return f"{m}M"


def main():
    print("Fetching YouTube view table from kworb.net...")
    table = fetch_view_table()
    print(f"Loaded {len(table)//2} artists from kworb.net\n")

    rows: list[dict] = []
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        rows = list(reader)

    updated = 0
    not_found: list[str] = []

    for row in rows:
        name = row["Artist Name"].strip()
        views = resolve(name, table)
        if views is not None:
            old = row["Youtube views"]
            row["Youtube views"] = fmt(views)
            updated += 1
            print(f"  {name}: {old} -> {fmt(views)}")
        else:
            print(f"  {name}: NOT FOUND on kworb.net")
            not_found.append(name)

    with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    MISSING_PATH.write_text(
        "Artists with missing YouTube views (not in kworb.net archive)\n"
        f"Last checked: 2026-07-06\n\n"
        + "\n".join(not_found),
        encoding="utf-8",
    )

    print(f"\nDone. Updated {updated}/{len(rows)} artists.")
    if not_found:
        print(f"Not found ({len(not_found)}): {', '.join(not_found)}")
        print(f"Saved to {MISSING_PATH.name}")


if __name__ == "__main__":
    main()
