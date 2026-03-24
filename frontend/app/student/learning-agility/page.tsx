"use client"

import type { LearningAgilityDisciplineBreakdown, LearningAgilityMineResponse } from "@shared/contracts/learning_agility"
import { useEffect, useMemo, useState } from "react"

const RICH_DEMO = process.env.NEXT_PUBLIC_ARTBRIDGE_RICH_DEMO !== "false"

const demoLearningAgilityMine = (): LearningAgilityMineResponse => ({
  target_days: 14,
  overall_avg_days_to_apply: 10.18,
  overall_avg_agility_score: 87.42,
  transitions_count: 9,
  disciplines: [
    {
      discipline: "İllüstrasyon",
      avg_days_to_apply: 9.65,
      avg_agility_score: 88.6,
      transitions: [
        {
          from_session_id: "demo-ill-1",
          to_session_id: "demo-ill-2",
          completed_at: "2025-02-02T11:20:00.000Z",
          next_request_created_at: "2025-02-11T16:45:00.000Z",
          days_to_apply: 9.22,
          agility_score: 89.1,
          conceptual_avg: 9.0,
          technical_avg: 8.8,
          originality_avg: 8.9
        },
        {
          from_session_id: "demo-ill-2",
          to_session_id: "demo-ill-3",
          completed_at: "2025-02-28T09:00:00.000Z",
          next_request_created_at: "2025-03-09T10:30:00.000Z",
          days_to_apply: 9.06,
          agility_score: 89.5,
          conceptual_avg: 9.1,
          technical_avg: 8.85,
          originality_avg: 8.95
        },
        {
          from_session_id: "demo-ill-3",
          to_session_id: "demo-ill-4",
          completed_at: "2025-03-22T14:00:00.000Z",
          next_request_created_at: "2025-03-31T08:00:00.000Z",
          days_to_apply: 8.75,
          agility_score: 90.2,
          conceptual_avg: 9.05,
          technical_avg: 8.95,
          originality_avg: 9.0
        }
      ]
    },
    {
      discipline: "Grafik Tasarım",
      avg_days_to_apply: 10.72,
      avg_agility_score: 86.15,
      transitions: [
        {
          from_session_id: "demo-gra-1",
          to_session_id: "demo-gra-2",
          completed_at: "2025-01-18T12:00:00.000Z",
          next_request_created_at: "2025-01-29T09:15:00.000Z",
          days_to_apply: 10.88,
          agility_score: 85.9,
          conceptual_avg: 8.6,
          technical_avg: 8.55,
          originality_avg: 8.5
        },
        {
          from_session_id: "demo-gra-2",
          to_session_id: "demo-gra-3",
          completed_at: "2025-03-05T13:30:00.000Z",
          next_request_created_at: "2025-03-16T11:00:00.000Z",
          days_to_apply: 10.56,
          agility_score: 86.4,
          conceptual_avg: 8.65,
          technical_avg: 8.6,
          originality_avg: 8.55
        }
      ]
    },
    {
      discipline: "3D Animasyon",
      avg_days_to_apply: 11.05,
      avg_agility_score: 84.9,
      transitions: [
        {
          from_session_id: "demo-3d-1",
          to_session_id: "demo-3d-2",
          completed_at: "2025-02-10T10:00:00.000Z",
          next_request_created_at: "2025-02-22T15:20:00.000Z",
          days_to_apply: 12.22,
          agility_score: 82.7,
          conceptual_avg: 8.4,
          technical_avg: 8.7,
          originality_avg: 8.35
        }
      ]
    }
  ]
})

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "—"
  return value.toFixed(2)
}

function badgeClass(status: string) {
  if (status === "completed") return "bg-green-50 text-green-800 ring-green-200"
  if (status === "assigned") return "bg-indigo-50 text-indigo-800 ring-indigo-200"
  if (status === "queued") return "bg-yellow-50 text-yellow-800 ring-yellow-200"
  return "bg-gray-50 text-gray-800 ring-gray-200"
}

