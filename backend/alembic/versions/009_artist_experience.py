"""Add experience to artists

Revision ID: 009
Revises: 008
Create Date: 2026-07-30
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "009"
down_revision: Union[str, None] = "008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(table: str, column: str) -> bool:
    conn = op.get_bind()
    insp = inspect(conn)
    return any(c["name"] == column for c in insp.get_columns(table))


def upgrade() -> None:
    if not _column_exists("artists", "experience"):
        op.add_column("artists", sa.Column("experience", sa.String(50), nullable=True))


def downgrade() -> None:
    if _column_exists("artists", "experience"):
        op.drop_column("artists", "experience")
