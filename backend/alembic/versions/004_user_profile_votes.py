"""Add user_profile_votes table

Revision ID: 004
Revises: 003
Create Date: 2026-06-27
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect
from sqlalchemy.dialects.postgresql import UUID

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(table_name: str) -> bool:
    conn = op.get_bind()
    insp = inspect(conn)
    return table_name in insp.get_table_names()


def upgrade() -> None:
    if not _table_exists("user_profile_votes"):
        op.create_table(
            "user_profile_votes",
            sa.Column("id", UUID(as_uuid=True), primary_key=True),
            sa.Column("voter_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("target_user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("vote_type", sa.String(10), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.UniqueConstraint("voter_id", "target_user_id", name="one_profile_vote_per_user"),
        )


def downgrade() -> None:
    if _table_exists("user_profile_votes"):
        op.drop_table("user_profile_votes")
