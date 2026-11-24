"""
AirQuiz - Database setup
SQLite via SQLAlchemy with session management.
"""

from config import DATABASE_URL
from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import NullPool

# Handlers hold a session across `await`s, so with SQLAlchemy's default pool of
# 15 connections ~15 simultaneous joins would deadlock the server. SQLite
# connections are cheap, so don't pool them at all.
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False, "timeout": 15},
    poolclass=NullPool,
)


@event.listens_for(engine, "connect")
def _sqlite_pragmas(dbapi_conn, _record):
    cur = dbapi_conn.cursor()
    cur.execute("PRAGMA journal_mode=WAL")      # readers don't block the writer
    cur.execute("PRAGMA synchronous=NORMAL")    # fsync per checkpoint, not per answer
    cur.execute("PRAGMA busy_timeout=15000")
    cur.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency — yields a scoped DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create tables if they don't exist."""
    Base.metadata.create_all(bind=engine)
