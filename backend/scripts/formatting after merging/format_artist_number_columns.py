"""
Normalize the "Albums sold", "Singles sold", and "Spotify listeners" columns
in data/artists.csv so every value uses the same abbreviated millions/billions
format produced by format_large_numbers.format_number.

These columns currently contain a mix of styles - raw integers (6510000),
comma-separated numbers, values already suffixed with k/m/b (e.g. "3.5m",
"732K"), and already-correct "50M"/"49.5M" style values. Each value is first
parsed back to a raw number, then re-formatted through format_number so the
whole column is consistent.

data/artists.csv is rewritten in place.

Run from backend/ directory:
    python scripts/format_artist_number_columns.py
"""

import csv
import re
import sys
from pathlib import Path

from format_large_numbers import format_number

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

CSV_PATH = Path(__file__).resolve().parent.parent / "data" / "artists.csv"
COLUMNS_TO_FORMAT = ["Albums sold", "Singles sold", "Spotify listeners"]

_SUFFIX_MULTIPLIERS = {
    "k": 1_000,
    "m": 1_000_000,
    "b": 1_000_000_000,
}


def parse_number(val: str) -> float | None:
    """Parse a cell value (raw digits, comma-separated, or k/m/b suffixed) to a float."""
    s = val.strip().replace(",", "").replace("$", "")
    if not s:
        return None
    match = re.fullmatch(r"([\d.]+)\s*([kmb])", s, re.IGNORECASE)
    if match:
        return float(match.group(1)) * _SUFFIX_MULTIPLIERS[match.group(2).lower()]
    return float(s)


def main():
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = list(reader.fieldnames)
        rows = list(reader)

    print(f"Loaded {len(rows)} artists from {CSV_PATH.name}\n")

    changed = 0
    skipped = 0
    for row in rows:
        name = row.get("Artist Name", "")
        for col in COLUMNS_TO_FORMAT:
            raw = row.get(col, "")
            try:
                n = parse_number(raw)
            except ValueError:
                print(f"  SKIP: could not parse '{raw}' for {name} ({col})")
                skipped += 1
                continue
            if n is None:
                continue

            new_val = format_number(n)
            if new_val != raw.strip():
                print(f"  {name} / {col}: '{raw}' -> '{new_val}'")
                row[col] = new_val
                changed += 1

    with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nReformatted {changed} value(s) across {COLUMNS_TO_FORMAT} in {CSV_PATH.name}.")
    if skipped:
        print(f"Skipped {skipped} unparseable value(s), left unchanged.")


if __name__ == "__main__":
    main()
