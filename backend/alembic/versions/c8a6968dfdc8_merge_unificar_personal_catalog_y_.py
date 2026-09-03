"""merge: unificar personal catalog y auditor type/roles

Revision ID: c8a6968dfdc8
Revises: 5210ed69f7c9, b3c4d5e6f7a8
Create Date: 2026-09-03 11:13:38.418734

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c8a6968dfdc8'
down_revision: Union[str, None] = ('5210ed69f7c9', 'b3c4d5e6f7a8')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
