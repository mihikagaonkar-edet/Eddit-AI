"""
Add "Singles sold" and "Albums sold" columns to data/artist_new.csv by
joining with data/chartmasters_album_sales.csv on artist name
(case-insensitive). Artists in artist_new.csv with no chartmasters match are
dropped.

Does not modify data/chartmasters_album_sales.csv.

Run from backend/ directory:
    python scripts/merge_chartmasters_into_artist_new.py
"""

import csv
from pathlib import Path

DATA_DIR       = Path(__file__).resolve().parent.parent / "data"
ARTIST_NEW_PATH = DATA_DIR / "artist_new.csv"
CHARTMASTERS_PATH = DATA_DIR / "chartmasters_album_sales.csv"


def load(path: Path) -> list[dict]:
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def main():
    artist_rows = load(ARTIST_NEW_PATH)
    chart_rows = load(CHARTMASTERS_PATH)

    chart_by_key = {r["Artist Name"].strip().lower(): r for r in chart_rows}

    merged_rows = []
    for row in artist_rows:
        key = row["Artist Name"].strip().lower()
        chart = chart_by_key.get(key)
        if chart is None:
            continue
        row["Singles sold"] = chart["Singles sold"].strip()
        row["Albums sold"] = chart["Albums sold"].strip()
        merged_rows.append(row)

    with open(ARTIST_NEW_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(merged_rows[0].keys()))
        writer.writeheader()
        writer.writerows(merged_rows)

    print(f"Matched {len(merged_rows)}/{len(artist_rows)} artists to chartmasters_album_sales.csv")
    print(f"Dropped {len(artist_rows) - len(merged_rows)} unmatched artists")
    print(f"Wrote {ARTIST_NEW_PATH}")


if __name__ == "__main__":
    main()
