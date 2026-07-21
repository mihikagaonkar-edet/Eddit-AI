"""Add platinum_albums to artists

Revision ID: 007
Revises: 006
Create Date: 2026-07-20
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(table: str, column: str) -> bool:
    conn = op.get_bind()
    insp = inspect(conn)
    return any(c["name"] == column for c in insp.get_columns(table))


def upgrade() -> None:
    if not _column_exists("artists", "platinum_albums"):
        op.add_column("artists", sa.Column("platinum_albums", sa.Integer(), nullable=True))


def downgrade() -> None:
    if _column_exists("artists", "platinum_albums"):
        op.drop_column("artists", "platinum_albums")
