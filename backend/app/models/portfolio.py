import datetime as dt
import enum
import uuid

from sqlalchemy import BigInteger, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class PortfolioStatus(str, enum.Enum):
    pending_upload = "pending_upload"
    uploaded = "uploaded"
    queued_for_review = "queued_for_review"
    under_review = "under_review"
    reviewed = "reviewed"


class Portfolio(Base):
    __tablename__ = "portfolios"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    student_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )

    discipline: Mapped[str] = mapped_column(String(64), index=True)
    technique: Mapped[str] = mapped_column(String(64))
    school: Mapped[str] = mapped_column(String(128))

    asset_key: Mapped[str] = mapped_column(String(512), unique=True, index=True)
    content_type: Mapped[str] = mapped_column(String(128))
    file_size: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    status: Mapped[str] = mapped_column(String(32), index=True, default=PortfolioStatus.pending_upload.value)

    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: dt.datetime.now(dt.timezone.utc),
    )
    uploaded_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

