"""
Reconcile the database with data/artists.csv: the CSV is treated as the
source of truth. For every artist name (matched case-insensitive):

  - present in both       -> update metrics/rating in the DB
  - present in CSV only   -> insert as a new artist (with a team, same as
                             import_artists.py)
  - present in DB only    -> delete from the DB, UNLESS a user has actually
                             engaged with it (Top5Item, ArtistVote, or is
                             someone's current team) - those are skipped and
                             reported instead of being force-deleted, since
                             that would silently affect real user data. The
                             artist's ArtistTeam row (auto-created, holds no
                             data of its own) is deleted along with it.

This combines what scripts/sync_artists_from_csv.py (update + optional
--create-missing) and scripts/delete_artists_not_in_csv.py do separately
into one pass.

Pass --dry-run to see what would be updated/created/deleted/skipped without
changing anything.

Run locally against prod by setting DATABASE_URL to the Railway connection string:

    $env:DATABASE_URL="postgresql+psycopg://..."   # PowerShell
    python scripts/reconcile_artists_from_csv.py --dry-run

Or on Railway console:
    /opt/venv/bin/python3 scripts/reconcile_artists_from_csv.py --dry-run
"""

import csv
import os
import re
import sys
import uuid
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

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
from app.models.top5 import Top5Item
from app.models.user import User
from app.models.vote import ArtistVote
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


def apply_csv_row(artist: Artist, row: dict) -> None:
    artist.billboard_top_10          = parse_int(row.get("Billboard top 10"))
    artist.billboard_number_1        = parse_int(row.get("Billboard #1"))
    artist.albums_sold               = parse_int(row.get("Albums sold"))
    artist.singles_sold              = parse_int(row.get("Singles sold"))
    artist.avg_songs_per_year        = parse_float(row.get("Avg. song per yr"))
    artist.awards                    = parse_int(row.get("Awards"))
    artist.platinum_albums           = parse_int(row.get("Platinum Albums"))
    artist.youtube_views             = parse_int(row.get("Youtube views"))
    artist.spotify_monthly_listeners = parse_int(row.get("Spotify listeners"))
    artist.rating                    = parse_float(row.get("Rating"))


def referencing_reasons(db, artist_id) -> list[str]:
    """Real user data that would be affected by deleting this artist (excludes ArtistTeam)."""
    reasons = []
    if db.query(Top5Item).filter(Top5Item.artist_id == artist_id).first():
        reasons.append("in a Top5Item")
    if db.query(ArtistVote).filter(ArtistVote.artist_id == artist_id).first():
        reasons.append("has ArtistVotes")
    if db.query(User).filter(User.current_team_artist_id == artist_id).first():
        reasons.append("is a user's current team")
    return reasons


def main(dry_run: bool = False):
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        csv_rows = list(csv.DictReader(f))
    csv_by_name = {row["Artist Name"].strip().lower(): row for row in csv_rows}
    print(f"Loaded {len(csv_rows)} artists from {CSV_PATH.name}\n")

    db = SessionLocal()
    try:
        db_artists_by_name: dict[str, Artist] = {a.name.lower(): a for a in db.query(Artist).all()}
        print(f"Loaded {len(db_artists_by_name)} artists from the database.\n")

        updated = 0
        created = 0
        deleted = 0
        skipped: list[tuple[str, list[str]]] = []
        prefix = "[DRY RUN] " if dry_run else ""

        # Update existing / insert missing.
        for key, row in csv_by_name.items():
            csv_name = row["Artist Name"].strip()
            artist = db_artists_by_name.get(key)

            if artist is None:
                print(f"  {prefix}CREATE: '{csv_name}'")
                if not dry_run:
                    artist = Artist(id=uuid.uuid4(), name=format_artist_name(csv_name))
                    db.add(artist)
                    db.flush()
                    db.add(ArtistTeam(artist_id=artist.id))
                    apply_csv_row(artist, row)
                created += 1
                continue

            print(f"  {prefix}UPDATE: '{csv_name}' (rating={row.get('Rating')})")
            if not dry_run:
                apply_csv_row(artist, row)
            updated += 1

        # Delete DB artists no longer present in the CSV.
        for key, artist in db_artists_by_name.items():
            if key in csv_by_name:
                continue

            reasons = referencing_reasons(db, artist.id)
            if reasons:
                skipped.append((artist.name, reasons))
                print(f"  SKIP DELETE: '{artist.name}' -- {', '.join(reasons)}")
                continue

            print(f"  {prefix}DELETE: '{artist.name}'")
            if not dry_run:
                db.query(ArtistTeam).filter(ArtistTeam.artist_id == artist.id).delete()
                db.delete(artist)
            deleted += 1

        if not dry_run:
            db.commit()

        verb = "Would" if dry_run else "Did"
        print(
            f"\n{verb} update {updated}, create {created}, and delete {deleted} artist(s)."
        )
        if skipped:
            print(
                f"Skipped {len(skipped)} artist(s) no longer in the CSV but still referenced "
                f"by real user data - resolve those references manually first if you want them gone too."
            )
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main(dry_run="--dry-run" in sys.argv[1:])
