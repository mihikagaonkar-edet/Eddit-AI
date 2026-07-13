"""
Read data/hot100.csv (weekly Billboard Hot 100 chart history) and pull out
every row where Rank == 1, saving them to data/billboard1s.csv.

Run from backend/ directory:
    python scripts/filter_billboard_ones.py
"""

import csv
from pathlib import Path

HOT100_PATH = Path(__file__).resolve().parent.parent / "data" / "hot100.csv"
OUTPUT_PATH = Path(__file__).resolve().parent.parent / "data" / "billboard1s.csv"


def main():
    with open(HOT100_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        number_ones = [row for row in reader if row["Rank"].strip() == "1"]

    with open(OUTPUT_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(number_ones)

    print(f"Found {len(number_ones)} rank-1 entries.")
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
