"""
Delete artists from the database that are no longer present in
data/artists.csv (matched by name, case-insensitive).

An artist is only deleted if no user has actually engaged with it - i.e. it
isn't in any Top5Item, hasn't been voted on (ArtistVote), and isn't anyone's
current team (User.current_team_artist_id). Its ArtistTeam row (created
automatically for every artist, with no data of its own) is deleted along
with it. Artists that ARE referenced by real user data are left in place and
reported instead of being force-deleted, since that would silently affect
a user's Top 5 / team / votes.

Pass --dry-run to see what would be deleted/skipped without changing
anything.

Run locally against prod by setting DATABASE_URL to the Railway connection string:

    $env:DATABASE_URL="postgresql+psycopg://..."   # PowerShell
    python scripts/delete_artists_not_in_csv.py --dry-run

Or on Railway console:
    /opt/venv/bin/python3 scripts/delete_artists_not_in_csv.py --dry-run
"""

import csv
import os
import sys
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
from app.models.top5 import Top5Item
from app.models.user import User
from app.models.vote import ArtistVote

CSV_PATH = Path(__file__).resolve().parents[1] / "data" / "artists.csv"


def load_csv_names() -> set[str]:
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        return {row["Artist Name"].strip().lower() for row in csv.DictReader(f)}


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
    csv_names = load_csv_names()
    print(f"Loaded {len(csv_names)} artist names from {CSV_PATH.name}\n")

    db = SessionLocal()
    try:
        artists = db.query(Artist).all()
        stale = [a for a in artists if a.name.strip().lower() not in csv_names]
        print(f"Found {len(stale)} artist(s) in the database not present in {CSV_PATH.name}.\n")

        deleted = 0
        skipped: list[tuple[str, list[str]]] = []

        for artist in stale:
            reasons = referencing_reasons(db, artist.id)
            if reasons:
                skipped.append((artist.name, reasons))
                print(f"  SKIP: '{artist.name}' -- {', '.join(reasons)}")
                continue

            prefix = "[DRY RUN] " if dry_run else ""
            print(f"  {prefix}DELETE: '{artist.name}'")
            if not dry_run:
                db.query(ArtistTeam).filter(ArtistTeam.artist_id == artist.id).delete()
                db.delete(artist)
            deleted += 1

        if not dry_run:
            db.commit()

        verb = "Would delete" if dry_run else "Deleted"
        print(f"\n{verb} {deleted} artist(s).")
        if skipped:
            print(
                f"Skipped {len(skipped)} artist(s) still referenced by real user data - "
                f"resolve those references manually first if you want them gone too."
            )
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main(dry_run="--dry-run" in sys.argv[1:])
