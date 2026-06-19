"""Clear uploaded video files and all arguments from the database.

Removes:
- Files in uploads/videos/ (and any thumbnails)
- argument_videos, arguments, and videos rows

Keeps user accounts, Top 5, teams, artists, and lit/cringe votes.

Usage:
    python scripts/clear_videos.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import settings
from app.database import SessionLocal
from app.models.argument import Argument, ArgumentVideo
from app.models.video import Video


def _delete_argument_replies(db) -> int:
    """Delete nested replies before top-level arguments (self-referential FK)."""
    total = 0
    while True:
        deleted = (
            db.query(Argument)
            .filter(Argument.parent_argument_id.isnot(None))
            .delete(synchronize_session=False)
        )
        if deleted == 0:
            break
        total += deleted
    return total


def _delete_upload_files() -> int:
    upload_root = Path(settings.upload_dir)
    removed = 0
    for subdir in ("videos",):
        folder = upload_root / subdir
        if not folder.exists():
            continue
        for path in folder.iterdir():
            if path.is_file():
                path.unlink()
                removed += 1
    return removed


def clear_videos() -> None:
    db = SessionLocal()
    try:
        links = db.query(ArgumentVideo).delete()
        replies = _delete_argument_replies(db)
        arguments = db.query(Argument).delete()
        videos = db.query(Video).delete()
        db.commit()

        files = _delete_upload_files()

        print(
            f"Cleared {links} argument_videos, {replies} reply arguments, "
            f"{arguments} arguments, {videos} videos, {files} file(s) from disk."
        )
    finally:
        db.close()


if __name__ == "__main__":
    clear_videos()
