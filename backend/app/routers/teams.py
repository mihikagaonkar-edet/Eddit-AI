from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.argument import Argument, ArgumentVideo
from app.models.artist import Artist
from app.models.team import ArtistTeam
from app.models.top5 import Top5Item
from app.models.user import User
from app.models.vote import ArtistVote
from app.schemas import ArgumentResponse, ArtistBrief, ArtistDetail, TeamStats, UserBrief
from app.services import argument_to_response, artist_to_brief, artist_to_detail, user_to_brief

router = APIRouter(prefix="/api", tags=["teams"])


@router.get("/teams", response_model=list[ArtistBrief])
def list_teams(db: Session = Depends(get_db)):
    teams = (
        db.query(Artist)
        .join(ArtistTeam, ArtistTeam.artist_id == Artist.id)
        .order_by(Artist.name)
        .all()
    )
    return [artist_to_brief(t) for t in teams]


@router.get("/teams/{artist_id}", response_model=TeamStats)
def get_team(artist_id: UUID, db: Session = Depends(get_db)):
    artist = db.query(Artist).filter(Artist.id == artist_id).first()
    if not artist:
        raise HTTPException(status_code=404, detail="Team not found")

    member_count = (
        db.query(func.count(User.id))
        .filter(User.current_team_artist_id == artist_id)
        .scalar()
        or 0
    )

    newest = (
        db.query(User)
        .options(joinedload(User.current_team_artist))
        .filter(User.current_team_artist_id == artist_id)
        .order_by(User.created_at.desc())
        .limit(8)
        .all()
    )

    recent_args = (
        db.query(Argument)
        .options(
            joinedload(Argument.author).joinedload(User.current_team_artist),
            joinedload(Argument.argument_videos).joinedload(ArgumentVideo.video),
        )
        .join(User, User.id == Argument.author_user_id)
        .filter(User.current_team_artist_id == artist_id)
        .order_by(Argument.created_at.desc())
        .limit(10)
        .all()
    )

    team_ranks = (
        db.query(User.current_team_artist_id, func.count(User.id).label("cnt"))
        .filter(User.current_team_artist_id.isnot(None))
        .group_by(User.current_team_artist_id)
        .order_by(func.count(User.id).desc())
        .all()
    )
    team_rank = None
    for i, (aid, _) in enumerate(team_ranks, 1):
        if aid == artist_id:
            team_rank = i
            break

    return TeamStats(
        artist=artist_to_detail(artist),
        member_count=member_count,
        newest_members=[user_to_brief(u) for u in newest],
        recent_arguments=[argument_to_response(db, a) for a in recent_args],
        team_rank=team_rank,
    )


@router.get("/artists/{artist_id}/stats")
def artist_page_stats(artist_id: UUID, db: Session = Depends(get_db)):
    artist = db.query(Artist).filter(Artist.id == artist_id).first()
    if not artist:
        raise HTTPException(status_code=404, detail="Artist not found")

    member_count = (
        db.query(func.count(User.id))
        .filter(User.current_team_artist_id == artist_id)
        .scalar()
        or 0
    )

    position_counts = (
        db.query(Top5Item.position, func.count(Top5Item.id))
        .filter(Top5Item.artist_id == artist_id)
        .group_by(Top5Item.position)
        .all()
    )
    most_common_position = None
    if position_counts:
        most_common_position = max(position_counts, key=lambda x: x[1])[0]

    from app.models.top5 import Top5List

    top_supporters = (
        db.query(User)
        .options(joinedload(User.current_team_artist))
        .join(Top5List, Top5List.user_id == User.id)
        .join(Top5Item, Top5Item.top5_list_id == Top5List.id)
        .filter(Top5Item.artist_id == artist_id, Top5Item.position == 1)
        .limit(8)
        .all()
    )

    recent_args = (
        db.query(Argument)
        .options(
            joinedload(Argument.author).joinedload(User.current_team_artist),
            joinedload(Argument.argument_videos).joinedload(ArgumentVideo.video),
        )
        .filter(
            Argument.target_type == "top5_item",
            Argument.target_id.in_(
                db.query(Top5Item.id).filter(Top5Item.artist_id == artist_id)
            ),
        )
        .order_by(Argument.created_at.desc())
        .limit(10)
        .all()
    )

    liked_items = (
        db.query(Top5Item, func.count(ArtistVote.id).label("cnt"))
        .join(ArtistVote, ArtistVote.top5_item_id == Top5Item.id)
        .filter(Top5Item.artist_id == artist_id, ArtistVote.vote_type == "like")
        .group_by(Top5Item.id)
        .order_by(func.count(ArtistVote.id).desc())
        .limit(5)
        .all()
    )

    disliked_items = (
        db.query(Top5Item, func.count(ArtistVote.id).label("cnt"))
        .join(ArtistVote, ArtistVote.top5_item_id == Top5Item.id)
        .filter(Top5Item.artist_id == artist_id, ArtistVote.vote_type == "dislike")
        .group_by(Top5Item.id)
        .order_by(func.count(ArtistVote.id).desc())
        .limit(5)
        .all()
    )

    return {
        "artist": artist_to_detail(artist),
        "team_member_count": member_count,
        "most_common_position": most_common_position,
        "top_supporters": [user_to_brief(u) for u in top_supporters],
        "recent_arguments": [argument_to_response(db, a) for a in recent_args],
        "most_liked_placements": [
            {"position": item.position, "vote_count": cnt} for item, cnt in liked_items
        ],
        "most_disliked_placements": [
            {"position": item.position, "vote_count": cnt} for item, cnt in disliked_items
        ],
    }
