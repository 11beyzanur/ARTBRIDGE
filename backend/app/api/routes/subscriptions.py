from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import Response

from app.core.config import settings
from app.deps import require_roles
from app.db.session import get_session
from app.models.subscription import StudentSubscription, StudentSubscriptionStatus
from app.models.employer_package_subscription import (
    EmployerPackageSubscription,
    EmployerSubscriptionStatus,
)
from app.models.user import UserRole
from app.schemas.subscriptions import (
    SubscribeInitializeRequest,
    SubscribeInitializeResponse,
    SubscriptionMeResponse,
)
from app.services.iyzico import (
    initialize_subscription_checkout_form,
    retrieve_checkout_form_result,
    verify_subscription_webhook_signature_v3,
)


subscriptions_router = APIRouter(tags=["subscriptions"])


@subscriptions_router.post(
    "/subscriptions/iyzico/b2c/initialize",
    response_model=SubscribeInitializeResponse,
    status_code=status.HTTP_201_CREATED,
)
async def subscribe_initialize(
    payload: SubscribeInitializeRequest,
    session: AsyncSession = Depends(get_session),
    student=Depends(require_roles([UserRole.student])),
) -> SubscribeInitializeResponse:
    if not settings.iyzico_api_key or not settings.iyzico_secret_key:
        raise HTTPException(status_code=503, detail="Iyzico konfigürasyonu eksik")
    if not settings.iyzico_pricing_plan_reference_code:
        raise HTTPException(status_code=503, detail="Iyzico pricing plan reference code eksik")
    if not settings.iyzico_checkout_callback_url:
        raise HTTPException(status_code=503, detail="Iyzico callback URL eksik")

    # Demo-friendly: subscriptionInitialStatus ACTIVE olsun ki kullanıcı aksiyona hemen geçebilsin
    # (callback/webhook geldikçe status doğrulanır ve gerekirse düzeltilir)
    customer = {
        "name": payload.customer.name,
        "surname": payload.customer.surname,
        "email": payload.customer.email,
        "gsmNumber": payload.customer.gsmNumber,
        "identityNumber": payload.customer.identityNumber,
        "billingAddress": {
            "address": payload.customer.billingAddress.address,
            "contactName": payload.customer.billingAddress.contactName,
            "city": payload.customer.billingAddress.city,
            "country": payload.customer.billingAddress.country,
            **({"zipCode": payload.customer.billingAddress.zipCode} if payload.customer.billingAddress.zipCode else {}),
        },
    }

    iyzico_res = await initialize_subscription_checkout_form(
        callback_url=settings.iyzico_checkout_callback_url,
        pricing_plan_reference_code=settings.iyzico_pricing_plan_reference_code,
        subscription_initial_status=settings.iyzico_subscription_initial_status,
        customer=customer,
    )

    if str(iyzico_res.get("status")).lower() != "success":
        raise HTTPException(status_code=502, detail="Iyzico abonelik başlatılamadı")

    checkout_form_content = str(iyzico_res.get("checkoutFormContent") or "")
    token = str(iyzico_res.get("token") or "")
    token_expire_time = int(iyzico_res.get("tokenExpireTime") or 0)

    if not checkout_form_content or not token:
        raise HTTPException(status_code=502, detail="Iyzico yanıtı eksik")

    record = StudentSubscription(
        student_id=student.id,
        pricing_plan_reference_code=settings.iyzico_pricing_plan_reference_code,
        checkout_token=token,
        # Demo için kullanıcı ödeme tamamlamadan da akışa girebilsin
        # Webhook/callback ile doğrulama geldiğinde status güncellenecek
        status=StudentSubscriptionStatus.active.value,
    )
    session.add(record)
    await session.commit()
    await session.refresh(record)

    return SubscribeInitializeResponse(
        checkout_form_content=checkout_form_content,
        token=token,
        token_expire_time=token_expire_time,
    )


@subscriptions_router.get(
    "/subscriptions/me",
    response_model=SubscriptionMeResponse,
    status_code=status.HTTP_200_OK,
)
async def subscriptions_me(
    session: AsyncSession = Depends(get_session),
    student=Depends(require_roles([UserRole.student])),
) -> SubscriptionMeResponse:
    result = await session.execute(
        select(StudentSubscription)
        .where(StudentSubscription.student_id == student.id)
        .order_by(StudentSubscription.created_at.desc())
        .limit(1)
    )
    subscription = result.scalar_one_or_none()
    if subscription is None:
        return SubscriptionMeResponse(status="NOT_SUBSCRIBED")

    return SubscriptionMeResponse(
        status=subscription.status,
        subscription_reference_code=subscription.subscription_reference_code,
        order_reference_code=subscription.order_reference_code,
    )


