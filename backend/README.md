# ARTBRIDGE Backend (FastAPI)

## Prerequisites
- Python 3.10+

## Setup
1. `cd backend`
2. `python3 -m venv .venv`
3. Activate venv
4. `pip install -r requirements.txt`
5. Copy env: `.env.example` -> `.env` and set `JWT_SECRET_KEY`
   - Varsayılan olarak `artbridge.db` kullanılır

## Run
`uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`

## Endpoints
- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /portfolios/presign`
- `POST /portfolios/{portfolio_id}/finalize`
- `POST /reviews/request`
- `GET /reviews/mine`
- `GET /reviews/next?discipline=...`
- `POST /reviews/{session_id}/submit`
- `POST /subscriptions/iyzico/b2c/initialize`
- `GET /subscriptions/me`
- `POST /iyzico/subscriptions/checkout/callback`
- `POST /iyzico/subscriptions/webhook`

## S3 Gereksinimleri
`AWS_REGION` ve `AWS_S3_BUCKET` zorunludur

Yerel geliştirmede `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` de tanımlanabilir

## Demo Veri (Hızlı Seed)
Önce backend’i ayağa kaldır.

Sonra:
`python3 seed_demo_data.py --reset`

Demo giriş bilgileri:
- Student: `student1@artbridge.demo` / `Password123!`
- Student: `student2@artbridge.demo` / `Password123!`
- Viewer: `viewer1@artbridge.demo` / `Password123!`
- Employer: `employer1@artbridge.demo` / `Password123!`

Seed sonrasında employer filtre/sıralama ekranı boş kalmayacak.

