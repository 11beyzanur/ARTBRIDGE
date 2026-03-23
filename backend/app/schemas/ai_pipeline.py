import datetime as dt
from typing import Optional

from pydantic import BaseModel, Field


class PortfolioAIMetadataUpsertRequest(BaseModel):
    tags: list[str] = Field(default_factory=list, max_length=100)
    auto_caption: Optional[str] = Field(default=None, max_length=2000)
    quality_score: Optional[float] = Field(default=None, ge=0, le=1)
    nsfw_score: Optional[float] = Field(default=None, ge=0, le=1)
    moderation_status: Optional[str] = None
    embedding_status: Optional[str] = None


class PortfolioAIMetadataResponse(BaseModel):
    portfolio_id: str
    discipline: str
    technique: str
    tags: list[str]
    auto_caption: Optional[str] = None
    quality_score: Optional[float] = None
    nsfw_score: Optional[float] = None
    moderation_status: str
    embedding_status: str
    updated_at: dt.datetime


class AIPipelineJobCreateRequest(BaseModel):
    job_type: str
    payload_json: Optional[str] = Field(default=None, max_length=10000)


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
    processed_at: Optional[dt.datetime] = None


class AIPipelineJobListResponse(BaseModel):
    items: list[AIPipelineJobItem]

