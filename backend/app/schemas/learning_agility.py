import datetime as dt
from typing import Literal, Optional

from pydantic import BaseModel, Field


class LearningAgilityTransition(BaseModel):
    from_session_id: str
    to_session_id: str

    completed_at: dt.datetime
    next_request_created_at: dt.datetime

    days_to_apply: float = Field(gt=0)
    agility_score: float = Field(ge=0)

    conceptual_avg: Optional[int] = None
    technical_avg: Optional[int] = None
    originality_avg: Optional[int] = None


class LearningAgilityDisciplineBreakdown(BaseModel):
    discipline: str
    transitions: list[LearningAgilityTransition]

    avg_days_to_apply: Optional[float] = None
    avg_agility_score: Optional[float] = None


class LearningAgilityMineResponse(BaseModel):
    target_days: float
    disciplines: list[LearningAgilityDisciplineBreakdown]

    overall_avg_days_to_apply: Optional[float] = None
    overall_avg_agility_score: Optional[float] = None
    transitions_count: int


LearningAgilityStatus = Literal["queued", "assigned", "completed"]

