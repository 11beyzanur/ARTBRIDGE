import datetime as dt
from typing import Literal, Optional

from pydantic import BaseModel, Field


class CareerReadyAnalysisItem(BaseModel):
    session_id: str
    discipline: str
    completed_at: dt.datetime

    public_summary: str = Field(min_length=1, max_length=500)

    conceptual_consistency_score: int
    technical_adequacy_score: int
    originality_score: int

    avg_score: float


class CareerReadyMineResponse(BaseModel):
    display_name: str
    required_reviews: int
    completed_reviews: int
    progress_percent: int

    target_label: Literal["Kariyere Hazırlık Analizi"] = "Kariyere Hazırlık Analizi"

    avg_score: Optional[float] = None
    items: list[CareerReadyAnalysisItem]


class CareerReadyShareResponse(BaseModel):
    share_display_name: str
    required_reviews: int
    completed_reviews: int
    progress_percent: int
    target_label: Literal["Kariyere Hazırlık Analizi"] = "Kariyere Hazırlık Analizi"

    avg_score: Optional[float] = None
    items: list[CareerReadyAnalysisItem]


class CareerReadyShareTokenResponse(BaseModel):
    token: str

