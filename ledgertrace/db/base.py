"""Shared declarative base. All timestamps represent timezone-naive UTC."""
from datetime import UTC, datetime
from sqlalchemy import DateTime, Text, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def utcnow() -> datetime:
    """Return UTC with no timezone marker for SQLite DateTime storage."""
    return datetime.now(UTC).replace(tzinfo=None)


class Base(DeclarativeBase):
    type_annotation_map = {str: Text}
    created_in_system_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), default=utcnow, server_default=func.current_timestamp()
    )
