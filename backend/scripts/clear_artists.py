"""Clear artists and related data so CSV can be re-imported.

Keeps user accounts but removes team assignments and Top 5 placements.

Usage:
    python scripts/clear_artists.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal
from app.models.artist import Artist
from app.models.team import ArtistTeam
from app.models.top5 import Top5Item
from app.models.user import User
from app.models.vote import ArtistVote


def clear_artists() -> None:
    db = SessionLocal()
    try:
        db.query(User).update({User.current_team_artist_id: None})
        votes = db.query(ArtistVote).delete()
        items = db.query(Top5Item).delete()
        teams = db.query(ArtistTeam).delete()
        artists = db.query(Artist).delete()
        db.commit()
        print(
            f"Cleared {artists} artists, {teams} teams, {items} top5 items, "
            f"{votes} votes. User team assignments reset."
        )
    finally:
        db.close()


if __name__ == "__main__":
    clear_artists()
