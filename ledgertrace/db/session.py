"""SQLite sessions with enforced foreign keys; timestamps are naive UTC."""
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator
from sqlalchemy import Engine, create_engine, event
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session, sessionmaker

DEFAULT_URL = "sqlite:///data/ledgertrace.db"


def create_data_dir() -> None:
    Path("data").mkdir(parents=True, exist_ok=True)


def engine_from_url(url: str | None = None) -> Engine:
    db_url = make_url(url or DEFAULT_URL)
    is_sqlite = db_url.get_backend_name() == "sqlite"
    if is_sqlite and db_url.database not in (None, "", ":memory:"):
        Path(db_url.database).parent.mkdir(parents=True, exist_ok=True)
    result = create_engine(
        db_url, connect_args={"check_same_thread": False} if is_sqlite else {}
    )
    if is_sqlite:
        @event.listens_for(result, "connect")
        def enable_foreign_keys(connection, _record):
            connection.execute("PRAGMA foreign_keys=ON")
    return result


engine = engine_from_url()
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False, autoflush=False)


def init_engine(url: str | None = None) -> Engine:
    """Rebind SessionLocal, normally before opening any sessions."""
    global engine
    engine.dispose()
    engine = engine_from_url(url)
    SessionLocal.configure(bind=engine)
    return engine


@contextmanager
def get_session() -> Iterator[Session]:
    with SessionLocal() as session:
        try:
            yield session
            session.commit()
        except BaseException:
            session.rollback()
            raise
