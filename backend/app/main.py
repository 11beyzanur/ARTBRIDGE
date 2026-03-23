from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.db.session import Base, engine
from app.models import user as _user_models  # Ensure models are registered in SQLAlchemy metadata
from app.models import portfolio as _portfolio_models  # Ensure models are registered in SQLAlchemy metadata
from app.models import review_session as _review_session_models  # Ensure models are registered in SQLAlchemy metadata
from app.models import review as _review_models  # Ensure models are registered in SQLAlchemy metadata
from app.models import subscription as _subscription_models  # Ensure models are registered in SQLAlchemy metadata
from app.models import employer_package_subscription as _employer_package_subscription_models  # Ensure models are registered in SQLAlchemy metadata
from app.models import viewer_finance as _viewer_finance_models  # Ensure models are registered in SQLAlchemy metadata
from app.models import ai_pipeline as _ai_pipeline_models  # Ensure models are registered in SQLAlchemy metadata


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title="ARTBRIDGE API", version="0.1.0", lifespan=lifespan)

cors_origins = settings.parsed_cors_origins()
if cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(api_router)

