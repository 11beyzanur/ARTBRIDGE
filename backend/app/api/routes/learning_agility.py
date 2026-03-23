from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import require_roles
from app.db.session import get_session
from app.models.user import UserRole
from app.schemas.learning_agility import LearningAgilityMineResponse
from app.services.learning_agility import TARGET_DAYS_DEFAULT, get_learning_agility_mine


learning_agility_router = APIRouter(tags=["learning-agility"])


@learning_agility_router.get(
    "/learning-agility/mine",
    response_model=LearningAgilityMineResponse,
    status_code=status.HTTP_200_OK,
)
async def learning_agility_mine(
    session: AsyncSession = Depends(get_session),
    student=Depends(require_roles([UserRole.student])),
) -> LearningAgilityMineResponse:
    result = await get_learning_agility_mine(
        session=session,
        student_id=student.id,
        target_days=TARGET_DAYS_DEFAULT,
    )
    return LearningAgilityMineResponse(**result)

