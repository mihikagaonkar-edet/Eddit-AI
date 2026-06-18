import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Float, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Artist(Base):
    __tablename__ = "artists"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    billboard_top_10: Mapped[int | None] = mapped_column(Integer, nullable=True)
    billboard_number_1: Mapped[int | None] = mapped_column(Integer, nullable=True)
    albums_sold: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    singles_sold: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    avg_songs_per_year: Mapped[float | None] = mapped_column(Float, nullable=True)
    awards: Mapped[int | None] = mapped_column(Integer, nullable=True)
    youtube_views: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    spotify_monthly_listeners: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    rating: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    team = relationship("ArtistTeam", back_populates="artist", uselist=False)
