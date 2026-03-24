"use client"

import type {
  CareerReadyAnalysisItem,
  CareerReadyMineResponse,
  CareerReadyShareTokenResponse
} from "@shared/contracts/career_ready"
import { useEffect, useMemo, useState } from "react"

const RICH_DEMO = process.env.NEXT_PUBLIC_ARTBRIDGE_RICH_DEMO !== "false"

const demoCareerItems: CareerReadyAnalysisItem[] = [
  {
    session_id: "demo-cr-1",
    discipline: "İllüstrasyon",
    completed_at: "2025-03-28T12:00:00.000Z",
    public_summary:
      "Seri bağlantılı üç işte tutarlı bir görsel dil; figür-çevre dengesi güçlü. Profesyonel sunuma yakın.",
    conceptual_consistency_score: 9.0,
    technical_adequacy_score: 8.85,
    originality_score: 8.9,
    avg_score: 8.92
  },
  {
    session_id: "demo-cr-2",
    discipline: "Grafik Tasarım",
    completed_at: "2025-03-15T09:30:00.000Z",
    public_summary:
      "Tipografi kararları olgun; grid disiplinine sadık. Marka tonunu bir tık sıcaklaştırması önerildi.",
    conceptual_consistency_score: 8.75,
    technical_adequacy_score: 8.9,
    originality_score: 8.6,
    avg_score: 8.75
  },
  {
    session_id: "demo-cr-3",
    discipline: "3D Animasyon",
    completed_at: "2025-02-22T16:00:00.000Z",
    public_summary:
      "Işık- malzeme okuması üst düzey; ritim kurulumları net. Kamera hareketlerinde küçük sadeleştirmeler faydalı.",
    conceptual_consistency_score: 8.6,
    technical_adequacy_score: 8.95,
    originality_score: 8.55,
    avg_score: 8.7
  },
  {
    session_id: "demo-cr-4",
    discipline: "Heykel / Mekân",
    completed_at: "2025-02-01T14:20:00.000Z",
    public_summary:
      "Form arayışı cesur; ölçü ve yerleştirme güçlü. Dokusal varyasyonu artırarak derinlik kazanabilir.",
    conceptual_consistency_score: 8.55,
    technical_adequacy_score: 8.45,
    originality_score: 8.8,
    avg_score: 8.6
  }
]

const demoCareerMine = (): CareerReadyMineResponse => ({
  display_name: "Ada Yılmaz",
  required_reviews: 4,
  completed_reviews: 4,
  progress_percent: 88,
  target_label: "Kariyere Hazırlık Analizi",
  avg_score: 8.74,
  items: demoCareerItems
})

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
      if (RICH_DEMO) {
        setData(demoCareerMine())
        return
      }
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
      let tokenValue: string
      if (RICH_DEMO) {
        tokenValue = "demo-public-career-ready"
      } else {
        const res = await fetch("/api/career-ready/share-token", { method: "GET", cache: "no-store" })
        const body = await res.json().catch(() => null)
        if (!res.ok || !body?.token) {
          setError(body?.detail ?? "Paylaşım token'ı alınamadı")
          return
        }
        tokenValue = (body as CareerReadyShareTokenResponse).token
      }

      const url = `${window.location.origin}/share/career-ready?token=${encodeURIComponent(tokenValue)}`

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

