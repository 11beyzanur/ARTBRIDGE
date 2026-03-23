from __future__ import annotations

from datetime import datetime, timedelta, timezone

import jwt
from passlib.context import CryptContext

from app.core.config import settings


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_access_token(user_id: str, role: str) -> tuple[str, int]:
    expires_delta = timedelta(hours=settings.jwt_access_token_expires_hours)
    expires_at = datetime.now(timezone.utc) + expires_delta

    payload = {
        "sub": user_id,
        "role": role,
        "iss": settings.jwt_issuer,
        "exp": expires_at,
    }

    token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    expires_in_seconds = int(expires_delta.total_seconds())
    return token, expires_in_seconds


def decode_access_token(token: str) -> dict[str, object]:
    try:
        return jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
            issuer=settings.jwt_issuer,
        )
    except jwt.PyJWTError as exc:
        raise exc

