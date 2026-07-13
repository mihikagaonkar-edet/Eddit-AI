"""
Calculate Eddit Rating for each artist using the formula from the PDF.
Final rating = average of 8 category scores (rounded to nearest integer).

Categories:
  1. Billboard Top 10 songs
  2. Billboard #1 songs
  3. RIAA Album sales
  4. RIAA Singles sales
  5. Avg songs/year  (scored directly from the "Avg. song per yr" column)
  6. Awards
  7. YouTube total views
  8. Spotify monthly listeners

Run from backend/ directory:
    python scripts/calculate_ratings.py
"""

import csv
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

CSV_PATH = Path(__file__).resolve().parent.parent / "data" / "artists.csv"


# ── Value parsers ──────────────────────────────────────────────────────────────

def parse_value(raw: str) -> float:
    """Parse strings like '50M', '1.5B', '29B', '732K', '9.5K' → float in raw units."""
    s = raw.strip().replace(",", "")
    if not s or s == "0":
        return 0.0
    m = re.match(r'^([\d.]+)\s*([KkMmBb]?)$', s)
    if not m:
        return 0.0
    num = float(m.group(1))
    suffix = m.group(2).upper()
    if suffix == "K":
        return num * 1_000
    if suffix == "M":
        return num * 1_000_000
    if suffix == "B":
        return num * 1_000_000_000
    return num


def parse_int(raw: str) -> int:
    try:
        return int(str(raw).strip())
    except (ValueError, TypeError):
        return 0


# ── Category scoring functions ──────────────────────────────────────────────────

def score_top10(n: int) -> int:
    if n == 0:   return 70
    if n == 1:   return 72
    if n == 2:   return 74
    if n == 3:   return 76
    if n == 4:   return 78
    if n == 5:   return 80
    if n == 6:   return 82
    if n == 7:   return 84
    if n == 8:   return 86
    if n == 9:   return 88
    if n <= 20:  return 90
    if n <= 31:  return 95
    return 100


def score_number_ones(n: int) -> int:
    if n == 0:  return 70
    if n == 1:  return 80
    if n == 2:  return 85
    if n == 3:  return 90
    if n == 4:  return 95
    return 100  # 5+


def score_sales(val: float) -> int:
    """Same scale for both album sales and singles sales (val in raw units)."""
    m = val / 1_000_000  # convert to millions
    if m == 0:      return 70
    if m < 0.5:     return 70
    if m < 1:       return 80
    if m < 2:       return 81
    if m < 3:       return 82
    if m < 4:       return 83
    if m < 5:       return 84
    if m < 6:       return 85
    if m < 10:      return 86
    if m < 16:      return 87
    if m < 19:      return 88
    if m <= 20:     return 89
    if m <= 50:     return 90
    if m < 100:     return 95
    return 100  # 100M+


# Avg songs/year lookup table (the "11-15 years experience" bracket from the
# original per-artist-experience table, now used as a flat scale for everyone)
_AVG_SONGS_TABLE = [70,81,82,83,84,85,86,87,88,89,90,92,94,96,98,100]

def score_avg_songs(avg: int) -> int:
    idx = min(avg, len(_AVG_SONGS_TABLE) - 1)
    return _AVG_SONGS_TABLE[idx]


def score_awards(n: int) -> int:
    if n == 0:       return 70
    if n <= 4:       return 80
    if n <= 9:       return 85
    if n <= 14:      return 90
    if n <= 19:      return 95
    return 100  # 20+


def score_youtube(val: float) -> int:
    """val in raw units (e.g. 29_000_000_000 for 29B)."""
    B = 1_000_000_000
    M = 1_000_000
    K = 1_000
    if val < 100 * K:     return 70
    if val < 500 * K:     return 70
    if val < 1 * M:       return 71
    if val < 2 * M:       return 72
    if val < 11 * M:      return 73
    if val < 51 * M:      return 74
    if val < 100 * M:     return 75
    if val < 200 * M:     return 76
    if val < 300 * M:     return 77
    if val < 400 * M:     return 78
    if val < 500 * M:     return 79
    if val < 600 * M:     return 80
    if val < 700 * M:     return 81
    if val < 800 * M:     return 82
    if val < 900 * M:     return 83
    if val < 1 * B:       return 84
    if val < 1.5 * B:     return 85
    if val < 2 * B:       return 86
    if val < 2.5 * B:     return 87
    if val < 3 * B:       return 88
    if val < 3.5 * B:     return 89
    if val < 4 * B:       return 90
    if val < 6 * B:       return 92
    if val < 8 * B:       return 94
    if val < 10 * B:      return 96
    if val < 11 * B:      return 98
    return 100  # 11B+


def score_spotify(val: float) -> int:
    """val in raw units."""
    M = 1_000_000
    K = 1_000
    if val < 100 * K:     return 70
    if val < 500 * K:     return 75
    if val < 1 * M:       return 80
    if val < 5 * M:       return 85
    if val < 10 * M:      return 90
    if val < 20 * M:      return 91
    if val < 30 * M:      return 92
    if val < 40 * M:      return 93
    if val < 50 * M:      return 94
    if val < 60 * M:      return 95
    if val < 70 * M:      return 96
    if val < 80 * M:      return 97
    if val < 90 * M:      return 98
    if val < 100 * M:     return 99
    return 100  # 100M+


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    rows: list[dict] = []
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        rows = list(reader)

    for row in rows:
        name = row["Artist Name"].strip()

        top10      = parse_int(row["Billboard top 10"])
        num_ones   = parse_int(row["Billboard #1"])
        albums     = parse_value(row["Albums sold"])
        singles    = parse_value(row["Singles sold"])
        avg_songs  = parse_int(row["Avg. song per yr"])
        awards     = parse_int(row["Awards"])
        yt_views   = parse_value(row["Youtube views"])
        spotify    = parse_value(row["Spotify listeners"])

        s1 = score_top10(top10)
        s2 = score_number_ones(num_ones)
        s3 = score_sales(albums)
        s4 = score_sales(singles)
        s5 = score_avg_songs(avg_songs)
        s6 = score_awards(awards)
        s7 = score_youtube(yt_views)
        s8 = score_spotify(spotify)

        rating = round((s1 + s2 + s3 + s4 + s5 + s6 + s7 + s8) / 8)

        old_rating = row["Rating"]
        row["Rating"] = str(rating)

        print(
            f"  {name:<22} "
            f"top10={s1} #1={s2} alb={s3} sng={s4} avg={s5} awd={s6} yt={s7} sp={s8}"
            f"  =>  {old_rating} -> {rating}"
        )

    with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nDone. Updated Rating for {len(rows)} artists.")


if __name__ == "__main__":
    main()
