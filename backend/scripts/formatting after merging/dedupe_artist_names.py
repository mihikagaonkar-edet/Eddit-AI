"""
Drop duplicate artists from data/artists.csv, where a duplicate is defined as
the same Artist Name compared case-insensitively (e.g. "taylor swift" and
"Taylor Swift").

For each group of duplicates, the row with the highest Rating is kept in
data/artists.csv. Every other row in that group is removed from artists.csv
and written to data/duplicate_artists_removed.csv instead. Ties (equal
rating) keep whichever row appears first in the file.

Run from backend/ directory:
    python scripts/dedupe_artist_names.py
"""

import csv
import sys
from collections import defaultdict
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

CSV_PATH = Path(__file__).resolve().parent.parent / "data" / "artists.csv"
REMOVED_PATH = Path(__file__).resolve().parent.parent / "data" / "duplicate_artists_removed.csv"


def parse_rating(raw: str) -> int:
    try:
        return int(str(raw).strip())
    except (ValueError, TypeError):
        return 0


def main():
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = list(reader.fieldnames)
        rows = list(reader)

    print(f"Loaded {len(rows)} artists from {CSV_PATH.name}\n")

    groups: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        key = row["Artist Name"].strip().lower()
        groups[key].append(row)

    kept: list[dict] = []
    removed: list[dict] = []

    for key, group in groups.items():
        if len(group) == 1:
            kept.append(group[0])
            continue

        best_idx = max(range(len(group)), key=lambda i: parse_rating(group[i]["Rating"]))
        for i, row in enumerate(group):
            if i == best_idx:
                kept.append(row)
            else:
                removed.append(row)
                print(
                    f"  DROP: '{row['Artist Name']}' (rating {row['Rating']}) "
                    f"-> kept '{group[best_idx]['Artist Name']}' (rating {group[best_idx]['Rating']})"
                )

    with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(kept)

    with open(REMOVED_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(removed)

    print(f"\nKept {len(kept)} artists in {CSV_PATH.name}.")
    print(f"Removed {len(removed)} duplicate row(s), saved to {REMOVED_PATH.name}.")


if __name__ == "__main__":
    main()
