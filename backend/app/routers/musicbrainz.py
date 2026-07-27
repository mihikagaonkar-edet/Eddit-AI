"""
Fallback for artists that aren't in the local database yet: verify they're a
real artist via the MusicBrainz API, and if so let the user add a bare-bones
row for them (name only, every stat left null) so they can immediately add
the artist to a Top 5 or join their team.
"""

import json
import time
import urllib.parse
import urllib.request
from threading import Lock

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models.artist import Artist
from app.models.user import User
from app.schemas import (
    ArtistDetail,
    CreateArtistFromMusicBrainzRequest,
    MusicBrainzCandidate,
    MusicBrainzSearchResponse,
)
from app.services import artist_to_detail, ensure_artist_teams
from app.utils.names import format_artist_name

router = APIRouter(prefix="/api", tags=["musicbrainz"])

MB_BASE = "https://musicbrainz.org/ws/2"
HEADERS = {"User-Agent": "EdditAI/1.0 (mihika@edetcorp.com)", "Accept": "application/json"}
MIN_SCORE = 85  # MusicBrainz's own 0-100 match confidence - require a strong match
REQUEST_DELAY_SECONDS = 1.1  # MusicBrainz asks for max ~1 req/sec, shared across all users
CACHE_TTL_SECONDS = 60 * 60  # avoid re-querying MusicBrainz for the same name within an hour

_cache: dict[str, tuple[float, MusicBrainzCandidate | None]] = {}
_last_request_at = 0.0
_lock = Lock()


def _throttle() -> None:
    global _last_request_at
    with _lock:
        wait = REQUEST_DELAY_SECONDS - (time.monotonic() - _last_request_at)
        if wait > 0:
            time.sleep(wait)
        _last_request_at = time.monotonic()


def _query_musicbrainz(name: str) -> MusicBrainzCandidate | None:
    url = f"{MB_BASE}/artist?query={urllib.parse.quote(name)}&limit=1&fmt=json"
    _throttle()
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
    except Exception:
        return None

    candidates = data.get("artists") or []
    if not candidates:
        return None

    best = candidates[0]
    score = int(best.get("score", 0))
    if score < MIN_SCORE:
        return None

    return MusicBrainzCandidate(musicbrainz_id=best["id"], name=best.get("name", name), score=score)


@router.get("/musicbrainz/search", response_model=MusicBrainzSearchResponse)
def search_musicbrainz(q: str):
    query = q.strip()
    if len(query) < 2:
        return MusicBrainzSearchResponse(candidate=None)

    cache_key = query.lower()
    cached = _cache.get(cache_key)
    if cached and (time.monotonic() - cached[0]) < CACHE_TTL_SECONDS:
        return MusicBrainzSearchResponse(candidate=cached[1])

    candidate = _query_musicbrainz(query)
    _cache[cache_key] = (time.monotonic(), candidate)
    return MusicBrainzSearchResponse(candidate=candidate)


@router.post("/artists/from-musicbrainz", response_model=ArtistDetail)
def create_artist_from_musicbrainz(
    data: CreateArtistFromMusicBrainzRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    name = format_artist_name(data.name.strip())
    if not name:
        raise HTTPException(status_code=400, detail="Artist name is required")

    existing = db.query(Artist).filter(Artist.name.ilike(name)).first()
    if existing:
        ensure_artist_teams(db, existing)
        return artist_to_detail(existing)

    artist = Artist(name=name)
    db.add(artist)
    db.flush()
    ensure_artist_teams(db, artist)  # commits the artist + its team together
    db.refresh(artist)
    return artist_to_detail(artist)
