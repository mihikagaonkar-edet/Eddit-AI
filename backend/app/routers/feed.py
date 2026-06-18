from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.argument import Argument, ArgumentVideo
from app.models.artist import Artist
from app.models.team import ArtistTeam
from app.models.top5 import Top5Item, Top5List
from app.models.user import User
from app.models.vote import ArtistVote
from app.schemas import HomeFeed, RankingsResponse
from app.services import argument_to_response, artist_to_brief, top5_to_response, user_to_brief

router = APIRouter(prefix="/api", tags=["feed & rankings"])


@router.get("/home", response_model=HomeFeed)
def home_feed(db: Session = Depends(get_db)):
    trending = (
        db.query(Top5List)
        .options(joinedload(Top5List.items).joinedload(Top5Item.artist))
        .order_by(Top5List.updated_at.desc())
        .limit(6)
        .all()
    )

    debated = (
        db.query(Artist, func.count(Argument.id).label("cnt"))
        .join(Top5Item, Top5Item.artist_id == Artist.id)
        .join(Argument, Argument.target_id == Top5Item.id)
        .group_by(Artist.id)
        .order_by(func.count(Argument.id).desc())
        .limit(8)
        .all()
    )

    growing_teams = (
        db.query(Artist, func.count(User.id).label("cnt"))
        .join(User, User.current_team_artist_id == Artist.id)
        .group_by(Artist.id)
        .order_by(func.count(User.id).desc())
        .limit(6)
        .all()
    )

    featured = (
        db.query(User)
        .options(joinedload(User.current_team_artist))
        .order_by(User.created_at.desc())
        .limit(6)
        .all()
    )

    recent_args = (
        db.query(Argument)
        .options(
            joinedload(Argument.author).joinedload(User.current_team_artist),
            joinedload(Argument.argument_videos).joinedload(ArgumentVideo.video),
        )
        .filter(Argument.parent_argument_id.is_(None))
        .order_by(Argument.created_at.desc())
        .limit(10)
        .all()
    )

    from app.schemas import UserProfile

    return HomeFeed(
        trending_top5s=[top5_to_response(db, t) for t in trending if t.items],
        most_debated_artists=[artist_to_brief(a) for a, _ in debated],
        fastest_growing_teams=[artist_to_brief(a) for a, _ in growing_teams],
        featured_profiles=[
            UserProfile(
                id=u.id,
                name=u.name,
                username=u.username,
                city=u.city,
                profile_image_url=u.profile_image_url,
                current_team_artist=artist_to_brief(u.current_team_artist)
                if u.current_team_artist
                else None,
                created_at=u.created_at,
            )
            for u in featured
        ],
        recent_arguments=[argument_to_response(db, a) for a in recent_args],
    )


@router.get("/rankings", response_model=RankingsResponse)
def rankings(db: Session = Depends(get_db)):
    top_artists = (
        db.query(Artist).order_by(Artist.rating.desc().nullslast()).limit(10).all()
    )

    top_teams = (
        db.query(Artist, func.count(User.id).label("cnt"))
        .join(User, User.current_team_artist_id == Artist.id)
        .group_by(Artist.id)
        .order_by(func.count(User.id).desc())
        .limit(10)
        .all()
    )

    debated = (
        db.query(Artist, func.count(Argument.id))
        .join(Top5Item, Top5Item.artist_id == Artist.id)
        .join(Argument, Argument.target_id == Top5Item.id)
        .group_by(Artist.id)
        .order_by(func.count(Argument.id).desc())
        .limit(10)
        .all()
    )

    liked = (
        db.query(Artist, func.count(ArtistVote.id))
        .join(ArtistVote, ArtistVote.artist_id == Artist.id)
        .filter(ArtistVote.vote_type == "like")
        .group_by(Artist.id)
        .order_by(func.count(ArtistVote.id).desc())
        .limit(10)
        .all()
    )

    disliked = (
        db.query(Artist, func.count(ArtistVote.id))
        .join(ArtistVote, ArtistVote.artist_id == Artist.id)
        .filter(ArtistVote.vote_type == "dislike")
        .group_by(Artist.id)
        .order_by(func.count(ArtistVote.id).desc())
        .limit(10)
        .all()
    )

    active_fans = (
        db.query(User, func.count(Argument.id))
        .join(Argument, Argument.author_user_id == User.id)
        .group_by(User.id)
        .order_by(func.count(Argument.id).desc())
        .limit(10)
        .all()
    )

    return RankingsResponse(
        top_artists=[artist_to_brief(a) for a in top_artists],
        top_teams=[artist_to_brief(a) for a, _ in top_teams],
        most_debated_artists=[artist_to_brief(a) for a, _ in debated],
        most_liked_artists=[artist_to_brief(a) for a, _ in liked],
        most_disliked_artists=[artist_to_brief(a) for a, _ in disliked],
        most_active_fans=[user_to_brief(u) for u, _ in active_fans],
    )
