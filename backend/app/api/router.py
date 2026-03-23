from fastapi import APIRouter

from app.api.routes.auth import auth_router
from app.api.routes.portfolios import portfolios_router
from app.api.routes.reviews import reviews_router
from app.api.routes.subscriptions import subscriptions_router
from app.api.routes.learning_agility import learning_agility_router
from app.api.routes.career_ready import career_ready_router
from app.api.routes.employer_discovery import employer_discovery_router
from app.api.routes.employer_packages import employer_packages_router
from app.api.routes.viewer_finance import viewer_finance_router
from app.api.routes.ai_pipeline import ai_pipeline_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(portfolios_router)
api_router.include_router(reviews_router)
api_router.include_router(subscriptions_router)
api_router.include_router(learning_agility_router)
api_router.include_router(career_ready_router)
api_router.include_router(employer_discovery_router)
api_router.include_router(employer_packages_router)
api_router.include_router(viewer_finance_router)
api_router.include_router(ai_pipeline_router)

