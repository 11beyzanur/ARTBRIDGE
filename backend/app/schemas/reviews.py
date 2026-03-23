import datetime as dt

from pydantic import BaseModel, Field


class RequestReviewPayload(BaseModel):
    portfolio_id: str = Field(min_length=1, max_length=36)


class ReviewTaskResponse(BaseModel):
    session_id: str
    portfolio_id: str
    discipline: str
    technique: str
    asset_url: str
    content_type: str


class RequestReviewResponse(BaseModel):
    session_id: str
    status: str


class SubmitReviewRequest(BaseModel):
    conceptual_consistency_score: int = Field(ge=1, le=10)
    technical_adequacy_score: int = Field(ge=1, le=10)
    originality_score: int = Field(ge=1, le=10)

    private_comment: str = Field(min_length=10, max_length=10000)
    public_summary: str = Field(min_length=1, max_length=500)


class SubmitReviewResponse(BaseModel):
    status: str


class StudentReviewSessionItem(BaseModel):
    session_id: str
    portfolio_id: str
    discipline: str
    technique: str
    status: str
    created_at: dt.datetime
    completed_at: dt.datetime | None = None


class StudentReviewsResponse(BaseModel):
    items: list[StudentReviewSessionItem]

