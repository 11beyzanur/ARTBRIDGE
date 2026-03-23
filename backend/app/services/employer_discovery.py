from __future__ import annotations

import datetime as dt
from collections import defaultdict
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.review import Review
from app.models.review_session import ReviewSession, ReviewSessionStatus
from app.schemas.employer_discovery import EmployerCandidateItem, EmployerDiscoverySearchResponse


def _compute_progress_percent(*, completed: int, required: int) -> int:
    if required <= 0:
        return 0
    if completed >= required:
        return 100
    return int(round((completed / required) * 100))


async def search_employer_candidates(
    *,
    session: AsyncSession,
    discipline: str,
    score_min: float,
    score_max: float,
    career_ready_only: bool,
    limit: int,
) -> EmployerDiscoverySearchResponse:
    # Discipline-specific: only sessions/reviews that belong to the discipline
    # and have a non-empty public_summary (public Career-Ready analysis input)
    discipline_completed_query = (
        select(
            ReviewSession.student_id,
            ReviewSession.id.label("session_id"),
            ReviewSession.completed_at.label("completed_at"),
            ReviewSession.discipline.label("discipline"),
            ReviewSession.status.label("status"),
            Review.conceptual_consistency_score.label("conceptual"),
            Review.technical_adequacy_score.label("technical"),
            Review.originality_score.label("originality"),
            Review.public_summary.label("public_summary"),
            ReviewSession.created_at.label("created_at"),
        )
        .join(Review, Review.session_id == ReviewSession.id)
        .where(
            ReviewSession.discipline == discipline,
            ReviewSession.status == ReviewSessionStatus.completed.value,
            func.length(func.trim(Review.public_summary)) > 0,
        )
        .order_by(ReviewSession.completed_at.desc().nullslast(), ReviewSession.created_at.desc())
    )

    result = await session.execute(discipline_completed_query)
    rows = result.all()

    if not rows:
        return EmployerDiscoverySearchResponse(
            discipline=discipline,
            score_min=score_min,
            score_max=score_max,
            career_ready_only=career_ready_only,
            limit=limit,
            items=[],
            total_candidates_matched=0,
        )

    # Candidate aggregation in memory (MVP)
    by_student: dict[str, list[dict]] = defaultdict(list)
    student_ids: set[str] = set()
    for row in rows:
        student_ids.add(row.student_id)
        by_student[str(row.student_id)].append(
            {
                "session_id": row.session_id,
                "completed_at": row.completed_at,
                "conceptual": int(row.conceptual),
                "technical": int(row.technical),
                "originality": int(row.originality),
                "public_summary": row.public_summary,
            }
        )

    # Global readiness = count of completed reviews (across all disciplines) with non-empty public_summary
    readiness_query = (
        select(
            ReviewSession.student_id,
            func.count(ReviewSession.id).label("completed_reviews"),
        )
        .join(Review, Review.session_id == ReviewSession.id)
        .where(
            ReviewSession.student_id.in_(list(student_ids)),
            ReviewSession.status == ReviewSessionStatus.completed.value,
            func.length(func.trim(Review.public_summary)) > 0,
        )
        .group_by(ReviewSession.student_id)
    )

    readiness_result = await session.execute(readiness_query)
    readiness_map: dict[str, int] = {str(r.student_id): int(r.completed_reviews) for r in readiness_result.all()}

    required_reviews = settings.career_ready_required_reviews

    # Actual query
    from app.models.user import User

    users_result = await session.execute(select(User).where(User.id.in_(list(student_ids))))
    users = users_result.scalars().all()
    display_name_map: dict[str, str] = {u.id: u.display_name for u in users}

    # Discipline specific request/completion timeline (for feedback application duration)
    timeline_result = await session.execute(
        select(
            ReviewSession.student_id,
            ReviewSession.created_at,
            ReviewSession.completed_at,
            ReviewSession.status,
        )
        .where(
            ReviewSession.student_id.in_(list(student_ids)),
            ReviewSession.discipline == discipline,
        )
        .order_by(ReviewSession.student_id.asc(), ReviewSession.created_at.asc())
    )
    timeline_by_student: dict[str, list[dict]] = defaultdict(list)
    for row in timeline_result.all():
        timeline_by_student[str(row.student_id)].append(
            {
                "created_at": row.created_at,
                "completed_at": row.completed_at,
                "status": row.status,
            }
        )

    def compute_avg_feedback_weeks(student_id: str) -> Optional[float]:
        timeline = timeline_by_student.get(student_id, [])
        if not timeline:
            return None

        diffs_weeks: list[float] = []
        for i, current in enumerate(timeline):
            if current["status"] != ReviewSessionStatus.completed.value:
                continue
            completed_at = current["completed_at"]
            if completed_at is None:
                continue

            next_created = None
            for j in range(i + 1, len(timeline)):
                candidate_created = timeline[j]["created_at"]
                if candidate_created > completed_at:
                    next_created = candidate_created
                    break
            if next_created is None:
                continue

            diff_days = (next_created - completed_at).total_seconds() / 86400.0
            if diff_days <= 0:
                continue
            diffs_weeks.append(diff_days / 7.0)

        if not diffs_weeks:
            return None
        return round(sum(diffs_weeks) / len(diffs_weeks), 2)

    def build_trend_points_12m(student_sessions: list[dict]) -> list[Optional[float]]:
        now = dt.datetime.now(dt.timezone.utc)
        months: list[tuple[int, int]] = []
        for i in range(11, -1, -1):
            m = now.month - i
            y = now.year
            while m <= 0:
                m += 12
                y -= 1
            while m > 12:
                m -= 12
                y += 1
            months.append((y, m))

        bucket_scores: dict[tuple[int, int], list[float]] = defaultdict(list)
        for s in student_sessions:
            completed_at = s["completed_at"]
            if completed_at is None:
                continue
            key = (completed_at.year, completed_at.month)
            if key not in months:
                continue
            score = (s["conceptual"] + s["technical"] + s["originality"]) / 3.0
            bucket_scores[key].append(score)

        points: list[Optional[float]] = []
        for key in months:
            scores = bucket_scores.get(key, [])
            if not scores:
                points.append(None)
            else:
                points.append(round(sum(scores) / len(scores), 2))
        return points

    items: list[EmployerCandidateItem] = []
    for student_id, sessions in by_student.items():
        completed_reviews_total = readiness_map.get(student_id, 0)
        readiness_percent = _compute_progress_percent(completed=completed_reviews_total, required=required_reviews)
        is_career_ready = readiness_percent >= 100

        if career_ready_only and not is_career_ready:
            continue

        conceptual_sum = 0
        technical_sum = 0
        originality_sum = 0
        sessions_count = len(sessions)
        if sessions_count == 0:
            continue

        for s in sessions:
            conceptual_sum += s["conceptual"]
            technical_sum += s["technical"]
            originality_sum += s["originality"]

        conceptual_avg = conceptual_sum / sessions_count
        technical_avg = technical_sum / sessions_count
        originality_avg = originality_sum / sessions_count
        career_point_avg = (conceptual_avg + technical_avg + originality_avg) / 3.0

        if career_point_avg < score_min or career_point_avg > score_max:
            continue

        # Highlights: most recent public summaries (top 3)
        summaries_sorted = sorted(
            sessions,
            key=lambda x: (x["completed_at"] or dt.datetime.min.replace(tzinfo=dt.timezone.utc)),
            reverse=True,
        )
        top_summaries = [s["public_summary"] for s in summaries_sorted[:3] if (s["public_summary"] or "").strip()]
        trend_points_12m = build_trend_points_12m(sessions)
        avg_feedback_application_weeks = compute_avg_feedback_weeks(student_id)

        items.append(
            EmployerCandidateItem(
                student_id=student_id,
                display_name=display_name_map.get(student_id, ""),
                discipline=discipline,
                career_point_avg=round(float(career_point_avg), 2),
                conceptual_avg=round(float(conceptual_avg), 2),
                technical_avg=round(float(technical_avg), 2),
                originality_avg=round(float(originality_avg), 2),
                readiness_percent=readiness_percent,
                completed_reviews_total=completed_reviews_total,
                required_reviews=required_reviews,
                is_career_ready=is_career_ready,
                top_public_summaries=top_summaries,
                trend_points_12m=trend_points_12m,
                avg_feedback_application_weeks=avg_feedback_application_weeks,
            )
        )

    items_sorted = sorted(items, key=lambda x: x.career_point_avg, reverse=True)
    total_candidates_matched = len(items_sorted)

    return EmployerDiscoverySearchResponse(
        discipline=discipline,
        score_min=score_min,
        score_max=score_max,
        career_ready_only=career_ready_only,
        limit=limit,
        items=items_sorted[:limit],
        total_candidates_matched=total_candidates_matched,
    )

