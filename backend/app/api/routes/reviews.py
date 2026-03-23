import datetime as dt
import unicodedata

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import require_active_student_subscription, require_roles
from app.db.session import get_session
from app.models.portfolio import Portfolio, PortfolioStatus
from app.models.review import Review
from app.models.review_session import ReviewSession, ReviewSessionStatus
from app.models.viewer_finance import ViewerEarning, ViewerEarningStatus
from app.models.user import UserRole
from app.schemas.reviews import (
    RequestReviewPayload,
    RequestReviewResponse,
    ReviewTaskResponse,
    SubmitReviewRequest,
    SubmitReviewResponse,
    StudentReviewsResponse,
)
from app.services.s3 import generate_presigned_get_url
from app.core.config import settings


reviews_router = APIRouter(tags=["reviews"])


DISCIPLINE_ALIASES = {
    "resim": "illustration",
    "illustrasyon": "illustration",
    "illüstrasyon": "illustration",
    "ilustrasyon": "illustration",
    "illustration": "illustration",
    "grafik tasarim": "graphic_design",
    "grafik tasarım": "graphic_design",
    "graphic design": "graphic_design",
    "heykel": "sculpture",
    "sculpture": "sculpture",
    "endustriyel tasarim": "industrial_design",
    "endüstriyel tasarım": "industrial_design",
    "industrial design": "industrial_design",
    "3d animasyon": "3d_animation",
    "3d animation": "3d_animation",
    "animasyon": "3d_animation",
}


def _normalize_text(value: str) -> str:
    lowered = value.strip().lower()
    tr_fixed = (
        lowered.replace("ı", "i")
        .replace("ğ", "g")
        .replace("ş", "s")
        .replace("ç", "c")
        .replace("ö", "o")
        .replace("ü", "u")
    )
    normalized = unicodedata.normalize("NFKD", tr_fixed)
    ascii_only = normalized.encode("ascii", "ignore").decode("ascii")
    return " ".join(ascii_only.split())


def _canonical_discipline(value: str) -> str:
    normalized = _normalize_text(value)
    return DISCIPLINE_ALIASES.get(normalized, normalized)


@reviews_router.post(
    "/reviews/request",
    response_model=RequestReviewResponse,
    status_code=status.HTTP_201_CREATED,
)
async def request_review(
    payload: RequestReviewPayload,
    session: AsyncSession = Depends(get_session),
    student=Depends(require_active_student_subscription),
) -> RequestReviewResponse:
    result = await session.execute(
        select(Portfolio).where(Portfolio.id == payload.portfolio_id, Portfolio.student_id == student.id)
    )
    portfolio = result.scalar_one_or_none()
    if portfolio is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Portfolio not found")

    if portfolio.status != PortfolioStatus.uploaded.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Portfolio is not ready for review",
        )

    existing = await session.execute(
        select(ReviewSession).where(
            ReviewSession.portfolio_id == portfolio.id,
            ReviewSession.status.in_([ReviewSessionStatus.queued.value, ReviewSessionStatus.assigned.value]),
        )
    )
    existing_session = existing.scalar_one_or_none()
    if existing_session is not None:
        return RequestReviewResponse(session_id=existing_session.id, status=existing_session.status)

    review_session = ReviewSession(
        student_id=student.id,
        portfolio_id=portfolio.id,
        discipline=portfolio.discipline,
        status=ReviewSessionStatus.queued.value,
    )
    session.add(review_session)

    portfolio.status = PortfolioStatus.queued_for_review.value
    await session.commit()
    await session.refresh(review_session)

    return RequestReviewResponse(session_id=review_session.id, status=review_session.status)


