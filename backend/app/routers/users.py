from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from thefuzz import fuzz, process

from app.auth import get_current_user, get_optional_user
from app.database import get_db
from app.models.artist import Artist
from app.models.team import ArtistTeam
from app.models.user import User
from app.schemas import ArtistBrief, ArtistDetail, SearchResults, TeamJoinRequest, UserBrief, UserProfile
from app.services import artist_to_brief, artist_to_detail, ensure_artist_teams, user_to_brief

router = APIRouter(prefix="/api", tags=["users & artists"])


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
