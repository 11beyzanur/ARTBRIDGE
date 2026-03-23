from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

import jwt

from app.deps import require_roles
from app.db.session import get_session
from app.models.user import UserRole
from app.schemas.career_ready import (
    CareerReadyMineResponse,
    CareerReadyShareResponse,
    CareerReadyShareTokenResponse,
)
from app.services.career_ready import create_share_token, get_career_ready_mine, get_career_ready_share


career_ready_router = APIRouter(tags=["career-ready"])


@career_ready_router.get(
    "/career-ready/mine",
    response_model=CareerReadyMineResponse,
    status_code=status.HTTP_200_OK,
)
async def career_ready_mine(
    session_db: AsyncSession = Depends(get_session),
    student=Depends(require_roles([UserRole.student])),
) -> CareerReadyMineResponse:
    return await get_career_ready_mine(session=session_db, student_id=student.id)


@career_ready_router.get(
    "/career-ready/share-token",
    response_model=CareerReadyShareTokenResponse,
    status_code=status.HTTP_200_OK,
)
async def career_ready_share_token(
    session_db: AsyncSession = Depends(get_session),
    student=Depends(require_roles([UserRole.student])),
) -> CareerReadyShareTokenResponse:
    token, _expires_in_seconds = create_share_token(student_id=student.id)
    return CareerReadyShareTokenResponse(token=token)


@career_ready_router.get(
    "/career-ready/share/{token}",
    response_model=CareerReadyShareResponse,
    status_code=status.HTTP_200_OK,
)
async def career_ready_share(
    token: str,
    session_db: AsyncSession = Depends(get_session),
) -> CareerReadyShareResponse:
    try:
        return await get_career_ready_share(session=session_db, token=token)
    except jwt.PyJWTError:
        raise HTTPException(status_code=404, detail="Share token is invalid")

