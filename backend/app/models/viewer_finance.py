import datetime as dt
import enum
import uuid

from sqlalchemy import DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class ViewerEarningStatus(str, enum.Enum):
    available = "available"
    paid = "paid"
    donated = "donated"


class ViewerPayoutStatus(str, enum.Enum):
    requested = "requested"
    approved = "approved"
    rejected = "rejected"
    paid = "paid"


class ViewerEarning(Base):
    __tablename__ = "viewer_earnings"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    viewer_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )
    review_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("reviews.id", ondelete="CASCADE"),
        unique=True,
        index=True,
    )
    amount_try: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(24), default=ViewerEarningStatus.available.value, index=True)

    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: dt.datetime.now(dt.timezone.utc),
    )
    paid_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    donated_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ViewerPayoutRequest(Base):
    __tablename__ = "viewer_payout_requests"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    viewer_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )
    amount_try: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(24), default=ViewerPayoutStatus.requested.value, index=True)

    iban: Mapped[str] = mapped_column(String(64))
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: dt.datetime.now(dt.timezone.utc),
    )
    processed_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

