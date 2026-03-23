from __future__ import annotations

import datetime as dt
from typing import Literal

from pydantic import BaseModel, Field


class EmployerDiscoverySearchRequest(BaseModel):
    discipline: str = Field(min_length=1, max_length=64)
    score_min: float = Field(default=1, ge=1, le=10)
    score_max: float = Field(default=10, ge=1, le=10)
    career_ready_only: bool = Field(default=True)
    limit: int = Field(default=20, ge=1, le=100)


class EmployerCandidateItem(BaseModel):
    student_id: str
    display_name: str
    discipline: str

    # Kariyer Puanı = (Kavramsal + Teknik + Özgünlük) / 3 ortalaması
    career_point_avg: float
    conceptual_avg: float
    technical_avg: float
    originality_avg: float

    # Career-Ready = tamamlanan public review sayısı / required_reviews
    readiness_percent: int
    completed_reviews_total: int
    required_reviews: int
    is_career_ready: bool

    top_public_summaries: list[str] = Field(default_factory=list)
    trend_points_12m: list[float | None] = Field(default_factory=list)
    avg_feedback_application_weeks: float | None = None


class EmployerDiscoverySearchResponse(BaseModel):
    discipline: str
    score_min: float
    score_max: float
    career_ready_only: bool
    limit: int

    items: list[EmployerCandidateItem]

    total_candidates_matched: int | None = None

