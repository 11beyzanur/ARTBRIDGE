import datetime as dt
import uuid

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )

    session_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("review_sessions.id", ondelete="CASCADE"),
        unique=True,
        index=True,
    )
    viewer_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )

    conceptual_consistency_score: Mapped[int] = mapped_column(Integer)
    technical_adequacy_score: Mapped[int] = mapped_column(Integer)
    originality_score: Mapped[int] = mapped_column(Integer)

    private_comment: Mapped[str] = mapped_column(Text)
    public_summary: Mapped[str] = mapped_column(Text)

    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: dt.datetime.now(dt.timezone.utc),
    )

