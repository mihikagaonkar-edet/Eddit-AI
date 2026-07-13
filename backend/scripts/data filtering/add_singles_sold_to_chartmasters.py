"""
Add a "Singles sold" column to data/chartmasters_album_sales.csv, computed
as Physical Singles (EAS) + Digital & Streamed Singles (EAS).

Run from backend/ directory:
    python scripts/add_singles_sold_to_chartmasters.py
"""

import csv
from pathlib import Path

CSV_PATH = Path(__file__).resolve().parent.parent / "data" / "chartmasters_album_sales.csv"


def main():
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = list(reader.fieldnames)
        rows = list(reader)

    insert_at = fieldnames.index("Digital & Streamed Singles (EAS)") + 1
    fieldnames.insert(insert_at, "Singles sold")

    for row in rows:
        physical = int(row["Physical Singles (EAS)"])
        digital = int(row["Digital & Streamed Singles (EAS)"])
        row["Singles sold"] = physical + digital

    with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Added 'Singles sold' column to {len(rows)} rows in {CSV_PATH}")


if __name__ == "__main__":
    main()
