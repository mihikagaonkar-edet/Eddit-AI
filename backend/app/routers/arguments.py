from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user, get_optional_user
from app.database import get_db
from app.models.argument import Argument, ArgumentVideo
from app.models.user import User
from app.models.video import Video
from app.schemas import ArgumentCreate, ArgumentResponse
from app.services import argument_to_response

router = APIRouter(prefix="/api/arguments", tags=["arguments"])


def _load_argument_query(db: Session):
    return db.query(Argument).options(
        joinedload(Argument.author).joinedload(User.current_team_artist),
        joinedload(Argument.argument_videos).joinedload(ArgumentVideo.video),
    )


@router.get("", response_model=list[ArgumentResponse])
def list_arguments(
    target_type: str,
    target_id: UUID,
    db: Session = Depends(get_db),
):
    args = (
        _load_argument_query(db)
        .filter(
            Argument.target_type == target_type,
            Argument.target_id == target_id,
            Argument.parent_argument_id.is_(None),
        )
        .order_by(Argument.created_at.desc())
        .all()
    )
    return [argument_to_response(db, a) for a in args]


@router.get("/{argument_id}/replies", response_model=list[ArgumentResponse])
def get_replies(argument_id: UUID, db: Session = Depends(get_db)):
    args = (
        _load_argument_query(db)
        .filter(Argument.parent_argument_id == argument_id)
        .order_by(Argument.created_at.asc())
        .all()
    )
    return [argument_to_response(db, a) for a in args]


@router.post("", response_model=ArgumentResponse)
def create_argument(
    data: ArgumentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not data.text_content and not data.video_id:
        raise HTTPException(status_code=400, detail="Argument needs text or video")

    argument = Argument(
        author_user_id=current_user.id,
        target_type=data.target_type,
        target_id=data.target_id,
        text_content=data.text_content,
        parent_argument_id=data.parent_argument_id,
    )
    db.add(argument)
    db.flush()

    if data.video_id:
        video = db.query(Video).filter(Video.id == data.video_id).first()
        if not video or video.uploader_user_id != current_user.id:
            raise HTTPException(status_code=400, detail="Invalid video")
        db.add(ArgumentVideo(argument_id=argument.id, video_id=video.id))

    db.commit()
    argument = _load_argument_query(db).filter(Argument.id == argument.id).first()
    return argument_to_response(db, argument)
