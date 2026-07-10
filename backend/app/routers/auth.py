import hashlib
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session, joinedload

from app.auth import create_access_token, get_current_user, hash_password, verify_password
from app.config import settings
from app.database import get_db
from app.email import send_password_reset_email
from app.models.password_reset import PasswordResetToken
from app.models.top5 import Top5List
from app.models.user import User
from app.schemas import RegisterRequest, TokenResponse, UserBrief

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        name=data.name,
        username=data.username,
        email=data.email,
        password_hash=hash_password(data.password),
        city=data.city,
    )
    db.add(user)
    db.flush()

    top5 = Top5List(user_id=user.id)
    db.add(top5)
    db.commit()

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form.username).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _send_reset_email_task(to_email: str, reset_url: str) -> None:
    import traceback
    print(f"[email] Attempting send to {to_email} via {settings.smtp_host}:{settings.smtp_port} user={settings.smtp_user!r} password_set={bool(settings.smtp_password)}", flush=True)
    try:
        send_password_reset_email(to_email, reset_url)
        print(f"[email] Sent successfully to {to_email}", flush=True)
    except Exception as e:
        print(f"[email error] {type(e).__name__}: {e}", flush=True)
        traceback.print_exc()


@router.post("/forgot-password", status_code=204)
def forgot_password(data: ForgotPasswordRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    # Always return 204 — never reveal whether email exists
    if not user:
        return

    # Invalidate any existing unused tokens for this user
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used == False,
    ).delete()

    raw_token = secrets.token_urlsafe(32)
    reset_token = PasswordResetToken(
        user_id=user.id,
        token_hash=_hash_token(raw_token),
        expires_at=datetime.utcnow() + timedelta(hours=1),
    )
    db.add(reset_token)
    db.commit()

    reset_url = f"{settings.frontend_url}/reset-password?token={raw_token}"
    background_tasks.add_task(_send_reset_email_task, user.email, reset_url)


@router.post("/reset-password", status_code=204)
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    token_hash = _hash_token(data.token)
    record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash,
        PasswordResetToken.used == False,
        PasswordResetToken.expires_at > datetime.utcnow(),
    ).first()

    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    user = db.query(User).filter(User.id == record.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    user.password_hash = hash_password(data.new_password)
    record.used = True
    db.commit()


@router.get("/me", response_model=UserBrief)
def me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user = (
        db.query(User)
        .options(joinedload(User.current_team_artist))
        .filter(User.id == current_user.id)
        .first()
    )
    from app.services import user_to_brief

    return user_to_brief(user)
