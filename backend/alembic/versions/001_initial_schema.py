"""Initial schema

Revision ID: 001
Revises:
Create Date: 2026-06-18
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "artists",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("billboard_top_10", sa.Integer()),
        sa.Column("billboard_number_1", sa.Integer()),
        sa.Column("albums_sold", sa.BigInteger()),
        sa.Column("singles_sold", sa.BigInteger()),
        sa.Column("avg_songs_per_year", sa.Float()),
        sa.Column("awards", sa.Integer()),
        sa.Column("youtube_views", sa.BigInteger()),
        sa.Column("spotify_monthly_listeners", sa.BigInteger()),
        sa.Column("rating", sa.Float()),
        sa.Column("created_at", sa.DateTime()),
        sa.Column("updated_at", sa.DateTime()),
    )
    op.create_index("ix_artists_name", "artists", ["name"])

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("username", sa.String(50), nullable=False, unique=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("city", sa.String(100)),
        sa.Column("profile_image_url", sa.String(500)),
        sa.Column("current_team_artist_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("artists.id")),
        sa.Column("created_at", sa.DateTime()),
        sa.Column("updated_at", sa.DateTime()),
    )
    op.create_index("ix_users_username", "users", ["username"])

    op.create_table(
        "top5_lists",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), unique=True),
        sa.Column("created_at", sa.DateTime()),
        sa.Column("updated_at", sa.DateTime()),
    )

    op.create_table(
        "top5_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("top5_list_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("top5_lists.id")),
        sa.Column("artist_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("artists.id")),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime()),
        sa.Column("updated_at", sa.DateTime()),
        sa.CheckConstraint("position >= 1 AND position <= 5", name="position_range"),
        sa.UniqueConstraint("top5_list_id", "position", name="unique_position_per_list"),
    )

    op.create_table(
        "artist_teams",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("artist_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("artists.id"), unique=True),
        sa.Column("created_at", sa.DateTime()),
    )

    op.create_table(
        "videos",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("uploader_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("storage_path", sa.String(500), nullable=False),
        sa.Column("thumbnail_path", sa.String(500)),
        sa.Column("duration_seconds", sa.Integer()),
        sa.Column("file_size", sa.Integer()),
        sa.Column("created_at", sa.DateTime()),
    )

    op.create_table(
        "arguments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("author_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("target_type", sa.String(20), nullable=False),
        sa.Column("target_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("text_content", sa.Text()),
        sa.Column("parent_argument_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("arguments.id")),
        sa.Column("created_at", sa.DateTime()),
        sa.Column("updated_at", sa.DateTime()),
    )

    op.create_table(
        "argument_videos",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("argument_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("arguments.id")),
        sa.Column("video_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("videos.id")),
    )

    op.create_table(
        "artist_votes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("top5_item_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("top5_items.id")),
        sa.Column("artist_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("artists.id")),
        sa.Column("vote_type", sa.String(10), nullable=False),
        sa.Column("created_at", sa.DateTime()),
        sa.UniqueConstraint("user_id", "top5_item_id", name="one_vote_per_item"),
    )


def downgrade() -> None:
    op.drop_table("artist_votes")
    op.drop_table("argument_videos")
    op.drop_table("arguments")
    op.drop_table("videos")
    op.drop_table("artist_teams")
    op.drop_table("top5_items")
    op.drop_table("top5_lists")
    op.drop_table("users")
    op.drop_index("ix_artists_name", "artists")
    op.drop_table("artists")
