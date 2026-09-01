"""consolidate roles to admin and auditor

Revision ID: 9f1a2b3c0001
Revises: 7af43e19c016
Create Date: 2026-09-01 00:00:00

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "9f1a2b3c0001"
down_revision: Union[str, None] = "7af43e19c016"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Colapsar a dos perfiles: operaciones y supervisor pasan a administrador.
    op.execute("UPDATE users SET role = 'admin' WHERE role IN ('operations', 'supervisor')")


def downgrade() -> None:
    # No reversible: no podemos recuperar el rol original de cada usuario.
    pass
