import uuid as uuid_lib
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from thefuzz import fuzz, process

from app.auth import get_current_user, get_optional_user
from app.models.user_profile_vote import UserProfileVote
from app.config import settings
from app.database import get_db
from app.models.artist import Artist
from app.models.top5 import Top5Item, Top5List
from app.models.team import ArtistTeam
from app.models.user import User
from app.schemas import (
    ArtistBrief,
    ArtistDetail,
    SearchResults,
    TeamJoinRequest,
    Top5ItemPeople,
    UserBrief,
    UserPeopleItem,
    UserProfile,
)
from app.services import artist_to_brief, artist_to_detail, ensure_artist_teams, user_to_brief

router = APIRouter(prefix="/api", tags=["users & artists"])

ALLOWED_AVATAR_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_AVATAR_SIZE = 5 * 1024 * 1024


def _delete_old_avatar(profile_image_url: str | None) -> None:
    if not profile_image_url or not profile_image_url.startswith("/uploads/avatars/"):
        return
    old_path = Path(settings.upload_dir) / profile_image_url.removeprefix("/uploads/")
    if old_path.is_file():
        old_path.unlink()


@router.post("/users/me/avatar", response_model=UserBrief)
async def upload_profile_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    content_type = (file.content_type or "").split(";")[0].strip().lower()
    if content_type not in ALLOWED_AVATAR_TYPES:
        raise HTTPException(status_code=400, detail="Image must be JPEG, PNG, WebP, or GIF")

    content = await file.read()
    if len(content) > MAX_AVATAR_SIZE:
        raise HTTPException(status_code=400, detail="Image must be 5MB or smaller")
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")

    ext_map = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
    }
    ext = ext_map.get(content_type, Path(file.filename or "avatar.jpg").suffix or ".jpg")

    upload_dir = Path(settings.upload_dir) / "avatars"
    upload_dir.mkdir(parents=True, exist_ok=True)

    filename = f"avatar_{uuid_lib.uuid4().hex}{ext}"
    filepath = upload_dir / filename

    _delete_old_avatar(current_user.profile_image_url)

    with open(filepath, "wb") as f:
        f.write(content)

    current_user.profile_image_url = f"/uploads/avatars/{filename}"
    db.commit()
    db.refresh(current_user)
    return user_to_brief(current_user)


@router.get("/users/{username}", response_model=UserProfile)
def get_user_profile(username: str, db: Session = Depends(get_db)):
    user = (
        db.query(User)
        .options(joinedload(User.current_team_artist))
        .filter(User.username == username)
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    team = artist_to_brief(user.current_team_artist) if user.current_team_artist else None
    return UserProfile(
        id=user.id,
        name=user.name,
        username=user.username,
        city=user.city,
        profile_image_url=user.profile_image_url,
        current_team_artist=team,
        created_at=user.created_at,
    )


@router.post("/users/me/team")
def join_team(
    data: TeamJoinRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    artist = db.query(Artist).filter(Artist.id == data.artist_id).first()
    if not artist:
        raise HTTPException(status_code=404, detail="Artist not found")
    ensure_artist_teams(db, artist)
    current_user.current_team_artist_id = artist.id
    db.commit()
    return {"message": f"Joined Team {artist.name}"}


@router.get("/people", response_model=list[UserPeopleItem])
def list_people(
    current_user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    users = (
        db.query(User)
        .options(
            joinedload(User.current_team_artist),
            joinedload(User.top5_list).joinedload(Top5List.items).joinedload(Top5Item.artist),
        )
        .order_by(User.name)
        .all()
    )

    # Fetch vote counts for all users (graceful fallback if table not yet migrated)
    like_counts: dict = {}
    dislike_counts: dict = {}
    my_votes: dict = {}
    try:
        like_rows = (
            db.query(UserProfileVote.target_user_id, func.count(UserProfileVote.id).label("cnt"))
            .filter(UserProfileVote.vote_type == "like")
            .group_by(UserProfileVote.target_user_id)
            .all()
        )
        dislike_rows = (
            db.query(UserProfileVote.target_user_id, func.count(UserProfileVote.id).label("cnt"))
            .filter(UserProfileVote.vote_type == "dislike")
            .group_by(UserProfileVote.target_user_id)
            .all()
        )
        like_counts = {row.target_user_id: row.cnt for row in like_rows}
        dislike_counts = {row.target_user_id: row.cnt for row in dislike_rows}
        if current_user:
            my_votes_q = db.query(UserProfileVote).filter(
                UserProfileVote.voter_id == current_user.id
            ).all()
            my_votes = {v.target_user_id: v.vote_type for v in my_votes_q}
    except Exception:
        db.rollback()

    results = []
    for user in users:
        team = artist_to_brief(user.current_team_artist) if user.current_team_artist else None
        top5_items = []
        if user.top5_list and user.top5_list.items:
            for item in sorted(user.top5_list.items, key=lambda i: i.position):
                top5_items.append(
                    Top5ItemPeople(position=item.position, artist=artist_to_brief(item.artist))
                )
        likes = like_counts.get(user.id, 0)
        dislikes = dislike_counts.get(user.id, 0)
        results.append(
            UserPeopleItem(
                id=user.id,
                name=user.name,
                username=user.username,
                city=user.city,
                profile_image_url=user.profile_image_url,
                current_team_artist=team,
                top5_items=top5_items,
                like_count=likes,
                dislike_count=dislikes,
                my_vote=my_votes.get(user.id),
            )
        )
    return results


@router.get("/artists", response_model=list[ArtistDetail])
def list_artists(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    artists = db.query(Artist).order_by(Artist.name).offset(skip).limit(limit).all()
    return [artist_to_detail(a) for a in artists]


@router.get("/artists/{artist_id}", response_model=ArtistDetail)
def get_artist(artist_id: UUID, db: Session = Depends(get_db)):
    artist = db.query(Artist).filter(Artist.id == artist_id).first()
    if not artist:
        raise HTTPException(status_code=404, detail="Artist not found")
    ensure_artist_teams(db, artist)
    return artist_to_detail(artist)


@router.get("/search", response_model=SearchResults)
def search(q: str, db: Session = Depends(get_db)):
    if not q or len(q.strip()) < 1:
        return SearchResults(artists=[], users=[], teams=[])

    query = q.strip().lower()

    all_artists = db.query(Artist).all()
    artist_matches = []
    for artist in all_artists:
        score = fuzz.partial_ratio(query, artist.name.lower())
        if score >= 60:
            artist_matches.append((score, artist))
    artist_matches.sort(key=lambda x: x[0], reverse=True)
    matched_artists = [artist_to_brief(a) for _, a in artist_matches[:10]]

    all_users = db.query(User).options(joinedload(User.current_team_artist)).all()
    user_matches = []
    for user in all_users:
        score = max(
            fuzz.partial_ratio(query, user.username.lower()),
            fuzz.partial_ratio(query, user.name.lower()),
        )
        if score >= 60:
            user_matches.append((score, user))
    user_matches.sort(key=lambda x: x[0], reverse=True)
    matched_users = [user_to_brief(u) for _, u in user_matches[:10]]

    team_artists = [a for _, a in artist_matches[:5]]
    return SearchResults(artists=matched_artists, users=matched_users, teams=[artist_to_brief(a) for a in team_artists])
