"""add must_change_password to users

Revision ID: c9d8e7f6a5b4
Revises: c8a6968dfdc8
Create Date: 2026-09-04
"""

import sqlalchemy as sa
from alembic import op

revision = "c9d8e7f6a5b4"
down_revision = "c8a6968dfdc8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "must_change_password", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "must_change_password")
