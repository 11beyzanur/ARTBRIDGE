from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
from typing import Any
from urllib.parse import urlparse

import httpx

from app.core.config import settings


def _json_dumps(payload: dict[str, Any] | list[Any] | None) -> str:
    if payload is None:
        return ""
    return json.dumps(payload, separators=(",", ":"), ensure_ascii=False)


def _create_random_key() -> str:
    # Iyzico expects x-iyzi-rnd random key (string)
    return str(secrets.randbits(63))


def _hmac_sha256_hex(message: str, secret_key: str) -> str:
    digest = hmac.new(secret_key.encode("utf-8"), message.encode("utf-8"), hashlib.sha256).hexdigest()
    return digest


def _build_auth_header(*, api_key: str, secret_key: str, random_key: str, request_path: str, request_body: str) -> str:
    signature = _hmac_sha256_hex(f"{random_key}{request_path}{request_body}", secret_key)
    auth_string = f"apiKey:{api_key}&randomKey:{random_key}&signature:{signature}"
    encoded = base64.b64encode(auth_string.encode("utf-8")).decode("utf-8")
    return f"IYZWSv2 {encoded}"


async def _request_json(
    *,
    method: str,
    path: str,
    json_body: dict[str, Any] | None = None,
) -> dict[str, Any]:
    base_url = settings.iyzico_base_url.rstrip("/")
    url = f"{base_url}{path}"
    parsed = urlparse(url)
    request_path = parsed.path

    random_key = _create_random_key()
    request_body = _json_dumps(json_body)
    auth_header = _build_auth_header(
        api_key=settings.iyzico_api_key,
        secret_key=settings.iyzico_secret_key,
        random_key=random_key,
        request_path=request_path,
        request_body=request_body,
    )

    headers = {
        "Authorization": auth_header,
        "Content-Type": "application/json",
        "x-iyzi-rnd": random_key,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.request(method, url, headers=headers, json=json_body)
        res.raise_for_status()
        return res.json()


async def initialize_subscription_checkout_form(*, callback_url: str, pricing_plan_reference_code: str, subscription_initial_status: str, customer: dict[str, Any]) -> dict[str, Any]:
    return await _request_json(
        method="POST",
        path="/v2/subscription/checkoutform/initialize",
        json_body={
            "callbackUrl": callback_url,
            "pricingPlanReferenceCode": pricing_plan_reference_code,
            "subscriptionInitialStatus": subscription_initial_status,
            "customer": customer,
        },
    )


async def retrieve_checkout_form_result(*, token: str) -> dict[str, Any]:
    base_url = settings.iyzico_base_url.rstrip("/")
    url = f"{base_url}/v2/subscription/checkoutform/{token}"
    parsed = urlparse(url)
    request_path = parsed.path
    random_key = _create_random_key()
    request_body = ""
    auth_header = _build_auth_header(
        api_key=settings.iyzico_api_key,
        secret_key=settings.iyzico_secret_key,
        random_key=random_key,
        request_path=request_path,
        request_body=request_body,
    )
    headers = {
        "Authorization": auth_header,
        "Content-Type": "application/json",
        "x-iyzi-rnd": random_key,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.get(url, headers=headers)
        res.raise_for_status()
        return res.json()


def verify_subscription_webhook_signature_v3(
    *,
    signature_header_value: str,
    payload: dict[str, Any],
) -> bool:
    # docs: message = merchantId + secretKey + eventType + subscriptionReferenceCode + orderReferenceCode + customerReferenceCode
    event_type = str(payload.get("iyziEventType") or payload.get("iyziEventType".strip()) or "")
    subscription_reference_code = str(payload.get("subscriptionReferenceCode") or "")
    order_reference_code = str(payload.get("orderReferenceCode") or "")
    customer_reference_code = str(payload.get("customerReferenceCode") or "")

    if not all([event_type, subscription_reference_code, order_reference_code, customer_reference_code]):
        return False

    message = (
        settings.iyzico_merchant_id
        + settings.iyzico_secret_key
        + event_type
        + subscription_reference_code
        + order_reference_code
        + customer_reference_code
    )

    expected = hmac.new(
        settings.iyzico_secret_key.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    return expected.lower() == signature_header_value.lower()

