import datetime as dt
import uuid

from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import require_active_student_subscription
from app.db.session import get_session
from app.models.portfolio import Portfolio, PortfolioStatus
from app.models.user import UserRole
from app.schemas.portfolio import (
    FinalizePortfolioUploadResponse,
    PresignPortfolioUploadRequest,
    PresignPortfolioUploadResponse,
)
from app.services.s3 import build_asset_key, generate_presigned_put_url, head_asset_exists


portfolios_router = APIRouter(tags=["portfolios"])

ALLOWED_MIME_PREFIXES = ("image/", "video/")


@portfolios_router.post(
    "/portfolios/presign",
    response_model=PresignPortfolioUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def presign_upload(
    payload: PresignPortfolioUploadRequest,
    session: AsyncSession = Depends(get_session),
    student=Depends(require_active_student_subscription),
) -> PresignPortfolioUploadResponse:
    if not any(payload.content_type.startswith(prefix) for prefix in ALLOWED_MIME_PREFIXES):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported content type")

    if payload.file_size is not None and payload.file_size > 200 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File is too large")

    portfolio_id = str(uuid.uuid4())
    asset_key = build_asset_key(
        student_id=student.id,
        portfolio_id=portfolio_id,
        file_name=payload.file_name,
    )

    portfolio = Portfolio(
        id=portfolio_id,
        student_id=student.id,
        discipline=payload.discipline,
        technique=payload.technique,
        school=payload.school,
        asset_key=asset_key,
        content_type=payload.content_type,
        file_size=payload.file_size,
        status=PortfolioStatus.pending_upload.value,
    )
    session.add(portfolio)
    await session.commit()
    await session.refresh(portfolio)

    upload_url = generate_presigned_put_url(asset_key=asset_key, content_type=payload.content_type)

    return PresignPortfolioUploadResponse(
        portfolio_id=portfolio.id,
        asset_key=portfolio.asset_key,
        upload_url=upload_url,
        expires_in_seconds=3600,
    )


@portfolios_router.post(
    "/portfolios/{portfolio_id}/finalize",
    response_model=FinalizePortfolioUploadResponse,
    status_code=status.HTTP_200_OK,
)
async def finalize_upload(
    portfolio_id: str = Path(..., min_length=1),
    session: AsyncSession = Depends(get_session),
    student=Depends(require_active_student_subscription),
) -> FinalizePortfolioUploadResponse:
    result = await session.execute(
        select(Portfolio).where(Portfolio.id == portfolio_id, Portfolio.student_id == student.id)
    )
    portfolio = result.scalar_one_or_none()
    if portfolio is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Portfolio not found")

    if portfolio.status == PortfolioStatus.uploaded.value:
        return FinalizePortfolioUploadResponse(portfolio_id=portfolio.id, status=portfolio.status)

    if portfolio.status not in {PortfolioStatus.pending_upload.value}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Portfolio cannot be finalized in current state",
        )

    head = head_asset_exists(asset_key=portfolio.asset_key)
    if not head:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Asset not uploaded yet")

    content_length = head.get("ContentLength")
    portfolio.file_size = int(content_length) if content_length is not None else portfolio.file_size
    portfolio.status = PortfolioStatus.uploaded.value
    portfolio.uploaded_at = dt.datetime.now(dt.timezone.utc)

    await session.commit()
    await session.refresh(portfolio)

    return FinalizePortfolioUploadResponse(portfolio_id=portfolio.id, status=portfolio.status)

