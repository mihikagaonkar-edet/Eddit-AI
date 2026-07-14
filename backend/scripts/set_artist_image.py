"""
Manually set (or override) a single artist's profile image, by name.

Useful when the automatically-picked cover from fetch_artist_images.py isn't
the one you want for a given artist.

Usage (from backend/ directory):
    python scripts/set_artist_image.py "<artist name>" <image path or URL>

Examples:
    python scripts/set_artist_image.py "Drake" C:\\Users\\me\\Downloads\\drake.jpg
    python scripts/set_artist_image.py "Drake" https://example.com/drake.jpg

The image is saved to uploads/artist_images/{artist_id}.jpg (overwriting
whatever was there), and the artist's image_url is set to
/uploads/artist_images/{artist_id}.jpg - same convention as
fetch_artist_images.py, so no other code needs to change.

Run locally against prod by setting DATABASE_URL to the Railway connection string:

    $env:DATABASE_URL="postgresql+psycopg://..."   # PowerShell
    python scripts/set_artist_image.py "Drake" drake.jpg

Or on Railway console:
    /opt/venv/bin/python3 scripts/set_artist_image.py "Drake" drake.jpg
"""

import os
import sys
import urllib.request
from pathlib import Path

# Load .env only when running locally (Railway injects env vars directly)
_env_path = Path(__file__).resolve().parent.parent / ".env"
if _env_path.exists() and not os.environ.get("DATABASE_URL"):
    for line in _env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
from app.database import SessionLocal
from app.models.artist import Artist

HEADERS = {"User-Agent": "EdditAI/1.0 (mihika@edetcorp.com)"}
IMAGES_DIR = Path(__file__).resolve().parent.parent / settings.upload_dir / "artist_images"


def fetch_image_bytes(source: str) -> bytes:
    if source.startswith("http://") or source.startswith("https://"):
        req = urllib.request.Request(source, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.read()

    path = Path(source)
    if not path.is_file():
        raise FileNotFoundError(f"No such file: {source}")
    return path.read_bytes()


def main(name: str, source: str):
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    db = SessionLocal()
    try:
        artist = (
            db.query(Artist)
            .filter(Artist.name.ilike(name.strip()))
            .first()
        )
        if artist is None:
            print(f"No artist found matching '{name}'.")
            return

        print(f"Fetching image from '{source}' for '{artist.name}'...")
        image_bytes = fetch_image_bytes(source)

        dest = IMAGES_DIR / f"{artist.id}.jpg"
        dest.write_bytes(image_bytes)

        artist.image_url = f"/uploads/artist_images/{artist.id}.jpg"
        db.commit()

        print(f"Done. '{artist.name}' image_url set to {artist.image_url}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print('Usage: python scripts/set_artist_image.py "<artist name>" <image path or URL>')
        sys.exit(1)
    main(sys.argv[1], sys.argv[2])
