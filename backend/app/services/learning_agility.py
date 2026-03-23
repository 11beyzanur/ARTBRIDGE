from __future__ import annotations

import datetime as dt
from collections import defaultdict
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.review import Review
from app.models.review_session import ReviewSession, ReviewSessionStatus
TARGET_DAYS_DEFAULT = 14.0


def _clamp(value: float, *, min_value: float, max_value: float) -> float:
    if value < min_value:
        return min_value
    if value > max_value:
        return max_value
    return value


def compute_agility_score(*, target_days: float, days_to_apply: float) -> float:
    if days_to_apply <= 0:
        return 0.0
    # Faster application (smaller days_to_apply) yields higher score
    score = 100.0 * (target_days / days_to_apply)
    return round(_clamp(score, min_value=0.0, max_value=100.0), 2)


async def get_learning_agility_mine(
    *,
    session: AsyncSession,
    student_id: str,
    target_days: float = TARGET_DAYS_DEFAULT,
    window_days: Optional[float] = None,
) -> dict:
    # Fetch sessions for all disciplines ordered by discipline then request time
    sessions_result = await session.execute(
        select(ReviewSession)
        .where(ReviewSession.student_id == student_id)
        .order_by(ReviewSession.discipline.asc(), ReviewSession.created_at.asc())
    )
    sessions = list(sessions_result.scalars().all())

    # Fetch reviews to enrich completed transitions with score averages
    session_ids = [rs.id for rs in sessions if rs.status == ReviewSessionStatus.completed.value]
    reviews_by_session_id: dict[str, Review] = {}
    if session_ids:
        reviews_result = await session.execute(
            select(Review).where(Review.session_id.in_(session_ids))
        )
        for review in reviews_result.scalars().all():
            reviews_by_session_id[review.session_id] = review

    # Group sessions by discipline (preserves order)
    by_discipline: dict[str, list[ReviewSession]] = defaultdict(list)
    for rs in sessions:
        by_discipline[rs.discipline].append(rs)

    disciplines_out = []
    transitions_count = 0
    overall_days_sum = 0.0
    overall_score_sum = 0.0

    cutoff: Optional[dt.datetime] = None
    if window_days is not None:
        cutoff = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=window_days)

    for discipline, disc_sessions in by_discipline.items():
        transitions = []

        for i, current in enumerate(disc_sessions):
            if current.status != ReviewSessionStatus.completed.value:
                continue
            if current.completed_at is None:
                continue
            if cutoff is not None and current.completed_at < cutoff:
                # Keep transition logic consistent but only score completed work inside the window
                continue

            completed_at = current.completed_at

            # Find the next request created strictly after completed_at
            next_session = None
            for j in range(i + 1, len(disc_sessions)):
                candidate = disc_sessions[j]
                if candidate.created_at > completed_at:
                    next_session = candidate
                    break
            if next_session is None:
                continue

            next_created_at = next_session.created_at
            diff_days = (next_created_at - completed_at).total_seconds() / 86400.0
            if diff_days <= 0:
                continue

            agility_score = compute_agility_score(target_days=target_days, days_to_apply=diff_days)

            review = reviews_by_session_id.get(current.id)
            conceptual_avg = int(review.conceptual_consistency_score) if review else None
            technical_avg = int(review.technical_adequacy_score) if review else None
            originality_avg = int(review.originality_score) if review else None

            transitions.append(
                {
                    "from_session_id": current.id,
                    "to_session_id": next_session.id,
                    "completed_at": current.completed_at,
                    "next_request_created_at": next_created_at,
                    "days_to_apply": round(diff_days, 2),
                    "agility_score": agility_score,
                    "conceptual_avg": conceptual_avg,
                    "technical_avg": technical_avg,
                    "originality_avg": originality_avg,
                }
            )

        disciplines_count = len(transitions)
        avg_days = None
        avg_score = None
        if disciplines_count > 0:
            avg_days = round(sum(t["days_to_apply"] for t in transitions) / disciplines_count, 2)
            avg_score = round(sum(t["agility_score"] for t in transitions) / disciplines_count, 2)
            transitions_count += disciplines_count
            overall_days_sum += sum(t["days_to_apply"] for t in transitions)
            overall_score_sum += sum(t["agility_score"] for t in transitions)

        disciplines_out.append(
            {
                "discipline": discipline,
                "transitions": transitions,
                "avg_days_to_apply": avg_days,
                "avg_agility_score": avg_score,
            }
        )

    overall_avg_days = None
    overall_avg_score = None
    if transitions_count > 0:
        overall_avg_days = round(overall_days_sum / transitions_count, 2)
        overall_avg_score = round(overall_score_sum / transitions_count, 2)

    return {
        "target_days": round(float(target_days), 2),
        "disciplines": disciplines_out,
        "overall_avg_days_to_apply": overall_avg_days,
        "overall_avg_agility_score": overall_avg_score,
        "transitions_count": transitions_count,
    }

