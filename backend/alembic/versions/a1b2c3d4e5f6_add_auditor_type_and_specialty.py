"""add auditor type and specialty

Revision ID: a1b2c3d4e5f6
Revises: 9f1a2b3c0001
Create Date: 2026-09-02 00:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "9f1a2b3c0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "auditors",
        sa.Column("auditor_type", sa.String(20), server_default="externo", nullable=False),
    )
    op.add_column("auditors", sa.Column("specialty", sa.String(120), nullable=True))


def downgrade() -> None:
    op.drop_column("auditors", "specialty")
    op.drop_column("auditors", "auditor_type")
