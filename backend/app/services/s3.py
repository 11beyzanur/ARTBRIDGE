import re

import boto3
from botocore.exceptions import ClientError

from app.core.config import settings


def get_s3_client():
    if settings.aws_access_key_id and settings.aws_secret_access_key:
        return boto3.client(
            "s3",
            region_name=settings.aws_region,
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
        )

    # Local dev için IAM rol/credential chain veya çevresel değişkenlere güveniyoruz
    return boto3.client("s3", region_name=settings.aws_region)


def sanitize_filename(filename: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", filename).strip("_")
    return cleaned[:200] if cleaned else "file"


def build_asset_key(*, student_id: str, portfolio_id: str, file_name: str) -> str:
    # Double-blind: Viewer'ın göreceği presigned URL içinde student kimliği görünmemeli
    safe_name = sanitize_filename(file_name)
    return f"{settings.aws_s3_prefix}/{portfolio_id}/{safe_name}"


def generate_presigned_put_url(*, asset_key: str, content_type: str) -> str:
    client = get_s3_client()
    return client.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.aws_s3_bucket,
            "Key": asset_key,
            "ContentType": content_type,
        },
        ExpiresIn=settings.aws_s3_presign_expires_seconds,
        HttpMethod="PUT",
    )


def generate_presigned_get_url(*, asset_key: str) -> str:
    client = get_s3_client()
    return client.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": settings.aws_s3_bucket,
            "Key": asset_key,
        },
        ExpiresIn=settings.aws_s3_presign_expires_seconds,
    )


def head_asset_exists(*, asset_key: str) -> dict[str, object]:
    client = get_s3_client()
    try:
        response = client.head_object(Bucket=settings.aws_s3_bucket, Key=asset_key)
        return dict(response)
    except ClientError as exc:
        error_code = str(exc.response.get("Error", {}).get("Code", ""))
        if error_code in {"404", "NoSuchKey", "NotFound"}:
            return {}
        raise

