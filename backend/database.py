"""
Backward-compatibility layer for database imports.
Re-exports from database package.
"""
from database.session import engine, Base, SessionLocal, get_db, SQLALCHEMY_DATABASE_URL, DB_PATH
from database.migrations import run_migrations

__all__ = [
    "engine",
    "Base",
    "SessionLocal",
    "get_db",
    "run_migrations",
    "SQLALCHEMY_DATABASE_URL",
    "DB_PATH"
]
