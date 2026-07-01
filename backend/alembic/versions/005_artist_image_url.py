"""Add image_url to artists

Revision ID: 005
Revises: 004
Create Date: 2026-06-28
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(table: str, column: str) -> bool:
    conn = op.get_bind()
    insp = inspect(conn)
    return any(c["name"] == column for c in insp.get_columns(table))


def upgrade() -> None:
    if not _column_exists("artists", "image_url"):
        op.add_column("artists", sa.Column("image_url", sa.String(500), nullable=True))


def downgrade() -> None:
    if _column_exists("artists", "image_url"):
        op.drop_column("artists", "image_url")
