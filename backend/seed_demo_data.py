import argparse
import asyncio
import datetime as dt
import uuid

from sqlalchemy import delete, select

from app.core.security import hash_password
from app.db.session import Base, async_session_maker, engine
from app.models.portfolio import Portfolio, PortfolioStatus
from app.models.review import Review
from app.models.review_session import ReviewSession, ReviewSessionStatus
from app.models.subscription import StudentSubscription
from app.models.user import User, UserRole
from app.models.employer_package_subscription import (
    EmployerPackageSubscription,
    EmployerPlanType,
    EmployerSubscriptionStatus,
)


SEED_PASSWORD = "Password123!"


def now_utc() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


async def ensure_schema() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def seed_students(
    *,
    session,
    student_specs: list[dict],
    reset: bool,
) -> None:
    # For demo stability, clear existing demo data related to these students.
    seed_emails = [spec["email"] for spec in student_specs]
    student_ids = await session.execute(select(User.id).where(User.email.in_(seed_emails)))
    existing_student_ids = [r[0] for r in student_ids.all()]

    if reset and existing_student_ids:
        await session.execute(delete(StudentSubscription).where(StudentSubscription.student_id.in_(existing_student_ids)))

    # Clear portfolio + review sessions for those students to avoid duplicate FK graph
    if existing_student_ids:
        await session.execute(
            delete(Review).where(
                Review.session_id.in_(
                    select(ReviewSession.id).where(ReviewSession.student_id.in_(existing_student_ids))
                )
            )
        )
        await session.execute(delete(ReviewSession).where(ReviewSession.student_id.in_(existing_student_ids)))
        await session.execute(delete(Portfolio).where(Portfolio.student_id.in_(existing_student_ids)))

    # Upsert users
    for spec in student_specs:
        result = await session.execute(select(User).where(User.email == spec["email"]))
        user = result.scalar_one_or_none()

        if user is None:
            user = User(
                email=spec["email"],
                password_hash=hash_password(SEED_PASSWORD),
                role=UserRole.student.value,
                display_name=spec["display_name"],
            )
            session.add(user)
            await session.flush()

        # Create portfolios + review sessions + reviews
        for portfolio_spec in spec["portfolios"]:
            portfolio_id = portfolio_spec["portfolio_id"]

            portfolio = Portfolio(
                id=portfolio_id,
                student_id=user.id,
                discipline=portfolio_spec["discipline"],
                technique=portfolio_spec["technique"],
                school=portfolio_spec["school"],
                asset_key=portfolio_spec["asset_key"],
                content_type=portfolio_spec["content_type"],
                file_size=portfolio_spec.get("file_size"),
                status=PortfolioStatus.uploaded.value,
                created_at=portfolio_spec.get("created_at") or now_utc(),
                uploaded_at=portfolio_spec.get("uploaded_at") or now_utc(),
            )
            session.add(portfolio)
            await session.flush()

            review_session_spec = portfolio_spec["review_session"]
            rs = ReviewSession(
                id=review_session_spec["session_id"],
                student_id=user.id,
                portfolio_id=portfolio_id,
                viewer_id=review_session_spec.get("viewer_id"),
                discipline=review_session_spec["discipline"],
                status=ReviewSessionStatus.completed.value,
                created_at=review_session_spec["created_at"],
                completed_at=review_session_spec["completed_at"],
                assigned_at=None,
            )
            # Note: assigned_at is nullable, and can remain None in this seed.
            session.add(rs)
            await session.flush()

            review = Review(
                session_id=rs.id,
                viewer_id=review_session_spec.get("viewer_id") or user.id,
                conceptual_consistency_score=review_session_spec["conceptual"],
                technical_adequacy_score=review_session_spec["technical"],
                originality_score=review_session_spec["originality"],
                private_comment=review_session_spec.get("private_comment") or "Demo özel yorum",
                public_summary=review_session_spec["public_summary"],
                created_at=now_utc(),
            )
            session.add(review)


