"""
Fetch album cover images from MusicBrainz Cover Art Archive, download them
locally, and store the local path in the database.

Flow per artist:
  1. Search MusicBrainz for the artist -> get MBID
  2. Fetch release-groups (albums) for that MBID
  3. Try Cover Art Archive for each release-group until one returns a front image
  4. Download the image to uploads/artist_images/{artist_id}.jpg
  5. Store /uploads/artist_images/{artist_id}.jpg in artist.image_url

By default only processes artists with no image_url yet (e.g. artists just
added via sync_artists_from_csv.py --create-missing), so existing images are
left untouched.

Usage (from backend/ directory):
    python scripts/fetch_artist_images.py

Pass --all to re-fetch and overwrite images for every artist, not just the
ones missing one:
    python scripts/fetch_artist_images.py --all

Rate limits: MusicBrainz asks for max 1 req/sec; Cover Art Archive is more lenient.
All data is CC0 / CC-licensed.
"""

import time
import urllib.parse
import urllib.request
import json
import sys
import os
from pathlib import Path

# Load .env before importing app modules
env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.artist import Artist
from app.config import settings

MB_BASE = "https://musicbrainz.org/ws/2"
CAA_BASE = "https://coverartarchive.org"
HEADERS = {"User-Agent": "EdditAI/1.0 (mihika@edetcorp.com)"}
DELAY = 1.1  # MusicBrainz rate limit: 1 req/sec

IMAGES_DIR = Path(__file__).resolve().parent.parent / settings.upload_dir / "artist_images"


def get(url: str) -> dict | None:
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())
    except Exception as e:
        print(f"    [error] {url}: {e}")
        return None


def search_artist_mbid(name: str) -> str | None:
    url = f"{MB_BASE}/artist?query={urllib.parse.quote(name)}&limit=1&fmt=json"
    data = get(url)
    time.sleep(DELAY)
    if not data:
        return None
    artists = data.get("artists") or []
    return artists[0]["id"] if artists else None


def get_release_groups(mbid: str) -> list[str]:
    url = f"{MB_BASE}/release-group?artist={mbid}&type=album&limit=10&fmt=json"
    data = get(url)
    time.sleep(DELAY)
    if not data:
        return []
    return [rg["id"] for rg in (data.get("release-groups") or [])]


def get_cover_url(release_group_mbid: str) -> str | None:
    url = f"{CAA_BASE}/release-group/{release_group_mbid}"
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
        images = data.get("images") or []
        for img in images:
            if img.get("front") and img.get("image"):
                return img["image"]
        if images and images[0].get("image"):
            return images[0]["image"]
    except Exception:
        pass
    return None


def fetch_thumb(artist_name: str) -> str | None:
    mbid = search_artist_mbid(artist_name)
    if not mbid:
        return None
    for rg_id in get_release_groups(mbid):
        cover = get_cover_url(rg_id)
        if cover:
            return cover
    return None


def download_image(remote_url: str, artist_id: str) -> str | None:
    dest = IMAGES_DIR / f"{artist_id}.jpg"
    try:
        req = urllib.request.Request(remote_url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15) as resp:
            dest.write_bytes(resp.read())
        return f"/uploads/artist_images/{artist_id}.jpg"
    except Exception as e:
        print(f"    [download error] {e}")
        return None


def main(refetch_all: bool = False):
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    db = SessionLocal()
    try:
        query = db.query(Artist).order_by(Artist.name)
        if not refetch_all:
            query = query.filter(Artist.image_url.is_(None))
        artists = query.all()

        if refetch_all:
            print(f"Found {len(artists)} artists. Clearing old images and fetching from MusicBrainz...\n")
            for artist in artists:
                artist.image_url = None
            db.commit()
            print("Cleared existing images.\n")
        else:
            print(f"Found {len(artists)} artist(s) with no image yet. Fetching from MusicBrainz...\n")

        updated = 0
        for artist in artists:
            print(f"  {artist.name} ... ", end="", flush=True)
            remote_url = fetch_thumb(artist.name)
            if not remote_url:
                print("no image found")
                continue
            local_path = download_image(remote_url, artist.id)
            if local_path:
                artist.image_url = local_path
                updated += 1
                print(f"OK {local_path}")
            else:
                print("download failed")

        db.commit()
        print(f"\nDone. Updated {updated}/{len(artists)} artists.")
    finally:
        db.close()


if __name__ == "__main__":
    main(refetch_all="--all" in sys.argv[1:])
