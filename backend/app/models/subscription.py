import datetime as dt
import enum
import uuid

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class StudentSubscriptionStatus(str, enum.Enum):
    active = "ACTIVE"
    pending = "PENDING"
    unpaid = "UNPAID"
    cancelled = "CANCELED"
    expired = "EXPIRED"


class StudentSubscription(Base):
    __tablename__ = "student_subscriptions"

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

    pricing_plan_reference_code: Mapped[str] = mapped_column(String(128), index=True)

    checkout_token: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)

    subscription_reference_code: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        index=True,
    )

    order_reference_code: Mapped[str | None] = mapped_column(String(255), nullable=True)
    customer_reference_code: Mapped[str | None] = mapped_column(String(255), nullable=True)

    status: Mapped[str] = mapped_column(String(32), index=True, default=StudentSubscriptionStatus.pending.value)

    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: dt.datetime.now(dt.timezone.utc),
    )
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: dt.datetime.now(dt.timezone.utc),
        onupdate=lambda: dt.datetime.now(dt.timezone.utc),
    )

