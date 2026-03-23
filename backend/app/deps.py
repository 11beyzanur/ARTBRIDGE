from collections.abc import Awaitable, Callable
from typing import Optional, TypeVar

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.db.session import get_session
from app.models.user import User, UserRole
from app.models.subscription import StudentSubscription, StudentSubscriptionStatus
from app.models.employer_package_subscription import (
    EmployerPackageSubscription,
    EmployerPlanType,
    EmployerSubscriptionStatus,
)


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

T = TypeVar("T")


async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_session),
) -> User:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    try:
        payload = decode_access_token(token)
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        )
    user_id = payload.get("sub")
    if not isinstance(user_id, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        )

    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user


def require_roles(roles: list[UserRole]) -> Callable[[User], Awaitable[User]]:
    allowed = {role.value for role in roles}

    async def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return user

    return dependency


async def require_active_student_subscription(
    student: User = Depends(require_roles([UserRole.student])),
    session: AsyncSession = Depends(get_session),
) -> User:
    result = await session.execute(
        select(StudentSubscription)
        .where(StudentSubscription.student_id == student.id)
        .order_by(StudentSubscription.created_at.desc())
        .limit(1)
    )
    subscription = result.scalar_one_or_none()
    if subscription is None or subscription.status != StudentSubscriptionStatus.active.value:
        raise HTTPException(
            status_code=403,
            detail="Aktif abonelik gereklidir",
        )
    return student


async def require_enterprise_employer_subscription(
    employer=Depends(require_roles([UserRole.employer])),
    session: AsyncSession = Depends(get_session),
) -> User:
    result = await session.execute(
        select(EmployerPackageSubscription)
        .where(EmployerPackageSubscription.employer_id == employer.id)
        .order_by(EmployerPackageSubscription.created_at.desc())
        .limit(1)
    )
    record = result.scalar_one_or_none()
    if record is None:
        raise HTTPException(status_code=403, detail="Aktif enterprise abonelik gereklidir")
    if record.status != EmployerSubscriptionStatus.active.value:
        raise HTTPException(status_code=403, detail="Aktif enterprise abonelik gereklidir")
    if record.plan_type != EmployerPlanType.enterprise.value:
        raise HTTPException(status_code=403, detail="Aktif enterprise abonelik gereklidir")
    return employer

