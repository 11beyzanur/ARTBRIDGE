# ARTBRIDGE 2.0

## Monorepo yapısı
- `backend`: FastAPI (auth + JWT + role-based altyapı)
- `frontend`: Next.js (Tailwind) (login/register/dashboard UI + backend ile iletişim)
- `shared`: ortak tipler (TypeScript)

## Backend
`cd backend && cp .env.example .env`

## Frontend
`cd frontend && cp .env.example .env`

## Kullanım (MVP Flow)
- Öğrenci: `/register` -> `/login` -> `/upload` -> "Değerlendirmeye Gönder"
- Viewer: `/login` (viewer rolüyle) -> `/viewer/review` -> disipline göre "Sonraki görev" -> puanla ve gönder

