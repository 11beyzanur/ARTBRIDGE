"use client"

import type {
  CareerReadyAnalysisItem,
  CareerReadyMineResponse,
  CareerReadyShareTokenResponse
} from "@shared/contracts/career_ready"
import { useEffect, useMemo, useState } from "react"

function formatDate(dateString: string) {
  const d = new Date(dateString)
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString()
}

function progressBarColor(percent: number) {
  if (percent >= 100) return "bg-green-600"
  if (percent >= 60) return "bg-indigo-600"
  if (percent >= 30) return "bg-yellow-600"
  return "bg-red-600"
}

function renderItemScore(item: CareerReadyAnalysisItem) {
  const avg = item.avg_score.toFixed(2)
  return `${avg} / 10`
}

export default function CareerReadyStudentPage() {
  const [data, setData] = useState<CareerReadyMineResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [toast, setToast] = useState<string | null>(null)

  const closeToast = () => setToast(null)

  const required = data?.required_reviews ?? 0
  const completed = data?.completed_reviews ?? 0
  const percent = data?.progress_percent ?? 0

  const canShare = useMemo(() => {
    return (data?.items?.length ?? 0) > 0
  }, [data])

  const fetchMine = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/career-ready/mine", { method: "GET", cache: "no-store" })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        setError(body?.detail ?? "Veri alınamadı")
        return
      }
      setData(body as CareerReadyMineResponse)
    } catch {
      setError("Sunucuya bağlanılamadı")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchMine()
  }, [])

  const handleShare = async () => {
    if (!canShare) return

    setToast(null)
    try {
      const res = await fetch("/api/career-ready/share-token", { method: "GET", cache: "no-store" })
      const body = await res.json().catch(() => null)
      if (!res.ok || !body?.token) {
        setError(body?.detail ?? "Paylaşım token'ı alınamadı")
        return
      }

      const tokenResponse = body as CareerReadyShareTokenResponse
      const url = `${window.location.origin}/share/career-ready?token=${encodeURIComponent(tokenResponse.token)}`

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
        setToast("Paylaşım bağlantısı kopyalandı")
      } else {
        setToast(url)
      }
    } catch {
      setError("Sunucuya bağlanılamadı")
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-10">
      {toast ? (
        <div
          aria-live="polite"
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold">Hazır</div>
              <div className="mt-1">{toast}</div>
            </div>
            <button
              type="button"
              onClick={closeToast}
              className="rounded-md px-2 py-1 text-gray-600 hover:bg-green-100"
              aria-label="Toast kapat"
            >
              Kapat
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold text-gray-900">Kariyere Hazırlık Analizi</h2>
        <p className="text-sm text-gray-600">Onaylı yorumlar üzerinden ilerleme ve yetkinlik özeti</p>
      </div>

      {error ? (
        <div role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <p className="text-sm text-gray-600">Analiz hazırlanıyor...</p>
        </div>
      ) : null}

      {data && !isLoading ? (
        <>
          <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <p className="text-sm text-gray-600">Öğrenci</p>
                <p className="text-lg font-semibold text-gray-900">{data.display_name}</p>
              </div>

              <div className="flex flex-col gap-1">
                <p className="text-sm text-gray-600">İlerleme</p>
                <p className="text-lg font-semibold text-gray-900">
                  {completed} / {required} ({percent}%)
                </p>
              </div>
            </div>

            <div className="mt-4 h-3 w-full rounded-full bg-gray-100 ring-1 ring-gray-200">
              <div
                className={`h-3 rounded-full ${progressBarColor(percent)}`}
                style={{ width: `${percent}%` }}
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-3">
              <span className="inline-flex items-center rounded-md bg-gray-50 px-3 py-1 text-xs text-gray-700 ring-1 ring-gray-200">
                Avg. skor: {data.avg_score === null ? "—" : data.avg_score.toFixed(2)}
              </span>

              <button
                type="button"
                onClick={handleShare}
                disabled={!canShare}
                className="inline-flex items-center justify-center rounded-md bg-gray-900 px-3 py-1 text-xs font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Paylaş (Share Link)
              </button>
            </div>
          </section>

          <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h3 className="text-base font-semibold text-gray-900">Onaylı yorumlar</h3>
            {data.items.length === 0 ? (
              <p className="mt-2 text-sm text-gray-600">Henüz paylaşılabilir yorumların oluşmadı. Reviewer(s) tamamladıkça analiz güncellenecek.</p>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                {data.items.slice(0, 6).map((item) => (
                  <article
                    key={item.session_id}
                    className="rounded-lg border border-gray-100 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-semibold text-gray-900">{item.discipline}</p>
                        <p className="text-xs text-gray-500">Tamamlanma: {formatDate(item.completed_at as unknown as string)}</p>
                      </div>
                      <span className="inline-flex items-center rounded-md bg-gray-50 px-3 py-1 text-xs text-gray-700 ring-1 ring-gray-200">
                        {renderItemScore(item)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-gray-800">{item.public_summary}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </main>
  )
}

