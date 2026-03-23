from typing import Optional

from pydantic import BaseModel, Field


class PresignPortfolioUploadRequest(BaseModel):
    discipline: str = Field(min_length=1, max_length=64)
    technique: str = Field(min_length=1, max_length=64)
    school: str = Field(min_length=1, max_length=128)
    file_name: str = Field(min_length=1, max_length=255)
    content_type: str = Field(min_length=3, max_length=128)
    file_size: Optional[int] = Field(default=None, ge=1)


class PresignPortfolioUploadResponse(BaseModel):
    portfolio_id: str
    asset_key: str
    upload_url: str
    expires_in_seconds: int


class FinalizePortfolioUploadResponse(BaseModel):
    portfolio_id: str
    status: str

