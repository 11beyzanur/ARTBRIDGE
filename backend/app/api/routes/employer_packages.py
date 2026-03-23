from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import require_enterprise_employer_subscription, require_roles
from app.db.session import get_session
from app.models.employer_package_subscription import (
    EmployerPackageSubscription,
    EmployerPlanType,
    EmployerSubscriptionStatus,
)
from app.models.user import UserRole
from app.schemas.employer_packages import (
    EmployerPackageInitializeRequest,
    EmployerPackageInitializeResponse,
    EmployerPackageMeResponse,
)
from app.schemas.learning_agility import LearningAgilityMineResponse
from app.services.iyzico import initialize_subscription_checkout_form
from app.services.learning_agility import get_learning_agility_mine
from app.core.config import settings


employer_packages_router = APIRouter(tags=["employer-packages"])


@employer_packages_router.post(
    "/packages/iyzico/b2b/initialize",
    response_model=EmployerPackageInitializeResponse,
    status_code=status.HTTP_201_CREATED,
)
async def employer_package_initialize(
    payload: EmployerPackageInitializeRequest,
    session: AsyncSession = Depends(get_session),
    employer=Depends(require_roles([UserRole.employer])),
) -> EmployerPackageInitializeResponse:
    if not settings.iyzico_api_key or not settings.iyzico_secret_key:
        raise HTTPException(status_code=503, detail="Iyzico konfigürasyonu eksik")
    if payload.plan_type == "standard":
        if not settings.iyzico_b2b_standard_pricing_plan_reference_code:
            raise HTTPException(status_code=503, detail="Standard plan reference code eksik")
        pricing_plan_reference_code = settings.iyzico_b2b_standard_pricing_plan_reference_code
    else:
        if not settings.iyzico_b2b_enterprise_pricing_plan_reference_code:
            raise HTTPException(status_code=503, detail="Enterprise plan reference code eksik")
        pricing_plan_reference_code = settings.iyzico_b2b_enterprise_pricing_plan_reference_code

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
        pricing_plan_reference_code=pricing_plan_reference_code,
        subscription_initial_status=settings.iyzico_subscription_initial_status,
        customer=customer,
    )

    if str(iyzico_res.get("status")).lower() != "success":
        raise HTTPException(status_code=502, detail="Iyzico employer aboneliği başlatılamadı")

    checkout_form_content = str(iyzico_res.get("checkoutFormContent") or "")
    token = str(iyzico_res.get("token") or "")
    token_expire_time = int(iyzico_res.get("tokenExpireTime") or 0)
    if not checkout_form_content or not token:
        raise HTTPException(status_code=502, detail="Iyzico yanıtı eksik")

    plan_type_value = (
        EmployerPlanType.standard.value
        if payload.plan_type == "standard"
        else EmployerPlanType.enterprise.value
    )

    record = EmployerPackageSubscription(
        employer_id=employer.id,
        plan_type=plan_type_value,
        pricing_plan_reference_code=pricing_plan_reference_code,
        checkout_token=token,
        status=EmployerSubscriptionStatus.active.value,
    )
    session.add(record)
    await session.commit()
    await session.refresh(record)

    return EmployerPackageInitializeResponse(
        checkout_form_content=checkout_form_content,
        token=token,
        token_expire_time=token_expire_time,
    )


@employer_packages_router.get(
    "/packages/me",
    response_model=EmployerPackageMeResponse,
    status_code=status.HTTP_200_OK,
)
async def employer_packages_me(
    session: AsyncSession = Depends(get_session),
    employer=Depends(require_roles([UserRole.employer])),
) -> EmployerPackageMeResponse:
    result = await session.execute(
        select(EmployerPackageSubscription)
        .where(EmployerPackageSubscription.employer_id == employer.id)
        .order_by(EmployerPackageSubscription.created_at.desc())
        .limit(1)
    )
    record = result.scalar_one_or_none()
    if record is None:
        return EmployerPackageMeResponse(status="NOT_SUBSCRIBED", plan_type=None, can_access_learning_agility=False)

    can_access_learning_agility = (
        record.status == EmployerSubscriptionStatus.active.value and record.plan_type == EmployerPlanType.enterprise.value
    )

    return EmployerPackageMeResponse(
        status=record.status,
        plan_type=record.plan_type,
        can_access_learning_agility=can_access_learning_agility,
    )


@employer_packages_router.get(
    "/packages/candidates/{student_id}/learning-agility",
    response_model=LearningAgilityMineResponse,
    status_code=status.HTTP_200_OK,
)
async def employer_candidate_learning_agility(
    student_id: str,
    session: AsyncSession = Depends(get_session),
    _employer=Depends(require_enterprise_employer_subscription),
) -> LearningAgilityMineResponse:
    # Enterprise: 6 months window (PRD Faz 2)
    result = await get_learning_agility_mine(
        session=session,
        student_id=student_id,
        target_days=14.0,
        window_days=180.0,
    )
    return LearningAgilityMineResponse(**result)

