import datetime as dt

from pydantic import BaseModel, Field


class PortfolioAIMetadataUpsertRequest(BaseModel):
    tags: list[str] = Field(default_factory=list, max_length=100)
    auto_caption: str | None = Field(default=None, max_length=2000)
    quality_score: float | None = Field(default=None, ge=0, le=1)
    nsfw_score: float | None = Field(default=None, ge=0, le=1)
    moderation_status: str | None = None
    embedding_status: str | None = None


class PortfolioAIMetadataResponse(BaseModel):
    portfolio_id: str
    discipline: str
    technique: str
    tags: list[str]
    auto_caption: str | None = None
    quality_score: float | None = None
    nsfw_score: float | None = None
    moderation_status: str
    embedding_status: str
    updated_at: dt.datetime


class AIPipelineJobCreateRequest(BaseModel):
    job_type: str
    payload_json: str | None = Field(default=None, max_length=10000)


class AIPipelineJobCreateResponse(BaseModel):
    job_id: str
    status: str
    job_type: str
    scheduled_at: dt.datetime


class AIPipelineJobItem(BaseModel):
    id: str
    job_type: str
    status: str
    attempt_count: int
    scheduled_at: dt.datetime
    processed_at: dt.datetime | None = None


class AIPipelineJobListResponse(BaseModel):
    items: list[AIPipelineJobItem]

