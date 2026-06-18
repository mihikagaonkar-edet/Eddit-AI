from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models.top5 import Top5Item
from app.models.user import User
from app.models.vote import ArtistVote
from app.schemas import VoteRequest

router = APIRouter(prefix="/api/votes", tags=["votes"])


@router.post("")
def cast_vote(
    data: VoteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(Top5Item).filter(Top5Item.id == data.top5_item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Top 5 item not found")

    existing = (
        db.query(ArtistVote)
        .filter(
            ArtistVote.user_id == current_user.id,
            ArtistVote.top5_item_id == data.top5_item_id,
        )
        .first()
    )

    if existing:
        if existing.vote_type == data.vote_type:
            db.delete(existing)
            db.commit()
            return {"message": "Vote removed"}
        existing.vote_type = data.vote_type
        db.commit()
        return {"message": "Vote updated"}

    vote = ArtistVote(
        user_id=current_user.id,
        top5_item_id=data.top5_item_id,
        artist_id=item.artist_id,
        vote_type=data.vote_type,
    )
    db.add(vote)
    db.commit()
    return {"message": "Vote recorded"}


@router.delete("/{top5_item_id}")
def remove_vote(
    top5_item_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = (
        db.query(ArtistVote)
        .filter(
            ArtistVote.user_id == current_user.id,
            ArtistVote.top5_item_id == top5_item_id,
        )
        .first()
    )
    if existing:
        db.delete(existing)
        db.commit()
    return {"message": "Vote removed"}
