"""Expand user roles for 3-tier RBAC

Revision ID: 005_expand_rbac_roles
Revises: 004_add_cascade_deletes
Create Date: 2026-02-09

Expands the User.role column from ('admin', 'user') to a proper 5-role
RBAC hierarchy: super_admin, org_admin, project_admin, editor, viewer.
Migrates existing 'admin' -> 'super_admin' and 'user' -> 'editor'.
"""
from alembic import op

# revision identifiers, used by Alembic.
revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop the old CHECK constraint
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_role")

    # Migrate existing roles
    op.execute("UPDATE users SET role = 'super_admin' WHERE role = 'admin'")
    op.execute("UPDATE users SET role = 'editor' WHERE role = 'user'")

    # Add new CHECK constraint with 5 roles
    op.execute(
        "ALTER TABLE users ADD CONSTRAINT chk_role "
        "CHECK (role IN ('super_admin', 'org_admin', 'project_admin', 'editor', 'viewer'))"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_role")

    # Revert roles
    op.execute("UPDATE users SET role = 'admin' WHERE role = 'super_admin'")
    op.execute("UPDATE users SET role = 'user' WHERE role IN ('org_admin', 'project_admin', 'editor', 'viewer')")

    op.execute(
        "ALTER TABLE users ADD CONSTRAINT chk_role "
        "CHECK (role IN ('admin', 'user'))"
    )
