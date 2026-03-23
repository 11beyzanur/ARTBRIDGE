from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, hash_password, verify_password
from app.deps import get_current_user
from app.db.session import get_session
from app.models.user import User, UserRole
from app.schemas.auth import AuthUser, LoginRequest, LoginResponse, RegisterRequest


auth_router = APIRouter(tags=["auth"])


@auth_router.post("/auth/register", response_model=AuthUser, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    session: AsyncSession = Depends(get_session),
) -> AuthUser:
    existing = await session.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use")

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        display_name=payload.display_name.strip(),
        role=payload.role.value,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    return AuthUser(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        role=UserRole(user.role),
    )


@auth_router.post("/auth/login", response_model=LoginResponse)
async def login(
    payload: LoginRequest,
    session: AsyncSession = Depends(get_session),
) -> LoginResponse:
    result = await session.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token, expires_in_seconds = create_access_token(user.id, user.role)
    return LoginResponse(
        access_token=token,
        expires_in_seconds=expires_in_seconds,
        user=AuthUser(
            id=user.id,
            email=user.email,
            display_name=user.display_name,
            role=UserRole(user.role),
        ),
    )


@auth_router.get("/auth/me", response_model=AuthUser)
async def me(current_user: User = Depends(get_current_user)) -> AuthUser:
    return AuthUser(
        id=current_user.id,
        email=current_user.email,
        display_name=current_user.display_name,
        role=UserRole(current_user.role),
    )

