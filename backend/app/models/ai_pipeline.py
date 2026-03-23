import datetime as dt
import enum
import uuid
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class ModerationStatus(str, enum.Enum):
    pending = "pending"
    safe = "safe"
    flagged = "flagged"
    blocked = "blocked"


class EmbeddingStatus(str, enum.Enum):
    pending = "pending"
    ready = "ready"
    failed = "failed"


class JobStatus(str, enum.Enum):
    queued = "queued"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class AIPipelineJobType(str, enum.Enum):
    moderation = "moderation"
    tagging = "tagging"
    captioning = "captioning"
    embedding = "embedding"


class PortfolioAIMetadata(Base):
    __tablename__ = "portfolio_ai_metadata"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    portfolio_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("portfolios.id", ondelete="CASCADE"),
        unique=True,
        index=True,
    )
    student_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )
    discipline: Mapped[str] = mapped_column(String(64), index=True)
    technique: Mapped[str] = mapped_column(String(64), index=True)

    tags_csv: Mapped[str] = mapped_column(Text, default="")
    auto_caption: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    quality_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    nsfw_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    moderation_status: Mapped[str] = mapped_column(String(24), default=ModerationStatus.pending.value, index=True)
    embedding_status: Mapped[str] = mapped_column(String(24), default=EmbeddingStatus.pending.value, index=True)

    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: dt.datetime.now(dt.timezone.utc),
    )
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: dt.datetime.now(dt.timezone.utc),
        onupdate=lambda: dt.datetime.now(dt.timezone.utc),
    )


class AIPipelineJob(Base):
    __tablename__ = "ai_pipeline_jobs"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    portfolio_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("portfolios.id", ondelete="CASCADE"),
        index=True,
    )
    student_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )
    job_type: Mapped[str] = mapped_column(String(32), index=True)
    status: Mapped[str] = mapped_column(String(24), default=JobStatus.queued.value, index=True)

    payload_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    result_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    attempt_count: Mapped[int] = mapped_column(Integer, default=0)

    scheduled_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: dt.datetime.now(dt.timezone.utc),
    )
    processed_at: Mapped[Optional[dt.datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

