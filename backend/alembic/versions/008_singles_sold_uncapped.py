"""Add singles_sold_uncapped to artists

Revision ID: 008
Revises: 007
Create Date: 2026-07-21
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(table: str, column: str) -> bool:
    conn = op.get_bind()
    insp = inspect(conn)
    return any(c["name"] == column for c in insp.get_columns(table))


def upgrade() -> None:
    if not _column_exists("artists", "singles_sold_uncapped"):
        op.add_column(
            "artists",
            sa.Column("singles_sold_uncapped", sa.Boolean(), nullable=False, server_default=sa.false()),
        )


def downgrade() -> None:
    if _column_exists("artists", "singles_sold_uncapped"):
        op.drop_column("artists", "singles_sold_uncapped")