function DisciplineCard({ breakdown }: { breakdown: LearningAgilityDisciplineBreakdown }) {
  const transitions = breakdown.transitions

  const latest = transitions.length ? transitions[0] : null
  const avgDays = breakdown.avg_days_to_apply
  const avgScore = breakdown.avg_agility_score

  return (
    <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col">
          <h3 className="text-base font-semibold text-gray-900">{breakdown.discipline}</h3>
          <p className="text-sm text-gray-600">
            {transitions.length ? `${transitions.length} geçiş` : "Henüz veri yok"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`inline-flex items-center rounded-md px-3 py-1 text-xs ring-1 ${badgeClass("completed")}`}>
            Avg. {formatNumber(avgScore)} skor
          </span>
          <span className="inline-flex items-center rounded-md bg-gray-50 px-3 py-1 text-xs text-gray-700 ring-1 ring-gray-200">
            Avg. {formatNumber(avgDays)} gün
          </span>
        </div>
      </div>

      {transitions.length ? (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="py-2 pr-2 font-medium text-gray-700">Bitiş</th>
                <th className="py-2 pr-2 font-medium text-gray-700">Sonraki talep</th>
                <th className="py-2 pr-2 font-medium text-gray-700">Gün</th>
                <th className="py-2 pr-2 font-medium text-gray-700">Skor</th>
              </tr>
            </thead>
            <tbody>
              {transitions
                .slice()
                .reverse()
                .map((t) => (
                  <tr key={t.from_session_id} className="border-b border-gray-50">
                    <td className="py-2 pr-2 text-gray-700">{new Date(t.completed_at).toLocaleDateString()}</td>
                    <td className="py-2 pr-2 text-gray-700">
                      {new Date(t.next_request_created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2 pr-2 text-gray-700">{t.days_to_apply.toFixed(2)}</td>
                    <td className="py-2 pr-2 text-gray-900">{t.agility_score.toFixed(2)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}

export default function LearningAgilityPage() {
  const [data, setData] = useState<LearningAgilityMineResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [refreshKey, setRefreshKey] = useState(0)

  const hasData = useMemo(() => {
    return !!data && data.disciplines.some((d) => d.transitions.length > 0)
  }, [data])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        setIsLoading(true)
        setError(null)
        if (RICH_DEMO) {
          if (!cancelled) setData(demoLearningAgilityMine())
          return
        }
        const res = await fetch("/api/learning-agility/mine", { method: "GET", cache: "no-store" })
        const body = await res.json().catch(() => null)
        if (!res.ok || !body) {
          if (!cancelled) setError(body?.detail ?? "Veri alınamadı")
          return
        }
        if (!cancelled) setData(body as LearningAgilityMineResponse)
      } catch {
        if (!cancelled) setError("Sunucuya bağlanılamadı")
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold text-gray-900">Öğrenme İvmesi</h2>
          <p className="text-sm text-gray-600">
            Tamamlanan değerlendirmelerden sonra bir sonraki talebe kadar geçen hız (hedef: 14 gün)
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshKey((x) => x + 1)}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          disabled={isLoading}
        >
          {isLoading ? "Yükleniyor..." : "Yenile"}
        </button>
      </div>

      {error ? (
        <div role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <p className="text-sm text-gray-600">Veriler hazırlanıyor...</p>
        </div>
      ) : null}

      {data && !isLoading ? (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <p className="text-sm text-gray-600">Genel Avg. Gün</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{formatNumber(data.overall_avg_days_to_apply)}</p>
          </div>
          <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <p className="text-sm text-gray-600">Genel Avg. Skor</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{formatNumber(data.overall_avg_agility_score)}</p>
          </div>
          <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <p className="text-sm text-gray-600">Toplam Geçiş</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{data.transitions_count}</p>
          </div>
        </section>
      ) : null}

      {data && !isLoading ? (
        <div className="flex flex-col gap-4">
          {data.disciplines.map((d) => (
            <DisciplineCard key={d.discipline} breakdown={d} />
          ))}
          {!hasData ? (
            <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
              <p className="text-sm text-gray-600">Henüz öğrenme ivmesi verisi oluşmadı. Önce portfolyo yükleyip değerlendirmeye gönder.</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </main>
  )
}

