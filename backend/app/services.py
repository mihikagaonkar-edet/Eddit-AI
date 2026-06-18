from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.argument import Argument, ArgumentVideo
from app.models.artist import Artist
from app.models.team import ArtistTeam
from app.models.top5 import Top5Item, Top5List
from app.models.user import User
from app.models.video import Video
from app.models.vote import ArtistVote
from app.schemas import (
    ArgumentResponse,
    ArtistBrief,
    ArtistDetail,
    Top5ItemResponse,
    Top5Response,
    UserBrief,
    VideoResponse,
)


def artist_to_brief(artist: Artist) -> ArtistBrief:
    return ArtistBrief.model_validate(artist)


def artist_to_detail(artist: Artist) -> ArtistDetail:
    return ArtistDetail.model_validate(artist)


def user_to_brief(user: User) -> UserBrief:
    team = None
    if user.current_team_artist:
        team = artist_to_brief(user.current_team_artist)
    return UserBrief(
        id=user.id,
        name=user.name,
        username=user.username,
        city=user.city,
        profile_image_url=user.profile_image_url,
        current_team_artist=team,
    )


def get_vote_counts(db: Session, top5_item_id: UUID) -> tuple[int, int]:
    likes = (
        db.query(func.count(ArtistVote.id))
        .filter(ArtistVote.top5_item_id == top5_item_id, ArtistVote.vote_type == "like")
        .scalar()
        or 0
    )
    dislikes = (
        db.query(func.count(ArtistVote.id))
        .filter(ArtistVote.top5_item_id == top5_item_id, ArtistVote.vote_type == "dislike")
        .scalar()
        or 0
    )
    return likes, dislikes


def get_argument_count(db: Session, target_type: str, target_id: UUID) -> int:
    return (
        db.query(func.count(Argument.id))
        .filter(Argument.target_type == target_type, Argument.target_id == target_id)
        .scalar()
        or 0
    )


def top5_item_to_response(db: Session, item: Top5Item) -> Top5ItemResponse:
    likes, dislikes = get_vote_counts(db, item.id)
    arg_count = get_argument_count(db, "top5_item", item.id)
    return Top5ItemResponse(
        id=item.id,
        position=item.position,
        artist=artist_to_brief(item.artist),
        like_count=likes,
        dislike_count=dislikes,
        argument_count=arg_count,
    )


def top5_to_response(db: Session, top5: Top5List) -> Top5Response:
    items = sorted(top5.items, key=lambda i: i.position)
    return Top5Response(
        id=top5.id,
        items=[top5_item_to_response(db, item) for item in items],
        updated_at=top5.updated_at,
    )


def video_to_response(video: Video) -> VideoResponse:
    return VideoResponse.model_validate(video)


def argument_to_response(db: Session, argument: Argument) -> ArgumentResponse:
    video = None
    if argument.argument_videos:
        video = video_to_response(argument.argument_videos[0].video)
    reply_count = db.query(func.count(Argument.id)).filter(
        Argument.parent_argument_id == argument.id
    ).scalar() or 0
    return ArgumentResponse(
        id=argument.id,
        author=user_to_brief(argument.author),
        target_type=argument.target_type,
        target_id=argument.target_id,
        text_content=argument.text_content,
        parent_argument_id=argument.parent_argument_id,
        video=video,
        reply_count=reply_count,
        created_at=argument.created_at,
    )


def ensure_artist_teams(db: Session, artist: Artist) -> ArtistTeam:
    team = db.query(ArtistTeam).filter(ArtistTeam.artist_id == artist.id).first()
    if not team:
        team = ArtistTeam(artist_id=artist.id)
        db.add(team)
        db.commit()
        db.refresh(team)
    return team
