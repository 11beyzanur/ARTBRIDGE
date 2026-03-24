"use client"

import type { StudentReviewSessionItem, StudentReviewsResponse } from "@shared/contracts/reviews"
import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"

const RICH_DEMO = process.env.NEXT_PUBLIC_ARTBRIDGE_RICH_DEMO !== "false"

const demoStudentReviews = (): StudentReviewsResponse => ({
  items: [
    {
      session_id: "demo-sr-1",
      portfolio_id: "demo-pf-ill-1",
      discipline: "İllüstrasyon",
      technique: "Dijital / Procreate",
      status: "completed",
      created_at: "2025-02-01T09:00:00.000Z",
      completed_at: "2025-02-06T17:30:00.000Z"
    },
    {
      session_id: "demo-sr-2",
      portfolio_id: "demo-pf-gra-1",
      discipline: "Grafik Tasarım",
      technique: "Vektör / Print",
      status: "completed",
      created_at: "2025-02-20T10:15:00.000Z",
      completed_at: "2025-02-28T14:00:00.000Z"
    },
    {
      session_id: "demo-sr-3",
      portfolio_id: "demo-pf-3d-1",
      discipline: "3D Animasyon",
      technique: "Blender / Cycles",
      status: "completed",
      created_at: "2025-03-05T11:00:00.000Z",
      completed_at: "2025-03-12T16:20:00.000Z"
    },
    {
      session_id: "demo-sr-4",
      portfolio_id: "demo-pf-new",
      discipline: "Heykel / Obje",
      technique: "Seramik",
      status: "assigned",
      created_at: "2025-03-28T08:00:00.000Z",
      completed_at: null
    }
  ]
})

function statusLabel(status: string) {
  if (status === "queued") return "Sırada / queued"
  if (status === "assigned") return "Değerlendirme altında"
  if (status === "completed") return "Tamamlandı"
  return status
}

function statusBadgeClass(status: string) {
  if (status === "completed") return "bg-green-50 text-green-800 ring-green-200"
  if (status === "assigned") return "bg-indigo-50 text-indigo-800 ring-indigo-200"
  if (status === "queued") return "bg-yellow-50 text-yellow-800 ring-yellow-200"
  return "bg-gray-50 text-gray-800 ring-gray-200"
}

function StudentReviewsContent() {
  const searchParams = useSearchParams()
  const highlightedPortfolioId = searchParams.get("portfolio_id")

  const [items, setItems] = useState<StudentReviewSessionItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pollingActive, setPollingActive] = useState(true)

  const lastCompletedRef = useRef<Record<string, boolean>>({})

  const [toast, setToast] = useState<{ message: string } | null>(null)
  const toastTimerRef = useRef<number | null>(null)

  const activePresence = useMemo(() => {
    return items.some((item) => item.status !== "completed")
  }, [items])

  const highlighted = useMemo(() => {
    if (!highlightedPortfolioId) return null
    return items.find((x) => x.portfolio_id === highlightedPortfolioId) ?? null
  }, [highlightedPortfolioId, items])

  useEffect(() => {
    let intervalId: number | undefined
    let cancelled = false

    const fetchMine = async () => {
      try {
        setError(null)
        let data: StudentReviewsResponse | null = null
        if (RICH_DEMO) {
          data = demoStudentReviews()
        } else {
          const res = await fetch("/api/reviews/mine", { method: "GET", cache: "no-store" })
          if (!res.ok) {
            const errBody = await res.json().catch(() => null)
            if (!cancelled) setError(errBody?.detail ?? "Durum okunamadı")
            return
          }
          data = (await res.json().catch(() => null)) as StudentReviewsResponse | null
        }
        if (!data) return

        if (!cancelled) {
          setItems(data.items)

          if (highlightedPortfolioId) {
            const matching = data.items.find((x) => x.portfolio_id === highlightedPortfolioId)
            if (matching?.status === "completed" && !lastCompletedRef.current[highlightedPortfolioId]) {
              lastCompletedRef.current[highlightedPortfolioId] = true

              setToast({
                message: "Değerlendirme tamamlandı. tebrikler!",
              })
            }
          }
        }
      } catch {
        if (!cancelled) setError("Sunucuya bağlanılamadı")
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchMine()
    intervalId = window.setInterval(() => {
      if (!pollingActive) return
      fetchMine()
    }, 3000)

    return () => {
      cancelled = true
      if (intervalId) window.clearInterval(intervalId)
    }
  }, [highlightedPortfolioId, pollingActive])

  useEffect(() => {
    if (!activePresence) setPollingActive(false)
  }, [activePresence])

  useEffect(() => {
    if (!toast) return

    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null)
      toastTimerRef.current = null
    }, 4500)

    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
      toastTimerRef.current = null
    }
  }, [toast])

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-10">
      {toast ? (
        <div
          aria-live="polite"
          role="status"
          className="fixed bottom-5 right-5 z-50 flex max-w-sm items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900 shadow-lg"
        >
          <div className="font-semibold">Tamamlandı</div>
          <div className="text-green-900">{toast.message}</div>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Toast kapat"
            className="ml-auto rounded-md px-2 py-1 text-gray-600 hover:bg-green-100"
          >
            Kapat
          </button>
        </div>
      ) : null}

      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold text-gray-900">Öğrenci - Review Durumlarım</h2>
        <p className="text-sm text-gray-600">Değerlendirme kuyruğu ve tamamlanma durumun burada görünür.</p>
      </div>

      {highlighted ? (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            highlighted.status === "completed"
              ? "border-green-200 bg-green-50 text-green-800"
              : highlighted.status === "assigned"
                ? "border-indigo-200 bg-indigo-50 text-indigo-800"
                : "border-yellow-200 bg-yellow-50 text-yellow-800"
          }`}
          role="status"
        >
          {highlighted.status === "queued"
            ? "Portfolyon değerlendirme sırasında"
            : highlighted.status === "assigned"
              ? "Portfolyon şu anda değerlendiriliyor"
              : "Portfolyon değerlendirildi ve tamamlandı"}
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <p className="text-sm text-gray-600">Durumlar yükleniyor...</p>
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <p className="text-sm text-gray-600">
            Henüz review talebin yok. Portfolyo yükledikten sonra değerlendirmeye gönderebilirsin.
          </p>
        </div>
      ) : null}

      {items.map((item) => {
        const isHighlighted = highlightedPortfolioId && item.portfolio_id === highlightedPortfolioId
        return (
          <section
            key={item.session_id}
            className={`rounded-lg bg-white p-5 shadow-sm ring-1 ${
              isHighlighted ? "ring-gray-900" : "ring-gray-200"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-gray-900">{item.discipline}</p>
                <p className="text-xs text-gray-500">Teknik: {item.technique}</p>
              </div>

              <div className={`inline-flex items-center rounded-md px-3 py-1 text-xs ring-1 ${statusBadgeClass(item.status)}`}>
                {statusLabel(item.status)}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-4">
              <p className="text-xs text-gray-500">Oluşturma: {new Date(item.created_at).toLocaleString()}</p>
              {item.completed_at ? (
                <p className="text-xs text-gray-500">
                  Tamamlanma: {new Date(item.completed_at).toLocaleString()}
                </p>
              ) : null}
            </div>
          </section>
        )
      })}
    </main>
  )
}

export default function StudentReviewsPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-10">
          <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
            <p className="text-sm text-gray-600">Durumlar yükleniyor...</p>
          </div>
        </main>
      }
    >
      <StudentReviewsContent />
    </Suspense>
  )
}

