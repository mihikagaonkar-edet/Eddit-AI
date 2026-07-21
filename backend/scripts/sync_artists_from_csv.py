"""
Sync artist metrics and ratings from CSV to the database.
Updates existing rows in-place (matched by name, case-insensitive).
By default does NOT insert new artists or delete existing ones.

Pass --create-missing to also insert CSV artists that aren't in the database
yet (each gets a new ArtistTeam too, matching scripts/import_artists.py).
Intended for local use only - the default (update-only) behavior is what
should run against prod, so review the "not found" list before opting in.

Run locally against prod by setting DATABASE_URL to the Railway connection string:

    $env:DATABASE_URL="postgresql+psycopg://..."   # PowerShell
    python scripts/sync_artists_from_csv.py

Or on Railway console:
    /opt/venv/bin/python3 scripts/sync_artists_from_csv.py

To also insert artists missing from the database (local only):
    python scripts/sync_artists_from_csv.py --create-missing
"""

import csv
import os
import re
import sys
import uuid
from pathlib import Path

# Load .env only when running locally (Railway injects env vars directly)
_env_path = Path(__file__).resolve().parents[1] / ".env"
if _env_path.exists() and not os.environ.get("DATABASE_URL"):
    for line in _env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip())

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal
from app.models.artist import Artist
from app.models.team import ArtistTeam
from app.utils.names import format_artist_name

CSV_PATH = Path(__file__).resolve().parents[1] / "data" / "artists.csv"

_SUFFIX_MULTIPLIERS = {"k": 1_000, "m": 1_000_000, "b": 1_000_000_000}

def parse_number(val: str | None) -> float | None:
    if not val or not str(val).strip():
        return None
    s = str(val).strip().replace(",", "")
    m = re.fullmatch(r"([\d.]+)\s*([kmb])", s, re.IGNORECASE)
    if m:
        return float(m.group(1)) * _SUFFIX_MULTIPLIERS[m.group(2).lower()]
    try:
        return float(s)
    except ValueError:
        return None

def parse_int(val):
    n = parse_number(val)
    return int(n) if n is not None else None

def parse_float(val):
    return parse_number(val)

def parse_singles_sold(val: str | None) -> tuple[int | None, bool]:
    """Returns (value, uncapped). A trailing '+' (e.g. '100M+', '100+') means
    the CSV source only knows the figure is at least this much. A bare
    number before the '+' with no unit is assumed to be in millions,
    matching every other value in this column."""
    if not val or not str(val).strip():
        return None, False
    s = str(val).strip().replace(",", "")
    uncapped = s.endswith("+")
    if uncapped:
        s = s[:-1].strip()

    m = re.fullmatch(r"([\d.]+)\s*([kmb])", s, re.IGNORECASE)
    if m:
        n = float(m.group(1)) * _SUFFIX_MULTIPLIERS[m.group(2).lower()]
    else:
        try:
            n = float(s)
        except ValueError:
            return None, uncapped
        if uncapped:
            n *= _SUFFIX_MULTIPLIERS["m"]

    return int(n), uncapped


def main(create_missing: bool = False):
    db = SessionLocal()
    try:
        # Build a lookup: lowercase name → Artist ORM object
        artists_by_name: dict[str, Artist] = {
            a.name.lower(): a for a in db.query(Artist).all()
        }
        print(f"Loaded {len(artists_by_name)} artists from database.\n")

        updated = 0
        created = 0
        not_found = []

        with open(CSV_PATH, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                csv_name = row["Artist Name"].strip()
                artist = artists_by_name.get(csv_name.lower())

                if artist is None and create_missing:
                    artist = Artist(id=uuid.uuid4(), name=format_artist_name(csv_name))
                    db.add(artist)
                    db.flush()
                    db.add(ArtistTeam(artist_id=artist.id))
                    created += 1
                    print(f"  Created: {csv_name}")
                elif artist is None:
                    not_found.append(csv_name)
                    continue

                artist.billboard_top_10          = parse_int(row.get("Billboard top 10"))
                artist.billboard_number_1        = parse_int(row.get("Billboard #1"))
                artist.albums_sold               = parse_int(row.get("Albums sold"))
                artist.singles_sold, artist.singles_sold_uncapped = parse_singles_sold(row.get("Singles sold"))
                artist.avg_songs_per_year        = parse_float(row.get("Avg. song per yr"))
                artist.awards                    = parse_int(row.get("Awards"))
                artist.platinum_albums           = parse_int(row.get("Platinum Albums"))
                artist.youtube_views             = parse_int(row.get("Youtube views"))
                artist.spotify_monthly_listeners = parse_int(row.get("Spotify listeners"))
                artist.rating                    = parse_float(row.get("Rating"))

                updated += 1
                print(f"  Updated: {csv_name}  (rating={row.get('Rating')})")

        db.commit()
        print(f"\nDone. {updated} artists synced to database.")
        if created:
            print(f"Created {created} new artist(s) that were missing from the database.")
        if not_found:
            print(f"Not found in DB ({len(not_found)}): {', '.join(not_found)}")
    except Exception as e:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main(create_missing="--create-missing" in sys.argv[1:])