async def _parse_callback_payload(request: Request) -> dict[str, str]:
    content_type = request.headers.get("content-type", "").lower()
    if "application/json" in content_type:
        data = await request.json()
        if isinstance(data, dict):
            return {str(k): str(v) for k, v in data.items()}
        return {}

    form = await request.form()
    return {str(k): str(v) for k, v in form.items()}


@subscriptions_router.post("/iyzico/subscriptions/checkout/callback")
async def iyzico_checkout_callback(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> Response:
    # Iyzipay sends callback form data (e.g. token, status, etc.)
    payload = await _parse_callback_payload(request)
    token = payload.get("token") or payload.get("Token") or payload.get("TOKEN") or ""
    if not token:
        return Response(
            content="<html><body>Ödeme alındı ancak abonelik bilgisi tamamlanamadı. Lütfen tekrar deneyin.</body></html>",
            media_type="text/html",
            status_code=200,
        )

    iyzico_res = await retrieve_checkout_form_result(token=token)
    data = iyzico_res.get("data") or {}

    reference_code = str(data.get("referenceCode") or "")
    customer_reference_code = str(data.get("customerReferenceCode") or "")
    subscription_status = str(data.get("subscriptionStatus") or "")

    if not reference_code or not subscription_status:
        return Response(
            content="<html><body>Ödeme alındı. Abonelik aktivasyonu için bekleyin.</body></html>",
            media_type="text/html",
            status_code=200,
        )

    student_result = await session.execute(
        select(StudentSubscription).where(StudentSubscription.checkout_token == token).limit(1)
    )
    student_record = student_result.scalar_one_or_none()

    employer_result = await session.execute(
        select(EmployerPackageSubscription).where(EmployerPackageSubscription.checkout_token == token).limit(1)
    )
    employer_record = employer_result.scalar_one_or_none()

    redirect_url = "/student/subscribe"
    if student_record is not None:
        student_record.subscription_reference_code = reference_code
        student_record.customer_reference_code = customer_reference_code or student_record.customer_reference_code
        student_record.status = subscription_status
        await session.commit()
        redirect_url = "/student/subscribe"

    if employer_record is not None:
        employer_record.subscription_reference_code = reference_code
        employer_record.customer_reference_code = customer_reference_code or employer_record.customer_reference_code
        employer_record.status = subscription_status if subscription_status else EmployerSubscriptionStatus.active.value
        await session.commit()
        redirect_url = "/employer/discovery"

    return Response(
        content=(
            "<html><body>"
            "Ödeme tamamlandı. Abonelik durumunuzu kontrol ediyoruz..."
            f"<script>setTimeout(()=>{{window.location.href='{redirect_url}'}}, 2500)</script>"
            "</body></html>"
        ),
        media_type="text/html",
        status_code=200,
    )


@subscriptions_router.post("/iyzico/subscriptions/webhook")
async def iyzico_subscription_webhook(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> Response:
    payload = await request.json()
    signature_header = request.headers.get("X-IYZ-SIGNATURE-V3") or request.headers.get("X-Iyz-Signature-V3") or ""
    if not signature_header:
        raise HTTPException(status_code=401, detail="Missing signature")

    if not verify_subscription_webhook_signature_v3(signature_header_value=signature_header, payload=payload):
        raise HTTPException(status_code=401, detail="Invalid signature")

    event_type = str(payload.get("iyziEventType") or "")
    subscription_reference_code = str(payload.get("subscriptionReferenceCode") or "")
    order_reference_code = str(payload.get("orderReferenceCode") or "")
    customer_reference_code = str(payload.get("customerReferenceCode") or "")

    if not subscription_reference_code:
        return Response(status_code=200)

    status_is_success = event_type == "subscription.order.success"
    student_status_value = (
        StudentSubscriptionStatus.active.value if status_is_success else StudentSubscriptionStatus.unpaid.value
    )
    employer_status_value = (
        EmployerSubscriptionStatus.active.value if status_is_success else EmployerSubscriptionStatus.unpaid.value
    )

    student_result = await session.execute(
        select(StudentSubscription).where(
            StudentSubscription.subscription_reference_code == subscription_reference_code
        )
    )
    student_record = student_result.scalar_one_or_none()
    if student_record is not None:
        student_record.status = student_status_value
        student_record.subscription_reference_code = subscription_reference_code
        student_record.order_reference_code = order_reference_code
        student_record.customer_reference_code = customer_reference_code
        await session.commit()

    employer_result = await session.execute(
        select(EmployerPackageSubscription).where(
            EmployerPackageSubscription.subscription_reference_code == subscription_reference_code
        )
    )
    employer_record = employer_result.scalar_one_or_none()
    if employer_record is not None:
        employer_record.status = employer_status_value
        employer_record.subscription_reference_code = subscription_reference_code
        employer_record.order_reference_code = order_reference_code
        employer_record.customer_reference_code = customer_reference_code
        await session.commit()

    return Response(status_code=200)

