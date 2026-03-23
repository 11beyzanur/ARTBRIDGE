import datetime as dt
from typing import Optional

from pydantic import BaseModel, Field


class ViewerEarningItem(BaseModel):
    id: str
    review_id: str
    amount_try: float
    status: str
    created_at: dt.datetime
    paid_at: Optional[dt.datetime] = None
    donated_at: Optional[dt.datetime] = None


class ViewerEarningsSummaryResponse(BaseModel):
    available_try: float
    paid_try: float
    donated_try: float
    total_try: float
    min_payout_try: float
    items: list[ViewerEarningItem]


class ViewerPayoutRequestCreate(BaseModel):
    iban: str = Field(min_length=8, max_length=64)
    note: Optional[str] = Field(default=None, max_length=500)


class ViewerPayoutRequestItem(BaseModel):
    id: str
    amount_try: float
    status: str
    iban: str
    note: Optional[str] = None
    created_at: dt.datetime
    processed_at: Optional[dt.datetime] = None


class ViewerPayoutRequestCreateResponse(BaseModel):
    request_id: str
    amount_try: float
    status: str

