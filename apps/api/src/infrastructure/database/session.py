from collections.abc import Generator
from pathlib import Path

from sqlalchemy import MetaData, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from infrastructure.database.config import settings

# Without this, autogenerate emits unnamed constraints, which batch migrations
# reject outright and which downgrades cannot drop. Index names match what
# SQLAlchemy already produced, so existing databases keep theirs.
NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)


_connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=_connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def init_db() -> None:
    """Bring the database up to the latest Alembic revision.

    Migrations own the schema, so this replaces the previous create_all: that
    only ever created missing tables and silently skipped new columns on
    tables that already existed.
    """
    from alembic import command
    from alembic.config import Config

    import infrastructure.models  # noqa: F401

    alembic_ini = Path(__file__).resolve().parents[3] / "alembic.ini"
    config = Config(str(alembic_ini))
    command.upgrade(config, "head")
