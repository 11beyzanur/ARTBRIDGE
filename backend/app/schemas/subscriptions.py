from pydantic import BaseModel, EmailStr, Field


class BillingAddress(BaseModel):
    address: str = Field(min_length=3, max_length=255)
    contactName: str = Field(min_length=2, max_length=128)
    city: str = Field(min_length=1, max_length=64)
    country: str = Field(min_length=2, max_length=64)
    zipCode: str | None = Field(default=None, max_length=32)


class IyzicoCustomer(BaseModel):
    name: str = Field(min_length=1, max_length=64)
    surname: str = Field(min_length=1, max_length=64)
    email: EmailStr
    gsmNumber: str = Field(min_length=8, max_length=32)
    identityNumber: str = Field(min_length=5, max_length=32)
    billingAddress: BillingAddress


class SubscribeInitializeRequest(BaseModel):
    customer: IyzicoCustomer


class SubscribeInitializeResponse(BaseModel):
    checkout_form_content: str
    token: str
    token_expire_time: int


class SubscriptionMeResponse(BaseModel):
    status: str
    subscription_reference_code: str | None = None
    order_reference_code: str | None = None


class SubscriptionInitializeCustomerData(BaseModel):
    name: str
    surname: str
    email: str
    gsmNumber: str
    identityNumber: str
    billingAddress: dict[str, object]

