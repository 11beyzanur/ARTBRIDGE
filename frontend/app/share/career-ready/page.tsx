"use client"

import type { CareerReadyShareResponse } from "@shared/contracts/career_ready"
import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

const RICH_DEMO = process.env.NEXT_PUBLIC_ARTBRIDGE_RICH_DEMO !== "false"

const demoCareerShare = (): CareerReadyShareResponse => ({
  share_display_name: "Ada Yılmaz",
  required_reviews: 4,
  completed_reviews: 4,
  progress_percent: 88,
  target_label: "Kariyere Hazırlık Analizi",
  avg_score: 8.74,
  items: [
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
        "Işık-malzeme okuması üst düzey; ritim kurulumları net. Kamera hareketlerinde küçük sadeleştirmeler faydalı.",
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
})

function formatDate(dateString: string) {
  const d = new Date(dateString)
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString()
}

function CareerReadyShareContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") ?? ""

  const [data, setData] = useState<CareerReadyShareResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!token) {
        setError("Geçersiz link")
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        if (RICH_DEMO && (token === "demo-public-career-ready" || token.startsWith("demo-"))) {
          if (!cancelled) setData(demoCareerShare())
          return
        }
        const res = await fetch(`/api/career-ready/share?token=${encodeURIComponent(token)}`, {
          method: "GET",
          cache: "no-store"
        })
        const body = await res.json().catch(() => null)
        if (!res.ok) {
          if (!cancelled) setError(body?.detail ?? "Paylaşım verisi alınamadı")
          return
        }

        if (!cancelled) setData(body as CareerReadyShareResponse)
      } catch {
        if (!cancelled) setError("Sunucuya bağlanılamadı")
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold text-gray-900">Kariyere Hazırlık Analizi</h2>
        <p className="text-sm text-gray-600">Paylaşılabilir özet (email gizlidir)</p>
      </div>

      {error ? (
        <div role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <p className="text-sm text-gray-600">Analiz yükleniyor...</p>
        </div>
      ) : null}

      {data && !isLoading ? (
        <>
          <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <p className="text-sm text-gray-600">Öğrenci</p>
                <p className="text-lg font-semibold text-gray-900">{data.share_display_name}</p>
              </div>

              <div className="flex flex-col gap-1">
                <p className="text-sm text-gray-600">İlerleme</p>
                <p className="text-lg font-semibold text-gray-900">
                  {data.completed_reviews} / {data.required_reviews} ({data.progress_percent}%)
                </p>
              </div>
            </div>

            <div className="mt-4 h-3 w-full rounded-full bg-gray-100 ring-1 ring-gray-200">
              <div className="h-3 rounded-full bg-indigo-600" style={{ width: `${data.progress_percent}%` }} />
            </div>

            <div className="mt-3 flex flex-wrap gap-3">
              <span className="inline-flex items-center rounded-md bg-gray-50 px-3 py-1 text-xs text-gray-700 ring-1 ring-gray-200">
                Avg. skor: {data.avg_score === null ? "—" : data.avg_score.toFixed(2)}
              </span>
            </div>
          </section>

          <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h3 className="text-base font-semibold text-gray-900">Onaylı yorumlar</h3>
            {data.items.length === 0 ? (
              <p className="mt-2 text-sm text-gray-600">Henüz paylaşılabilir yorum yok.</p>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                {data.items.slice(0, 8).map((item) => (
                  <article key={item.session_id} className="rounded-lg border border-gray-100 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-semibold text-gray-900">{item.discipline}</p>
                        <p className="text-xs text-gray-500">Tamamlanma: {formatDate(item.completed_at)}</p>
                      </div>
                      <span className="inline-flex items-center rounded-md bg-gray-50 px-3 py-1 text-xs text-gray-700 ring-1 ring-gray-200">
                        {item.avg_score.toFixed(2)} / 10
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

export default function CareerReadySharePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-10">
          <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <p className="text-sm text-gray-600">Analiz yükleniyor...</p>
          </div>
        </main>
      }
    >
      <CareerReadyShareContent />
    </Suspense>
  )
}

