from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel

from app.schemas.subscriptions import BillingAddress, IyzicoCustomer


EmployerPlanType = Literal["standard", "enterprise"]


class EmployerPackageInitializeRequest(BaseModel):
    plan_type: EmployerPlanType
    customer: IyzicoCustomer


class EmployerPackageInitializeResponse(BaseModel):
    checkout_form_content: str
    token: str
    token_expire_time: int


class EmployerPackageMeResponse(BaseModel):
    status: str
    plan_type: Optional[str] = None
    can_access_learning_agility: bool = False

