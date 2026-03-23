from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import require_roles
from app.db.session import get_session
from app.models.user import UserRole
from app.schemas.employer_discovery import (
    EmployerDiscoverySearchRequest,
    EmployerDiscoverySearchResponse,
)
from app.services.employer_discovery import search_employer_candidates


employer_discovery_router = APIRouter(tags=["employer-discovery"])


@employer_discovery_router.post(
    "/employers/discovery/search",
    response_model=EmployerDiscoverySearchResponse,
    status_code=status.HTTP_200_OK,
)
async def employer_discovery_search(
    payload: EmployerDiscoverySearchRequest,
    session: AsyncSession = Depends(get_session),
    employer=Depends(require_roles([UserRole.employer])),
) -> EmployerDiscoverySearchResponse:
    # employer variable is used to enforce role guard only.
    discipline = payload.discipline.strip()
    if not discipline:
        raise HTTPException(status_code=400, detail="discipline is required")

    return await search_employer_candidates(
        session=session,
        discipline=discipline,
        score_min=payload.score_min,
        score_max=payload.score_max,
        career_ready_only=payload.career_ready_only,
        limit=payload.limit,
    )

