from typing import Any, Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = Field(
        default="sqlite+aiosqlite:///./artbridge.db",
        validation_alias="DATABASE_URL",
    )

    jwt_secret_key: str = Field(
        ...,
        min_length=32,
        validation_alias="JWT_SECRET_KEY",
    )
    jwt_algorithm: str = Field(
        default="HS256",
        validation_alias="JWT_ALGORITHM",
    )
    jwt_issuer: str = Field(
        default="artbridge",
        validation_alias="JWT_ISSUER",
    )
    jwt_access_token_expires_hours: int = Field(
        default=24,
        ge=1,
        le=720,
        validation_alias="JWT_ACCESS_TOKEN_EXPIRES_HOURS",
    )

    cors_origins: str = Field(
        default="http://localhost:3000",
        validation_alias="CORS_ORIGINS",
    )

    api_host: str = Field(default="0.0.0.0", validation_alias="API_HOST")
    api_port: int = Field(default=8000, validation_alias="API_PORT")

    aws_region: str = Field(
        default="us-east-1",
        validation_alias="AWS_REGION",
    )
    aws_s3_bucket: str = Field(
        default="",
        validation_alias="AWS_S3_BUCKET",
    )
    aws_s3_prefix: str = Field(
        default="artbridge",
        validation_alias="AWS_S3_PREFIX",
    )
    aws_access_key_id: Optional[str] = Field(
        default=None,
        validation_alias="AWS_ACCESS_KEY_ID",
    )
    aws_secret_access_key: Optional[str] = Field(
        default=None,
        validation_alias="AWS_SECRET_ACCESS_KEY",
    )
    aws_s3_presign_expires_seconds: int = Field(
        default=3600,
        ge=60,
        le=86400,
        validation_alias="AWS_S3_PRESIGN_EXPIRES_SECONDS",
    )

    iyzico_api_key: str = Field(
        default="",
        min_length=0,
        validation_alias="IYZICO_API_KEY",
    )
    iyzico_secret_key: str = Field(
        default="",
        min_length=0,
        validation_alias="IYZICO_SECRET_KEY",
    )
    iyzico_merchant_id: str = Field(
        default="",
        min_length=0,
        validation_alias="IYZICO_MERCHANT_ID",
    )
    iyzico_base_url: str = Field(
        default="https://api.iyzipay.com",
        validation_alias="IYZICO_BASE_URL",
    )
    iyzico_pricing_plan_reference_code: str = Field(
        default="",
        validation_alias="IYZICO_PRICING_PLAN_REFERENCE_CODE",
    )
    iyzico_b2b_standard_pricing_plan_reference_code: str = Field(
        default="",
        validation_alias="IYZICO_B2B_STANDARD_PRICING_PLAN_REFERENCE_CODE",
    )
    iyzico_b2b_enterprise_pricing_plan_reference_code: str = Field(
        default="",
        validation_alias="IYZICO_B2B_ENTERPRISE_PRICING_PLAN_REFERENCE_CODE",
    )
    iyzico_subscription_initial_status: str = Field(
        default="ACTIVE",
        validation_alias="IYZICO_SUBSCRIPTION_INITIAL_STATUS",
    )
    iyzico_checkout_callback_url: str = Field(
        default="",
        validation_alias="IYZICO_CHECKOUT_CALLBACK_URL",
    )

    career_ready_required_reviews: int = Field(
        default=4,
        ge=1,
        le=50,
        validation_alias="CAREER_READY_REQUIRED_REVIEWS",
    )
    career_ready_share_expires_days: int = Field(
        default=30,
        ge=1,
        le=365,
        validation_alias="CAREER_READY_SHARE_EXPIRES_DAYS",
    )

    viewer_review_fee_try: float = Field(
        default=80.0,
        ge=0,
        validation_alias="VIEWER_REVIEW_FEE_TRY",
    )
    viewer_min_payout_try: float = Field(
        default=200.0,
        ge=0,
        validation_alias="VIEWER_MIN_PAYOUT_TRY",
    )

    def parsed_cors_origins(self) -> list[str]:
        value = self.cors_origins.strip()
        if not value:
            return []
        return [origin.strip() for origin in value.split(",") if origin.strip()]

    def to_dict(self) -> dict[str, Any]:
        return self.model_dump()


settings = Settings()

