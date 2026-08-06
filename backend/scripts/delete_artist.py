"""
Delete a single artist from the database, given their name.

If the artist is referenced by real user data (a Top5Item, an ArtistVote, or
someone's current team), it is NOT force-deleted. Instead you can supply a
replacement artist as a second argument, and every one of those references
gets repointed to the replacement before the original artist (and its
ArtistTeam row) is deleted. If you don't supply a replacement up front and
references exist, you're prompted for one interactively - leave it blank to
cancel and keep the artist as-is.

Usage (from backend/ directory):
    python scripts/delete_artist.py "<Artist Name>"
    python scripts/delete_artist.py "<Artist Name>" "<Replacement Artist Name>"

Examples:
    python scripts/delete_artist.py "Kanye West Tribute Band"
    python scripts/delete_artist.py "Kanye West Tribute Band" "Kanye West"

Run locally against prod by setting DATABASE_URL to the Railway connection string:

    $env:DATABASE_URL="postgresql+psycopg://..."   # PowerShell
    python scripts/delete_artist.py "Some Artist"

Or on Railway console:
    /opt/venv/bin/python3 scripts/delete_artist.py "Some Artist"
"""

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


def replace_and_delete(db, old_artist: Artist, new_artist: Artist) -> None:
    """Repoint every reference from old_artist to new_artist, then delete old_artist."""
    db.query(Top5Item).filter(Top5Item.artist_id == old_artist.id).update(
        {"artist_id": new_artist.id}
    )
    db.query(ArtistVote).filter(ArtistVote.artist_id == old_artist.id).update(
        {"artist_id": new_artist.id}
    )
    db.query(User).filter(User.current_team_artist_id == old_artist.id).update(
        {"current_team_artist_id": new_artist.id}
    )
    db.query(ArtistTeam).filter(ArtistTeam.artist_id == old_artist.id).delete()
    db.delete(old_artist)
    db.commit()


def main(name: str, replacement_name: str | None):
    db = SessionLocal()
    try:
        artist = db.query(Artist).filter(Artist.name.ilike(name.strip())).first()
        if artist is None:
            print(f"No artist found matching '{name}'.")
            return

        reasons = referencing_reasons(db, artist.id)

        if not reasons:
            db.query(ArtistTeam).filter(ArtistTeam.artist_id == artist.id).delete()
            db.delete(artist)
            db.commit()
            print(f"Deleted '{artist.name}' - it wasn't referenced by any user data.")
            return

        print(f"'{artist.name}' is still referenced: {', '.join(reasons)}.")

        if not replacement_name:
            replacement_name = input(
                "Enter a replacement artist name to move those references to "
                "(or press Enter to cancel): "
            ).strip()
            if not replacement_name:
                print(f"Cancelled - '{artist.name}' was left unchanged.")
                return

        replacement = db.query(Artist).filter(Artist.name.ilike(replacement_name.strip())).first()
        if replacement is None:
            print(f"No artist found matching replacement name '{replacement_name}'. Aborting - nothing was changed.")
            return
        if replacement.id == artist.id:
            print("Replacement artist is the same as the one being deleted. Aborting - nothing was changed.")
            return

        replace_and_delete(db, artist, replacement)
        print(
            f"Replaced '{artist.name}' with '{replacement.name}' in all Top5/vote/team "
            f"references, then deleted '{artist.name}'."
        )
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print('Usage: python scripts/delete_artist.py "<Artist Name>" ["<Replacement Artist Name>"]')
        sys.exit(1)
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
