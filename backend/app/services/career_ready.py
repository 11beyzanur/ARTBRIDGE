from __future__ import annotations

import datetime as dt
from typing import Any

import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.review import Review
from app.models.review_session import ReviewSession, ReviewSessionStatus
from app.models.user import User
from app.schemas.career_ready import (
    CareerReadyMineResponse,
    CareerReadyShareResponse,
)


def _compute_progress_percent(*, completed_reviews: int, required_reviews: int) -> int:
    if required_reviews <= 0:
        return 0
    percent = (completed_reviews / required_reviews) * 100
    if percent >= 100:
        return 100
    return int(round(percent))


def _decode_share_token(token: str) -> dict[str, Any]:
    payload = jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm],
        issuer=settings.jwt_issuer,
    )
    scope = str(payload.get("scope") or "")
    if scope != "career_ready_share":
        raise jwt.PyJWTError("Invalid token scope")
    return payload


def create_share_token(*, student_id: str) -> tuple[str, int]:
    expires_at = dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=settings.career_ready_share_expires_days)
    payload = {
        "sub": student_id,
        "scope": "career_ready_share",
        "iss": settings.jwt_issuer,
        "exp": expires_at,
    }
    token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    expires_in_seconds = int((expires_at - dt.datetime.now(dt.timezone.utc)).total_seconds())
    return token, expires_in_seconds


async def get_career_ready_mine(
    *,
    session: AsyncSession,
    student_id: str,
) -> CareerReadyMineResponse:
    required_reviews = settings.career_ready_required_reviews

    user_result = await session.execute(select(User).where(User.id == student_id))
    user = user_result.scalar_one_or_none()
    display_name = user.display_name if user is not None else ""

    review_sessions_result = await session.execute(
        select(ReviewSession)
        .where(ReviewSession.student_id == student_id, ReviewSession.status == ReviewSessionStatus.completed.value)
        .order_by(ReviewSession.completed_at.desc())
    )
    review_sessions = list(review_sessions_result.scalars().all())
    session_ids = [rs.id for rs in review_sessions]

    reviews_map: dict[str, Review] = {}
    if session_ids:
        reviews_result = await session.execute(select(Review).where(Review.session_id.in_(session_ids)))
        for review in reviews_result.scalars().all():
            reviews_map[review.session_id] = review

    items = []
    avg_score_sum = 0.0

    for rs in review_sessions:
        review = reviews_map.get(rs.id)
        if review is None:
            continue
        if not (review.public_summary or "").strip():
            continue

        avg_score = round(
            (review.conceptual_consistency_score + review.technical_adequacy_score + review.originality_score) / 3.0,
            2,
        )
        avg_score_sum += avg_score

        items.append(
            {
                "session_id": rs.id,
                "discipline": rs.discipline,
                "completed_at": rs.completed_at or rs.created_at,
                "public_summary": review.public_summary,
                "conceptual_consistency_score": review.conceptual_consistency_score,
                "technical_adequacy_score": review.technical_adequacy_score,
                "originality_score": review.originality_score,
                "avg_score": avg_score,
            }
        )

    completed_reviews = len(items)
    progress_percent = _compute_progress_percent(completed_reviews=completed_reviews, required_reviews=required_reviews)
    avg_score = None
    if completed_reviews > 0:
        avg_score = round(avg_score_sum / completed_reviews, 2)

    return CareerReadyMineResponse(
        display_name=display_name or "Öğrenci",
        required_reviews=required_reviews,
        completed_reviews=completed_reviews,
        progress_percent=progress_percent,
        avg_score=avg_score,
        items=items,
    )


async def get_career_ready_share(
    *,
    session: AsyncSession,
    token: str,
) -> CareerReadyShareResponse:
    payload = _decode_share_token(token)
    student_id = str(payload.get("sub") or "")
    if not student_id:
        raise jwt.PyJWTError("Invalid token")

    user_result = await session.execute(select(User).where(User.id == student_id))
    user = user_result.scalar_one_or_none()
    display_name = user.display_name if user is not None else "Öğrenci"

    required_reviews = settings.career_ready_required_reviews

    review_sessions_result = await session.execute(
        select(ReviewSession)
        .where(ReviewSession.student_id == student_id, ReviewSession.status == ReviewSessionStatus.completed.value)
        .order_by(ReviewSession.completed_at.desc())
    )
    review_sessions = list(review_sessions_result.scalars().all())
    session_ids = [rs.id for rs in review_sessions]

    reviews_map: dict[str, Review] = {}
    if session_ids:
        reviews_result = await session.execute(select(Review).where(Review.session_id.in_(session_ids)))
        for review in reviews_result.scalars().all():
            reviews_map[review.session_id] = review

    items = []
    avg_score_sum = 0.0

    for rs in review_sessions:
        review = reviews_map.get(rs.id)
        if review is None:
            continue
        if not (review.public_summary or "").strip():
            continue

        avg_score = round(
            (review.conceptual_consistency_score + review.technical_adequacy_score + review.originality_score) / 3.0,
            2,
        )
        avg_score_sum += avg_score

        items.append(
            {
                "session_id": rs.id,
                "discipline": rs.discipline,
                "completed_at": rs.completed_at or rs.created_at,
                "public_summary": review.public_summary,
                "conceptual_consistency_score": review.conceptual_consistency_score,
                "technical_adequacy_score": review.technical_adequacy_score,
                "originality_score": review.originality_score,
                "avg_score": avg_score,
            }
        )

    completed_reviews = len(items)
    progress_percent = _compute_progress_percent(completed_reviews=completed_reviews, required_reviews=required_reviews)

    avg_score = None
    if completed_reviews > 0:
        avg_score = round(avg_score_sum / completed_reviews, 2)

    return CareerReadyShareResponse(
        share_display_name=display_name,
        required_reviews=required_reviews,
        completed_reviews=completed_reviews,
        progress_percent=progress_percent,
        avg_score=avg_score,
        items=items,
    )

