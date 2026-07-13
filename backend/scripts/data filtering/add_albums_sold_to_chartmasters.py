"""
Add an "Albums sold" column to data/chartmasters_album_sales.csv, computed
as Studio Albums (EAS) + Other LPs (EAS).

Run from backend/ directory:
    python scripts/add_albums_sold_to_chartmasters.py
"""

import csv
from pathlib import Path

CSV_PATH = Path(__file__).resolve().parent.parent / "data" / "chartmasters_album_sales.csv"


def main():
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = list(reader.fieldnames)
        rows = list(reader)

    insert_at = fieldnames.index("Other LPs (EAS)") + 1
    fieldnames.insert(insert_at, "Albums sold")

    for row in rows:
        studio = int(row["Studio Albums (EAS)"])
        other_lps = int(row["Other LPs (EAS)"])
        row["Albums sold"] = studio + other_lps

    with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Added 'Albums sold' column to {len(rows)} rows in {CSV_PATH}")


if __name__ == "__main__":
    main()
