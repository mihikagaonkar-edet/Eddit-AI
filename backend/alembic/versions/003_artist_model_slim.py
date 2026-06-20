"""Slim artist model: rating, drop image/genre/bio/rank, bigint stats

Revision ID: 003
Revises: 002
Create Date: 2026-06-18
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _artist_column_names() -> set[str]:
    conn = op.get_bind()
    insp = inspect(conn)
    return {col["name"] for col in insp.get_columns("artists")}


def _is_bigint_column(column_name: str) -> bool:
    conn = op.get_bind()
    insp = inspect(conn)
    for col in insp.get_columns("artists"):
        if col["name"] == column_name:
            type_str = str(col["type"]).upper()
            return "BIGINT" in type_str or "BigInteger".upper() in type_str
    return False


def upgrade() -> None:
    columns = _artist_column_names()

    if "eddit_rating" in columns:
        op.alter_column("artists", "eddit_rating", new_column_name="rating")

    for col in ("albums_sold", "singles_sold", "spotify_monthly_listeners"):
        if col in columns and not _is_bigint_column(col):
            op.alter_column(
                "artists",
                col,
                existing_type=sa.Integer(),
                type_=sa.BigInteger(),
                existing_nullable=True,
            )

    for col in ("image_url", "genre", "region", "bio", "rank"):
        if col in columns:
            op.drop_column("artists", col)


def downgrade() -> None:
    columns = _artist_column_names()

    if "rank" not in columns:
        op.add_column("artists", sa.Column("rank", sa.Integer(), nullable=True))
    if "bio" not in columns:
        op.add_column("artists", sa.Column("bio", sa.Text(), nullable=True))
    if "region" not in columns:
        op.add_column("artists", sa.Column("region", sa.String(100), nullable=True))
    if "genre" not in columns:
        op.add_column("artists", sa.Column("genre", sa.String(100), nullable=True))
    if "image_url" not in columns:
        op.add_column("artists", sa.Column("image_url", sa.String(500), nullable=True))

    for col in ("albums_sold", "singles_sold", "spotify_monthly_listeners"):
        if col in columns and _is_bigint_column(col):
            op.alter_column(
                "artists",
                col,
                existing_type=sa.BigInteger(),
                type_=sa.Integer(),
                existing_nullable=True,
            )

    if "rating" in columns and "eddit_rating" not in columns:
        op.alter_column("artists", "rating", new_column_name="eddit_rating")
