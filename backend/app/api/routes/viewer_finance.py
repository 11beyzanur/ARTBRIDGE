from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.deps import require_roles
from app.db.session import get_session
from app.models.user import UserRole
from app.models.viewer_finance import (
    ViewerEarning,
    ViewerEarningStatus,
    ViewerPayoutRequest,
    ViewerPayoutStatus,
)
from app.schemas.viewer_finance import (
    ViewerEarningsSummaryResponse,
    ViewerPayoutRequestCreate,
    ViewerPayoutRequestCreateResponse,
    ViewerPayoutRequestItem,
)


viewer_finance_router = APIRouter(tags=["viewer-finance"])


@viewer_finance_router.get(
    "/viewer/earnings",
    response_model=ViewerEarningsSummaryResponse,
    status_code=status.HTTP_200_OK,
)
async def viewer_earnings(
    session: AsyncSession = Depends(get_session),
    viewer=Depends(require_roles([UserRole.viewer])),
) -> ViewerEarningsSummaryResponse:
    result = await session.execute(
        select(ViewerEarning)
        .where(ViewerEarning.viewer_id == viewer.id)
        .order_by(ViewerEarning.created_at.desc())
    )
    items = list(result.scalars().all())

    available_try = round(sum(i.amount_try for i in items if i.status == ViewerEarningStatus.available.value), 2)
    paid_try = round(sum(i.amount_try for i in items if i.status == ViewerEarningStatus.paid.value), 2)
    donated_try = round(sum(i.amount_try for i in items if i.status == ViewerEarningStatus.donated.value), 2)
    total_try = round(available_try + paid_try + donated_try, 2)

    return ViewerEarningsSummaryResponse(
        available_try=available_try,
        paid_try=paid_try,
        donated_try=donated_try,
        total_try=total_try,
        min_payout_try=round(float(settings.viewer_min_payout_try), 2),
        items=[
            {
                "id": i.id,
                "review_id": i.review_id,
                "amount_try": round(i.amount_try, 2),
                "status": i.status,
                "created_at": i.created_at,
                "paid_at": i.paid_at,
                "donated_at": i.donated_at,
            }
            for i in items
        ],
    )


@viewer_finance_router.post(
    "/viewer/payouts/request",
    response_model=ViewerPayoutRequestCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def viewer_payout_request_create(
    payload: ViewerPayoutRequestCreate,
    session: AsyncSession = Depends(get_session),
    viewer=Depends(require_roles([UserRole.viewer])),
) -> ViewerPayoutRequestCreateResponse:
    earnings_result = await session.execute(
        select(ViewerEarning).where(
            ViewerEarning.viewer_id == viewer.id,
            ViewerEarning.status == ViewerEarningStatus.available.value,
        )
    )
    available_items = list(earnings_result.scalars().all())
    available_total = round(sum(i.amount_try for i in available_items), 2)

    if available_total < settings.viewer_min_payout_try:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum payout tutarı {settings.viewer_min_payout_try} TL",
        )

    pending_request_result = await session.execute(
        select(ViewerPayoutRequest).where(
            ViewerPayoutRequest.viewer_id == viewer.id,
            ViewerPayoutRequest.status == ViewerPayoutStatus.requested.value,
        )
    )
    if pending_request_result.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="Bekleyen payout talebiniz var")

    req = ViewerPayoutRequest(
        viewer_id=viewer.id,
        amount_try=available_total,
        status=ViewerPayoutStatus.requested.value,
        iban=payload.iban.strip(),
        note=payload.note.strip() if payload.note else None,
    )
    session.add(req)
    await session.commit()
    await session.refresh(req)

    return ViewerPayoutRequestCreateResponse(
        request_id=req.id,
        amount_try=round(req.amount_try, 2),
        status=req.status,
    )


@viewer_finance_router.get(
    "/viewer/payouts",
    response_model=list[ViewerPayoutRequestItem],
    status_code=status.HTTP_200_OK,
)
async def viewer_payout_requests_list(
    session: AsyncSession = Depends(get_session),
    viewer=Depends(require_roles([UserRole.viewer])),
) -> list[ViewerPayoutRequestItem]:
    result = await session.execute(
        select(ViewerPayoutRequest)
        .where(ViewerPayoutRequest.viewer_id == viewer.id)
        .order_by(ViewerPayoutRequest.created_at.desc())
    )
    rows = list(result.scalars().all())
    return [
        ViewerPayoutRequestItem(
            id=r.id,
            amount_try=round(r.amount_try, 2),
            status=r.status,
            iban=r.iban,
            note=r.note,
            created_at=r.created_at,
            processed_at=r.processed_at,
        )
        for r in rows
    ]

