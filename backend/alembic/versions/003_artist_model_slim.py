"""Slim artist model: rating, drop image/genre/bio/rank, bigint stats

Revision ID: 003
Revises: 002
Create Date: 2026-06-18
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("artists", "eddit_rating", new_column_name="rating")

    for col in ("albums_sold", "singles_sold", "spotify_monthly_listeners"):
        op.alter_column(
            "artists",
            col,
            existing_type=sa.Integer(),
            type_=sa.BigInteger(),
            existing_nullable=True,
        )

    for col in ("image_url", "genre", "region", "bio", "rank"):
        op.drop_column("artists", col)


def downgrade() -> None:
    op.add_column("artists", sa.Column("rank", sa.Integer(), nullable=True))
    op.add_column("artists", sa.Column("bio", sa.Text(), nullable=True))
    op.add_column("artists", sa.Column("region", sa.String(100), nullable=True))
    op.add_column("artists", sa.Column("genre", sa.String(100), nullable=True))
    op.add_column("artists", sa.Column("image_url", sa.String(500), nullable=True))

    for col in ("albums_sold", "singles_sold", "spotify_monthly_listeners"):
        op.alter_column(
            "artists",
            col,
            existing_type=sa.BigInteger(),
            type_=sa.Integer(),
            existing_nullable=True,
        )

    op.alter_column("artists", "rating", new_column_name="eddit_rating")
