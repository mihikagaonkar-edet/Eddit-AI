import os
import uuid as uuid_lib
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.models.user import User
from app.models.video import Video
from app.schemas import VideoResponse

router = APIRouter(prefix="/api/videos", tags=["videos"])

MAX_VIDEO_SIZE = 50 * 1024 * 1024  # 50MB
MAX_DURATION = 90


@router.post("/upload", response_model=VideoResponse)
async def upload_video(
    file: UploadFile = File(...),
    duration_seconds: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if duration_seconds and duration_seconds > MAX_DURATION:
        raise HTTPException(status_code=400, detail="Video must be 90 seconds or less")

    content = await file.read()
    if len(content) > MAX_VIDEO_SIZE:
        raise HTTPException(status_code=400, detail="File too large")

    upload_dir = Path(settings.upload_dir) / "videos"
    upload_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename or "video.webm").suffix or ".webm"
    filename = f"video_{uuid_lib.uuid4().hex}{ext}"
    filepath = upload_dir / filename

    with open(filepath, "wb") as f:
        f.write(content)

    video = Video(
        uploader_user_id=current_user.id,
        storage_path=f"/uploads/videos/{filename}",
        duration_seconds=duration_seconds,
        file_size=len(content),
    )
    db.add(video)
    db.commit()
    db.refresh(video)
    return VideoResponse.model_validate(video)
