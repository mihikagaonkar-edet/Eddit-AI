import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserProfileVote(Base):
    __tablename__ = "user_profile_votes"
    __table_args__ = (UniqueConstraint("voter_id", "target_user_id", name="one_profile_vote_per_user"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    voter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    target_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    vote_type: Mapped[str] = mapped_column(String(10), nullable=False)  # "like" or "dislike"
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    voter = relationship("User", foreign_keys=[voter_id])
    target_user = relationship("User", foreign_keys=[target_user_id])
