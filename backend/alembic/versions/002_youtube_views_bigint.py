"""youtube_views to bigint

Revision ID: 002
Revises: 001
Create Date: 2026-06-18
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _youtube_views_is_bigint() -> bool:
    conn = op.get_bind()
    insp = inspect(conn)
    for col in insp.get_columns("artists"):
        if col["name"] == "youtube_views":
            type_str = str(col["type"]).upper()
            return "BIGINT" in type_str or "BigInteger".upper() in type_str
    return False


def upgrade() -> None:
    if not _youtube_views_is_bigint():
        op.alter_column(
            "artists",
            "youtube_views",
            existing_type=sa.Integer(),
            type_=sa.BigInteger(),
            existing_nullable=True,
        )


def downgrade() -> None:
    if _youtube_views_is_bigint():
        op.alter_column(
            "artists",
            "youtube_views",
            existing_type=sa.BigInteger(),
            type_=sa.Integer(),
            existing_nullable=True,
        )
