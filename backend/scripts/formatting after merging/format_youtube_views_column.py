"""
Normalize the "Youtube views" column in data/artists.csv.

Some rows already store this as an abbreviated string ("34.1B", "976M");
others store a bare number with no suffix that actually represents views in
millions (e.g. "5069.5" means 5069.5 million views). This script finds every
row missing the M/B suffix and:
  - if the value is >= 1000 (i.e. >= 1 billion views), converts it to
    billions with 1 decimal place, dropping a trailing ".0" (e.g. "6B")
  - otherwise rounds it to a whole number and suffixes "M" (e.g. "482M")

matching the convention already used by the rows in this column that are
already suffixed.

data/artists.csv is rewritten in place.

Run from backend/ directory:
    python scripts/format_youtube_views_column.py
"""

import csv
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

CSV_PATH = Path(__file__).resolve().parent.parent / "data" / "artists.csv"
COLUMN = "Youtube views"


def format_millions(views_millions: float) -> str:
    if views_millions >= 1000:
        b = views_millions / 1000
        s = f"{b:.1f}B"
        if s.endswith(".0B"):
            s = s[:-3] + "B"
        return s
    return f"{round(views_millions)}M"


def main():
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = list(reader.fieldnames)
        rows = list(reader)

    print(f"Loaded {len(rows)} artists from {CSV_PATH.name}\n")

    changed = 0
    for row in rows:
        raw = row.get(COLUMN, "").strip()
        if not raw or raw[-1].upper() in ("M", "B"):
            continue

        try:
            views_millions = float(raw)
        except ValueError:
            print(f"  SKIP: could not parse '{raw}' for {row['Artist Name']}")
            continue

        new_val = format_millions(views_millions)
        print(f"  {row['Artist Name']}: '{raw}' -> '{new_val}'")
        row[COLUMN] = new_val
        changed += 1

    with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nReformatted {changed} value(s) in the '{COLUMN}' column of {CSV_PATH.name}.")


if __name__ == "__main__":
    main()
