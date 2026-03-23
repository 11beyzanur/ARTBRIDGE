import datetime as dt
from typing import Literal

from pydantic import BaseModel, Field


class LearningAgilityTransition(BaseModel):
    from_session_id: str
    to_session_id: str

    completed_at: dt.datetime
    next_request_created_at: dt.datetime

    days_to_apply: float = Field(gt=0)
    agility_score: float = Field(ge=0)

    conceptual_avg: int | None = None
    technical_avg: int | None = None
    originality_avg: int | None = None


class LearningAgilityDisciplineBreakdown(BaseModel):
    discipline: str
    transitions: list[LearningAgilityTransition]

    avg_days_to_apply: float | None = None
    avg_agility_score: float | None = None


class LearningAgilityMineResponse(BaseModel):
    target_days: float
    disciplines: list[LearningAgilityDisciplineBreakdown]

    overall_avg_days_to_apply: float | None = None
    overall_avg_agility_score: float | None = None
    transitions_count: int


LearningAgilityStatus = Literal["queued", "assigned", "completed"]