@reviews_router.get(
    "/reviews/next",
    response_model=ReviewTaskResponse,
    status_code=status.HTTP_200_OK,
)
async def get_next_review_task(
    discipline: str = Query(min_length=1, max_length=64),
    session: AsyncSession = Depends(get_session),
    viewer=Depends(require_roles([UserRole.viewer])),
) -> ReviewTaskResponse:
    requested_key = _canonical_discipline(discipline)
    result = await session.execute(
        select(ReviewSession)
        .where(
            ReviewSession.status == ReviewSessionStatus.queued.value,
        )
        .order_by(ReviewSession.created_at.asc())
    )
    queued_sessions = result.scalars().all()
    review_session = next(
        (rs for rs in queued_sessions if _canonical_discipline(rs.discipline) == requested_key),
        None,
    )
    if review_session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bu disiplin için şu anda sırada eşleşen bir iş yok",
        )

    portfolio_result = await session.execute(select(Portfolio).where(Portfolio.id == review_session.portfolio_id))
    portfolio = portfolio_result.scalar_one_or_none()
    if portfolio is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Portfolio not found")

    review_session.viewer_id = viewer.id
    review_session.status = ReviewSessionStatus.assigned.value
    review_session.assigned_at = dt.datetime.now(dt.timezone.utc)

    if portfolio.status == PortfolioStatus.queued_for_review.value:
        portfolio.status = PortfolioStatus.under_review.value

    await session.commit()
    await session.refresh(review_session)

    asset_url = generate_presigned_get_url(asset_key=portfolio.asset_key)

    return ReviewTaskResponse(
        session_id=review_session.id,
        portfolio_id=portfolio.id,
        discipline=review_session.discipline,
        technique=portfolio.technique,
        asset_url=asset_url,
        content_type=portfolio.content_type,
    )


@reviews_router.post(
    "/reviews/{session_id}/submit",
    response_model=SubmitReviewResponse,
    status_code=status.HTTP_200_OK,
)
async def submit_review(
    session_id: str,
    payload: SubmitReviewRequest,
    session_db: AsyncSession = Depends(get_session),
    viewer=Depends(require_roles([UserRole.viewer])),
) -> SubmitReviewResponse:
    result = await session_db.execute(select(ReviewSession).where(ReviewSession.id == session_id))
    review_session = result.scalar_one_or_none()
    if review_session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review session not found")

    if review_session.status != ReviewSessionStatus.assigned.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Review session is not assigned",
        )

    if review_session.viewer_id != viewer.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your assigned session")

    existing = await session_db.execute(select(Review).where(Review.session_id == review_session.id))
    existing_review = existing.scalar_one_or_none()
    if existing_review is not None:
        return SubmitReviewResponse(status="completed")

    review = Review(
        session_id=review_session.id,
        viewer_id=viewer.id,
        conceptual_consistency_score=payload.conceptual_consistency_score,
        technical_adequacy_score=payload.technical_adequacy_score,
        originality_score=payload.originality_score,
        private_comment=payload.private_comment,
        public_summary=payload.public_summary,
    )
    session_db.add(review)
    await session_db.flush()

    # Viewer earns fixed fee per completed review
    earning = ViewerEarning(
        viewer_id=viewer.id,
        review_id=review.id,
        amount_try=float(settings.viewer_review_fee_try),
        status=ViewerEarningStatus.available.value,
    )
    session_db.add(earning)

    review_session.status = ReviewSessionStatus.completed.value
    review_session.completed_at = dt.datetime.now(dt.timezone.utc)

    portfolio_result = await session_db.execute(select(Portfolio).where(Portfolio.id == review_session.portfolio_id))
    portfolio = portfolio_result.scalar_one_or_none()
    if portfolio is not None:
        portfolio.status = PortfolioStatus.reviewed.value

    await session_db.commit()

    return SubmitReviewResponse(status="completed")


@reviews_router.get(
    "/reviews/mine",
    response_model=StudentReviewsResponse,
    status_code=status.HTTP_200_OK,
)
async def reviews_mine(
    session: AsyncSession = Depends(get_session),
    student=Depends(require_roles([UserRole.student])),
) -> StudentReviewsResponse:
    result = await session.execute(
        select(ReviewSession)
        .where(ReviewSession.student_id == student.id)
        .order_by(ReviewSession.created_at.desc())
    )
    review_sessions = result.scalars().all()
    if not review_sessions:
        return StudentReviewsResponse(items=[])

    portfolio_ids = [rs.portfolio_id for rs in review_sessions]
    portfolio_result = await session.execute(select(Portfolio).where(Portfolio.id.in_(portfolio_ids)))
    portfolios = {p.id: p for p in portfolio_result.scalars().all()}

    items = []
    for rs in review_sessions:
        portfolio = portfolios.get(rs.portfolio_id)
        if portfolio is None:
            continue
        items.append(
            {
                "session_id": rs.id,
                "portfolio_id": rs.portfolio_id,
                "discipline": rs.discipline,
                "technique": portfolio.technique,
                "status": rs.status,
                "created_at": rs.created_at,
                "completed_at": rs.completed_at,
            }
        )

    return StudentReviewsResponse(items=items)