async def seed_viewer_and_employer_users(*, session, reset: bool) -> dict[str, str]:
    viewer_email = "viewer1@artbridge.demo"
    employer_email = "employer1@artbridge.demo"

    result = await session.execute(select(User).where(User.email == viewer_email))
    viewer = result.scalar_one_or_none()
    if viewer is None:
        viewer = User(
            email=viewer_email,
            password_hash=hash_password(SEED_PASSWORD),
            role=UserRole.viewer.value,
            display_name="Viewer Demo",
        )
        session.add(viewer)
        await session.flush()

    result = await session.execute(select(User).where(User.email == employer_email))
    employer = result.scalar_one_or_none()
    if employer is None:
        employer = User(
            email=employer_email,
            password_hash=hash_password(SEED_PASSWORD),
            role=UserRole.employer.value,
            display_name="Employer Demo",
        )
        session.add(employer)
        await session.flush()

    # Seed enterprise access for employer demo to enable "Learning Agility" feature
    if reset:
        await session.execute(
            delete(EmployerPackageSubscription).where(EmployerPackageSubscription.employer_id == employer.id)
        )

    result = await session.execute(
        select(EmployerPackageSubscription).where(EmployerPackageSubscription.employer_id == employer.id)
    )
    existing = result.scalars().all()
    if not existing:
        record = EmployerPackageSubscription(
            employer_id=employer.id,
            plan_type=EmployerPlanType.enterprise.value,
            pricing_plan_reference_code="demo-enterprise-plan",
            checkout_token=None,
            subscription_reference_code=None,
            order_reference_code=None,
            customer_reference_code=None,
            status=EmployerSubscriptionStatus.active.value,
        )
        session.add(record)
        await session.flush()

    return {"viewer_id": viewer.id, "employer_id": employer.id}


