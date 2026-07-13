"""
Merge data/youtube_artists.csv, data/billboard1s_artists.csv and
data/billboardtop10_artists.csv into data/artist_new.csv on artist name
(case-insensitive), keeping only artists present in all three files with a
real (non-empty, non-zero) value for every column.

Does not modify any of the three source CSVs.

Run from backend/ directory:
    python scripts/merge_artist_datasets.py
"""

import csv
from pathlib import Path

DATA_DIR    = Path(__file__).resolve().parent.parent / "data"
YT_PATH     = DATA_DIR / "youtube_artists.csv"
B1_PATH     = DATA_DIR / "billboard1s_artists.csv"
BT_PATH     = DATA_DIR / "billboardtop10_artists.csv"
OUTPUT_PATH = DATA_DIR / "artist_new.csv"


def load(path: Path) -> list[dict]:
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def is_present(value: str) -> bool:
    """A column counts as missing if it's blank or a placeholder zero."""
    value = value.strip()
    if not value:
        return False
    try:
        return float(value) != 0
    except ValueError:
        return True  # non-numeric text (e.g. artist name) is always "present"


def main():
    yt_rows = load(YT_PATH)
    b1_rows = load(B1_PATH)
    bt_rows = load(BT_PATH)

    yt_by_key = {r["Artist Name"].strip().lower(): r for r in yt_rows}
    b1_by_key = {r["Artist Name"].strip().lower(): r for r in b1_rows}
    bt_by_key = {r["Artist Name"].strip().lower(): r for r in bt_rows}

    common_keys = yt_by_key.keys() & b1_by_key.keys() & bt_by_key.keys()
    print(f"Artists present in all three files: {len(common_keys)}")

    merged_rows = []
    for key in common_keys:
        yt, b1, bt = yt_by_key[key], b1_by_key[key], bt_by_key[key]

        fields = {
            "Artist Name": yt["Artist Name"].strip(),
            "youtube views": yt["youtube views"].strip(),
            "spotify monthly listeners": yt["spotify monthly listeners"].strip(),
            "Billboard #1": b1["Billboard #1"].strip(),
            "Billboard top 10": bt["Billboard top 10"].strip(),
        }

        if all(is_present(v) for v in fields.values()):
            merged_rows.append(fields)

    merged_rows.sort(key=lambda r: r["Artist Name"].lower())

    with open(OUTPUT_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(merged_rows[0].keys()))
        writer.writeheader()
        writer.writerows(merged_rows)

    print(f"Wrote {len(merged_rows)} artists to {OUTPUT_PATH}")
    print(f"Dropped {len(common_keys) - len(merged_rows)} artists for having a missing/zero value")


if __name__ == "__main__":
    main()
