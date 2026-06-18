"""Import artists from CSV and create teams.

Expected CSV columns (snake_case):
    name, billboard_top_10, billboard_number_1, albums_sold, singles_sold,
    avg_songs_per_year, awards, youtube_views, spotify_monthly_listeners, rating

Usage:
    python scripts/import_artists.py data/artists.csv
"""

import csv
import re
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal
from app.models.artist import Artist
from app.models.team import ArtistTeam
from app.utils.names import format_artist_name

# Map spreadsheet-style headers to model field names.
COLUMN_ALIASES: dict[str, str] = {
    "artist name": "name",
    "artist nam": "name",
    "billboard t": "billboard_top_10",
    "billboard top 10": "billboard_top_10",
    "billboard #": "billboard_number_1",
    "billboard #1": "billboard_number_1",
    "albums so": "albums_sold",
    "albums sold": "albums_sold",
    "singles sol": "singles_sold",
    "singles sold": "singles_sold",
    "avg. song": "avg_songs_per_year",
    "avg song": "avg_songs_per_year",
    "avg. song per yr": "avg_songs_per_year",
    "avg song per yr": "avg_songs_per_year",
    "avg_songs_per_year": "avg_songs_per_year",
    "youtube views": "youtube_views",
    "spotify listeners": "spotify_monthly_listeners",
    "spotify monthly listeners": "spotify_monthly_listeners",
    "eddit_rating": "rating",
}


def normalize_row(row: dict[str, str | None]) -> dict[str, str | None]:
    normalized: dict[str, str | None] = {}
    for key, value in row.items():
        if key is None:
            continue
        field = COLUMN_ALIASES.get(key.strip().lower(), key.strip().lower())
        normalized[field] = value
    return normalized


_SUFFIX_MULTIPLIERS = {
    "k": 1_000,
    "m": 1_000_000,
    "b": 1_000_000_000,
    "t": 1_000_000_000_000,
}


def parse_number(val: str | None) -> float | None:
    if not val or not str(val).strip():
        return None
    s = str(val).strip().replace(",", "").replace("$", "")
    match = re.fullmatch(r"([\d.]+)\s*([kmbt])", s, re.IGNORECASE)
    if match:
        return float(match.group(1)) * _SUFFIX_MULTIPLIERS[match.group(2).lower()]
    return float(s)


def parse_int(val: str | None) -> int | None:
    n = parse_number(val)
    return int(n) if n is not None else None


def parse_float(val: str | None) -> float | None:
    return parse_number(val)


def import_csv(path: str) -> None:
    db = SessionLocal()
    try:
        with open(path, newline="", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                data = normalize_row(row)
                if not data.get("name") or not str(data["name"]).strip():
                    continue
                artist = Artist(
                    id=uuid.uuid4(),
                    name=format_artist_name(str(data["name"]).strip()),
                    billboard_top_10=parse_int(data.get("billboard_top_10")),
                    billboard_number_1=parse_int(data.get("billboard_number_1")),
                    albums_sold=parse_int(data.get("albums_sold")),
                    singles_sold=parse_int(data.get("singles_sold")),
                    avg_songs_per_year=parse_float(data.get("avg_songs_per_year")),
                    awards=parse_int(data.get("awards")),
                    youtube_views=parse_int(data.get("youtube_views")),
                    spotify_monthly_listeners=parse_int(data.get("spotify_monthly_listeners")),
                    rating=parse_float(data.get("rating")),
                )
                db.add(artist)
                db.flush()
                db.add(ArtistTeam(artist_id=artist.id))
        db.commit()
        count = db.query(Artist).count()
        print(f"Imported {count} artists with teams.")
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/import_artists.py <csv_path>")
        sys.exit(1)
    import_csv(sys.argv[1])