async def main(*, reset: bool) -> None:
    await ensure_schema()

    async with async_session_maker() as session:
        ids = await seed_viewer_and_employer_users(session=session, reset=reset)
        viewer_id = ids["viewer_id"]

        t = now_utc()
        student_specs = [
            {
                "email": "student1@artbridge.demo",
                "display_name": "Ada Yılmaz",
                "portfolios": [
                    {
                        "portfolio_id": str(uuid.uuid4()),
                        "discipline": "İllüstrasyon",
                        "technique": "Ink & Digital",
                        "school": "Demo Sanat Koleji",
                        "asset_key": "artbridge/demo/illus/portfolio1.png",
                        "content_type": "image/png",
                        "file_size": None,
                        "uploaded_at": t - dt.timedelta(days=62),
                        "created_at": t - dt.timedelta(days=62),
                        "review_session": {
                            "session_id": str(uuid.uuid4()),
                            "discipline": "İllüstrasyon",
                            "viewer_id": viewer_id,
                            "created_at": t - dt.timedelta(days=60),
                            "completed_at": t - dt.timedelta(days=58),
                            "conceptual": 8,
                            "technical": 9,
                            "originality": 8,
                            "public_summary": "Güçlü kompozisyon ve tutarlı anlatım. Teknikte netlik var.",
                            "private_comment": "Harika kontrol. Bir sonraki adım detaylarda çeşitlilik.",
                        },
                    },
                    {
                        "portfolio_id": str(uuid.uuid4()),
                        "discipline": "İllüstrasyon",
                        "technique": "Ink & Digital",
                        "school": "Demo Sanat Koleji",
                        "asset_key": "artbridge/demo/illus/portfolio2.png",
                        "content_type": "image/png",
                        "file_size": None,
                        "uploaded_at": t - dt.timedelta(days=32),
                        "created_at": t - dt.timedelta(days=32),
                        "review_session": {
                            "session_id": str(uuid.uuid4()),
                            "discipline": "İllüstrasyon",
                            "viewer_id": viewer_id,
                            "created_at": t - dt.timedelta(days=30),
                            "completed_at": t - dt.timedelta(days=28),
                            "conceptual": 9,
                            "technical": 8,
                            "originality": 9,
                            "public_summary": "Kavramsal birlik yüksek. Renk paleti ve özgünlük başarılı.",
                            "private_comment": "Gelişim güçlü. Seriyi bir konsept altında toplulaştır.",
                        },
                    },
                    {
                        "portfolio_id": str(uuid.uuid4()),
                        "discipline": "İllüstrasyon",
                        "technique": "Digital Painting",
                        "school": "Demo Sanat Koleji",
                        "asset_key": "artbridge/demo/illus/portfolio3.png",
                        "content_type": "image/png",
                        "file_size": None,
                        "uploaded_at": t - dt.timedelta(days=12),
                        "created_at": t - dt.timedelta(days=12),
                        "review_session": {
                            "session_id": str(uuid.uuid4()),
                            "discipline": "İllüstrasyon",
                            "viewer_id": viewer_id,
                            "created_at": t - dt.timedelta(days=10),
                            "completed_at": t - dt.timedelta(days=8),
                            "conceptual": 8,
                            "technical": 8,
                            "originality": 7,
                            "public_summary": "Özgün bakış var. Teknik yeterlilik stabil ve iyi uygulanmış.",
                            "private_comment": "Tutarlılık iyi. Bir sonraki adım hikaye derinliği.",
                        },
                    },
                    {
                        "portfolio_id": str(uuid.uuid4()),
                        "discipline": "İllüstrasyon",
                        "technique": "Digital Painting",
                        "school": "Demo Sanat Koleji",
                        "asset_key": "artbridge/demo/illus/portfolio4.png",
                        "content_type": "image/png",
                        "file_size": None,
                        "uploaded_at": t - dt.timedelta(days=4),
                        "created_at": t - dt.timedelta(days=4),
                        "review_session": {
                            "session_id": str(uuid.uuid4()),
                            "discipline": "İllüstrasyon",
                            "viewer_id": viewer_id,
                            "created_at": t - dt.timedelta(days=2),
                            "completed_at": t - dt.timedelta(days=1),
                            "conceptual": 10,
                            "technical": 9,
                            "originality": 8,
                            "public_summary": "Seviye yükselmiş: güçlü kavramsal tutarlılık ve özgüvenli çizim dili.",
                            "private_comment": "Çok iyi. Son adım olarak varyasyon çalışmaları ekle.",
                        },
                    },
                ],
            },
            {
                "email": "student2@artbridge.demo",
                "display_name": "Mert Kaya",
                "portfolios": [
                    {
                        "portfolio_id": str(uuid.uuid4()),
                        "discipline": "İllüstrasyon",
                        "technique": "Sketch & Color",
                        "school": "Demo Tasarım MYO",
                        "asset_key": "artbridge/demo/illus/portfolio5.png",
                        "content_type": "image/png",
                        "file_size": None,
                        "uploaded_at": t - dt.timedelta(days=20),
                        "created_at": t - dt.timedelta(days=20),
                        "review_session": {
                            "session_id": str(uuid.uuid4()),
                            "discipline": "İllüstrasyon",
                            "viewer_id": viewer_id,
                            "created_at": t - dt.timedelta(days=18),
                            "completed_at": t - dt.timedelta(days=16),
                            "conceptual": 6,
                            "technical": 7,
                            "originality": 6,
                            "public_summary": "Anlatım net ama tutarlılık geliştirilebilir. Teknik fena değil.",
                            "private_comment": "Kompozisyonu daha güçlü kıl. Işık-gölge varyasyonu çalış.",
                        },
                    },
                    {
                        "portfolio_id": str(uuid.uuid4()),
                        "discipline": "İllüstrasyon",
                        "technique": "Sketch & Color",
                        "school": "Demo Tasarım MYO",
                        "asset_key": "artbridge/demo/illus/portfolio6.png",
                        "content_type": "image/png",
                        "file_size": None,
                        "uploaded_at": t - dt.timedelta(days=8),
                        "created_at": t - dt.timedelta(days=8),
                        "review_session": {
                            "session_id": str(uuid.uuid4()),
                            "discipline": "İllüstrasyon",
                            "viewer_id": viewer_id,
                            "created_at": t - dt.timedelta(days=6),
                            "completed_at": t - dt.timedelta(days=5),
                            "conceptual": 7,
                            "technical": 6,
                            "originality": 7,
                            "public_summary": "Özgünlük artmış. Teknikte bazı dengesizlikler var ama gelişim görülüyor.",
                            "private_comment": "Renk dengesi iyileştirilmeli. Birkaç çalışma daha öneririm.",
                        },
                    },
                ],
            },
        ]

        await seed_students(session=session, student_specs=student_specs, reset=reset)
        await session.commit()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true", help="Seed tables related to demo students")
    args = parser.parse_args()

    asyncio.run(main(reset=args.reset))

