"""Local LedgerTrace API. Launch with --host 127.0.0.1."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import sessionmaker
from ledgertrace import __version__
from ledgertrace.db.base import Base
from ledgertrace.db.session import engine_from_url
from .deps import get_db
from .routes import router


@asynccontextmanager
async def lifespan(app):
    engine = engine_from_url()  # reads LEDGERTRACE_DATABASE_URL at startup
    Base.metadata.create_all(engine)
    app.state.session_factory = sessionmaker(bind=engine, expire_on_commit=False, autoflush=False)
    try:
        yield
    finally:
        engine.dispose()


app = FastAPI(title="LedgerTrace", version=__version__, lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"], allow_methods=["GET", "POST"], allow_headers=["*"])
app.include_router(router, prefix="/api")
db_session = get_db  # compatibility for earlier dependency overrides


@app.get("/health")
def health():
    return {"ok": True, "version": __version__}
