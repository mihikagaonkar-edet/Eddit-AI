from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.database import get_db
from app.models.top5 import Top5Item, Top5List
from app.models.user import User
from app.schemas import Top5Response, Top5UpdateRequest
from app.services import top5_to_response

router = APIRouter(prefix="/api", tags=["top5"])


def _get_user_top5(db: Session, username: str) -> Top5List:
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    top5 = (
        db.query(Top5List)
        .options(joinedload(Top5List.items).joinedload(Top5Item.artist))
        .filter(Top5List.user_id == user.id)
        .first()
    )
    if not top5:
        raise HTTPException(status_code=404, detail="Top 5 not found")
    return top5


@router.get("/users/{username}/top5", response_model=Top5Response)
def get_user_top5(username: str, db: Session = Depends(get_db)):
    top5 = _get_user_top5(db, username)
    return top5_to_response(db, top5)


@router.put("/users/me/top5", response_model=Top5Response)
def update_my_top5(
    data: Top5UpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    positions = [item.position for item in data.items]
    if len(set(positions)) != 5:
        raise HTTPException(status_code=400, detail="Positions must be unique 1-5")

    artist_ids = [item.artist_id for item in data.items]
    if len(set(artist_ids)) != 5:
        raise HTTPException(status_code=400, detail="Each artist can only appear once")

    top5 = db.query(Top5List).filter(Top5List.user_id == current_user.id).first()
    if not top5:
        top5 = Top5List(user_id=current_user.id)
        db.add(top5)
        db.flush()

    db.query(Top5Item).filter(Top5Item.top5_list_id == top5.id).delete()

    for item in data.items:
        db.add(
            Top5Item(
                top5_list_id=top5.id,
                artist_id=item.artist_id,
                position=item.position,
            )
        )

    db.commit()
    db.refresh(top5)
    top5 = (
        db.query(Top5List)
        .options(joinedload(Top5List.items).joinedload(Top5Item.artist))
        .filter(Top5List.id == top5.id)
        .first()
    )
    return top5_to_response(db, top5)
