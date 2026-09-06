"""Alembic uses sqlalchemy.url from alembic.ini (or a test override)."""
from alembic import context
import ledgertrace.db.models  # register all ten tables
from ledgertrace.db.base import Base
from ledgertrace.db.session import engine_from_url

target_metadata = Base.metadata
config = context.config


def run_migrations_offline():
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    engine = engine_from_url(config.get_main_option("sqlalchemy.url"))
    try:
        with engine.connect() as connection:
            context.configure(connection=connection, target_metadata=target_metadata, render_as_batch=True)
            with context.begin_transaction():
                context.run_migrations()
    finally:
        engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
