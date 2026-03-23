from __future__ import annotations

import datetime as dt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends, HTTPException, Path, status

from app.deps import require_roles
from app.db.session import get_session
from app.models.ai_pipeline import (
    AIPipelineJob,
    EmbeddingStatus,
    JobStatus,
    ModerationStatus,
    PortfolioAIMetadata,
)
from app.models.portfolio import Portfolio
from app.models.user import UserRole
from app.schemas.ai_pipeline import (
    AIPipelineJobCreateRequest,
    AIPipelineJobCreateResponse,
    AIPipelineJobListResponse,
    PortfolioAIMetadataResponse,
    PortfolioAIMetadataUpsertRequest,
)


ai_pipeline_router = APIRouter(tags=["ai-pipeline"])


def _parse_tags(tags: list[str]) -> str:
    clean = [t.strip() for t in tags if t and t.strip()]
    return ",".join(clean[:100])


def _to_tags(csv: str) -> list[str]:
    if not csv:
        return []
    return [t for t in (x.strip() for x in csv.split(",")) if t]


@ai_pipeline_router.get(
    "/ai/portfolios/{portfolio_id}/metadata",
    response_model=PortfolioAIMetadataResponse,
    status_code=status.HTTP_200_OK,
)
async def ai_metadata_get(
    portfolio_id: str = Path(..., min_length=1),
    session: AsyncSession = Depends(get_session),
    student=Depends(require_roles([UserRole.student])),
) -> PortfolioAIMetadataResponse:
    portfolio_result = await session.execute(
        select(Portfolio).where(Portfolio.id == portfolio_id, Portfolio.student_id == student.id)
    )
    portfolio = portfolio_result.scalar_one_or_none()
    if portfolio is None:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    result = await session.execute(
        select(PortfolioAIMetadata).where(PortfolioAIMetadata.portfolio_id == portfolio_id)
    )
    md = result.scalar_one_or_none()
    if md is None:
        # Return a default, read-friendly projection if metadata not yet generated
        return PortfolioAIMetadataResponse(
            portfolio_id=portfolio.id,
            discipline=portfolio.discipline,
            technique=portfolio.technique,
            tags=[],
            auto_caption=None,
            quality_score=None,
            nsfw_score=None,
            moderation_status=ModerationStatus.pending.value,
            embedding_status=EmbeddingStatus.pending.value,
            updated_at=portfolio.created_at,
        )

    return PortfolioAIMetadataResponse(
        portfolio_id=md.portfolio_id,
        discipline=md.discipline,
        technique=md.technique,
        tags=_to_tags(md.tags_csv),
        auto_caption=md.auto_caption,
        quality_score=md.quality_score,
        nsfw_score=md.nsfw_score,
        moderation_status=md.moderation_status,
        embedding_status=md.embedding_status,
        updated_at=md.updated_at,
    )


@ai_pipeline_router.post(
    "/ai/portfolios/{portfolio_id}/metadata",
    response_model=PortfolioAIMetadataResponse,
    status_code=status.HTTP_200_OK,
)
async def ai_metadata_upsert(
    payload: PortfolioAIMetadataUpsertRequest,
    portfolio_id: str = Path(..., min_length=1),
    session: AsyncSession = Depends(get_session),
    student=Depends(require_roles([UserRole.student])),
) -> PortfolioAIMetadataResponse:
    portfolio_result = await session.execute(
        select(Portfolio).where(Portfolio.id == portfolio_id, Portfolio.student_id == student.id)
    )
    portfolio = portfolio_result.scalar_one_or_none()
    if portfolio is None:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    result = await session.execute(
        select(PortfolioAIMetadata).where(PortfolioAIMetadata.portfolio_id == portfolio_id)
    )
    md = result.scalar_one_or_none()
    if md is None:
        md = PortfolioAIMetadata(
            portfolio_id=portfolio.id,
            student_id=student.id,
            discipline=portfolio.discipline,
            technique=portfolio.technique,
            tags_csv=_parse_tags(payload.tags),
            auto_caption=payload.auto_caption,
            quality_score=payload.quality_score,
            nsfw_score=payload.nsfw_score,
            moderation_status=payload.moderation_status or ModerationStatus.pending.value,
            embedding_status=payload.embedding_status or EmbeddingStatus.pending.value,
        )
        session.add(md)
    else:
        md.tags_csv = _parse_tags(payload.tags)
        md.auto_caption = payload.auto_caption
        md.quality_score = payload.quality_score
        md.nsfw_score = payload.nsfw_score
        if payload.moderation_status:
            md.moderation_status = payload.moderation_status
        if payload.embedding_status:
            md.embedding_status = payload.embedding_status

    await session.commit()
    await session.refresh(md)

    return PortfolioAIMetadataResponse(
        portfolio_id=md.portfolio_id,
        discipline=md.discipline,
        technique=md.technique,
        tags=_to_tags(md.tags_csv),
        auto_caption=md.auto_caption,
        quality_score=md.quality_score,
        nsfw_score=md.nsfw_score,
        moderation_status=md.moderation_status,
        embedding_status=md.embedding_status,
        updated_at=md.updated_at,
    )


@ai_pipeline_router.post(
    "/ai/portfolios/{portfolio_id}/jobs",
    response_model=AIPipelineJobCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def ai_job_enqueue(
    payload: AIPipelineJobCreateRequest,
    portfolio_id: str = Path(..., min_length=1),
    session: AsyncSession = Depends(get_session),
    student=Depends(require_roles([UserRole.student])),
) -> AIPipelineJobCreateResponse:
    portfolio_result = await session.execute(
        select(Portfolio).where(Portfolio.id == portfolio_id, Portfolio.student_id == student.id)
    )
    portfolio = portfolio_result.scalar_one_or_none()
    if portfolio is None:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    job = AIPipelineJob(
        portfolio_id=portfolio.id,
        student_id=student.id,
        job_type=payload.job_type.strip(),
        status=JobStatus.queued.value,
        payload_json=payload.payload_json,
        scheduled_at=dt.datetime.now(dt.timezone.utc),
    )
    session.add(job)
    await session.commit()
    await session.refresh(job)

    return AIPipelineJobCreateResponse(
        job_id=job.id,
        status=job.status,
        job_type=job.job_type,
        scheduled_at=job.scheduled_at,
    )


@ai_pipeline_router.get(
    "/ai/portfolios/{portfolio_id}/jobs",
    response_model=AIPipelineJobListResponse,
    status_code=status.HTTP_200_OK,
)
async def ai_job_list(
    portfolio_id: str = Path(..., min_length=1),
    session: AsyncSession = Depends(get_session),
    student=Depends(require_roles([UserRole.student])),
) -> AIPipelineJobListResponse:
    portfolio_result = await session.execute(
        select(Portfolio).where(Portfolio.id == portfolio_id, Portfolio.student_id == student.id)
    )
    portfolio = portfolio_result.scalar_one_or_none()
    if portfolio is None:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    result = await session.execute(
        select(AIPipelineJob)
        .where(AIPipelineJob.portfolio_id == portfolio.id, AIPipelineJob.student_id == student.id)
        .order_by(AIPipelineJob.scheduled_at.desc())
    )
    rows = list(result.scalars().all())

    return AIPipelineJobListResponse(
        items=[
            {
                "id": r.id,
                "job_type": r.job_type,
                "status": r.status,
                "attempt_count": r.attempt_count,
                "scheduled_at": r.scheduled_at,
                "processed_at": r.processed_at,
            }
            for r in rows
        ]
    )

