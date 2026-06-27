from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Literal

from app.auth import get_current_user
from app.database import get_db
from app.models.user import User
from app.models.user_profile_vote import UserProfileVote

router = APIRouter(prefix="/api/profile-votes", tags=["profile votes"])


class ProfileVoteRequest(BaseModel):
    target_user_id: UUID
    vote_type: Literal["like", "dislike"]


@router.post("")
def cast_profile_vote(
    data: ProfileVoteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.target_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot vote on your own profile")

    target = db.query(User).filter(User.id == data.target_user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    existing = (
        db.query(UserProfileVote)
        .filter(
            UserProfileVote.voter_id == current_user.id,
            UserProfileVote.target_user_id == data.target_user_id,
        )
        .first()
    )

    if existing:
        if existing.vote_type == data.vote_type:
            db.delete(existing)
            db.commit()
            return {"message": "Vote removed", "my_vote": None}
        existing.vote_type = data.vote_type
        db.commit()
        return {"message": "Vote updated", "my_vote": data.vote_type}

    vote = UserProfileVote(
        voter_id=current_user.id,
        target_user_id=data.target_user_id,
        vote_type=data.vote_type,
    )
    db.add(vote)
    db.commit()
    return {"message": "Vote recorded", "my_vote": data.vote_type}
