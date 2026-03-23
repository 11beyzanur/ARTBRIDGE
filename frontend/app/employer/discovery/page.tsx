"use client"

import type { EmployerCandidateItem, EmployerDiscoverySearchRequest, EmployerDiscoverySearchResponse } from "@shared/contracts/employer_discovery"
import { useEffect, useMemo, useState } from "react"

function formatPercent(value: number) {
  const safe = Number.isFinite(value) ? value : 0
  return `${safe}%`
}

function formatScore(value: number) {
  const safe = Number.isFinite(value) ? value : 0
  return safe.toFixed(2)
}

function snippet(text: string, maxLen: number) {
  const t = text ?? ""
  if (t.length <= maxLen) return t
  return `${t.slice(0, maxLen)}...`
}

export default function EmployerDiscoveryPage() {
  const [discipline, setDiscipline] = useState("İllüstrasyon")
  const [scoreMin, setScoreMin] = useState<number>(7)
  const [scoreMax, setScoreMax] = useState<number>(10)
  const [careerReadyOnly, setCareerReadyOnly] = useState(true)
  const [limit, setLimit] = useState<number>(10)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<EmployerDiscoverySearchResponse | null>(null)

  const [canAccessLearningAgility, setCanAccessLearningAgility] = useState(false)

  const requestPayload = useMemo<EmployerDiscoverySearchRequest>(() => {
    return {
      discipline: discipline.trim(),
      score_min: scoreMin,
      score_max: scoreMax,
      career_ready_only: careerReadyOnly,
      limit
    }
  }, [careerReadyOnly, discipline, limit, scoreMax, scoreMin])

  useEffect(() => {
    let cancelled = false

    const fetchMe = async () => {
      try {
        const res = await fetch("/api/employers/packages/me", { method: "GET", cache: "no-store" })
        const body = await res.json().catch(() => null)
        if (!res.ok || !body) return
        if (!cancelled) setCanAccessLearningAgility(!!body.can_access_learning_agility)
      } catch {
        // ignore; feature will remain hidden
      }
    }

    void fetchMe()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSearch = async () => {
    const d = discipline.trim()
    if (!d) {
      setError("Lütfen disiplin gir")
      return
    }

    if (scoreMin > scoreMax) {
      setError("Score min, score max değerinden büyük olamaz")
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch("/api/employers/discovery/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
        cache: "no-store"
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.detail ?? "Arama başarısız")
        return
      }

      const body = (await res.json().catch(() => null)) as EmployerDiscoverySearchResponse | null
      if (!body) {
        setError("Sonuç alınamadı")
        return
      }
      setResult(body)
    } catch {
      setError("Sunucuya bağlanılamadı")
    } finally {
      setLoading(false)
    }
  }

  const candidates = result?.items ?? []

  useEffect(() => {
    // Sunum için boş ekran yerine ilk filtreyle otomatik arama yapıyoruz
    void handleSearch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold text-gray-900">Akıllı Aday Keşfi</h2>
        <p className="text-sm text-gray-600">
          Kariyer Puanı, seçilen disiplin içindeki tamamlanmış review’lardan gelen 3 skor ortalamasıdır.
        </p>
      </div>

      <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">Filtreler</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="discipline" className="text-sm font-medium text-gray-800">
              Disiplin
            </label>
            <input
              id="discipline"
              value={discipline}
              aria-label="Disiplin"
              onChange={(e) => setDiscipline(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-gray-500 focus:ring-0"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-800">Career-Ready</span>
              <span className="text-xs text-gray-600">Sadece kariyere hazır adaylar</span>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={careerReadyOnly}
                onChange={(e) => setCareerReadyOnly(e.target.checked)}
                aria-label="Career-Ready filtre"
              />
              <span className="text-sm text-gray-800">{careerReadyOnly ? "Açık" : "Kapalı"}</span>
            </label>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="scoreMin" className="text-sm font-medium text-gray-800">
              Score min (1-10)
            </label>
            <input
              id="scoreMin"
              type="number"
              min={1}
              max={10}
              step={0.1}
              value={scoreMin}
              aria-label="Score min"
              onChange={(e) => setScoreMin(Number(e.target.value))}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-gray-500 focus:ring-0"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="scoreMax" className="text-sm font-medium text-gray-800">
              Score max (1-10)
            </label>
            <input
              id="scoreMax"
              type="number"
              min={1}
              max={10}
              step={0.1}
              value={scoreMax}
              aria-label="Score max"
              onChange={(e) => setScoreMax(Number(e.target.value))}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-gray-500 focus:ring-0"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="limit" className="text-sm font-medium text-gray-800">
              Sonuç sayısı
            </label>
            <input
              id="limit"
              type="number"
              min={1}
              max={100}
              step={1}
              value={limit}
              aria-label="Limit"
              onChange={(e) => setLimit(Number(e.target.value))}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-gray-500 focus:ring-0"
            />
          </div>

          <div className="flex items-end justify-end">
            <button
              type="button"
              onClick={handleSearch}
              disabled={loading}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Aranıyor..." : "Adayları Bul"}
            </button>
          </div>
        </div>

        {error ? (
          <div role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        ) : null}
      </section>

      {result ? (
        <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Sonuçlar</h3>
          <p className="mt-1 text-xs text-gray-600">
            Toplam eşleşme: {result.total_candidates_matched ?? 0} · Dönen: {result.items.length}
          </p>

          {candidates.length === 0 ? (
            <p className="mt-3 text-sm text-gray-600">Filtrelerine uygun aday bulunamadı.</p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4">
              {candidates.map((c) => (
                <CandidateCard
                  key={c.student_id}
                  item={c}
                  showLearningAgility={canAccessLearningAgility}
                />
              ))}
            </div>
          )}
        </section>
      ) : null}
    </main>
  )
}

function CandidateCard({
  item,
  showLearningAgility
}: {
  item: EmployerCandidateItem
  showLearningAgility: boolean
}) {
  const sparklineValues = normalizeSparkline(item.trend_points_12m)

  return (
    <article className="relative rounded-xl border border-gray-100 p-4 shadow-sm">
      <div className="absolute right-4 top-4">
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
            item.is_career_ready
              ? "bg-green-50 text-green-700 ring-green-200"
              : "bg-amber-50 text-amber-700 ring-amber-200"
          }`}
        >
          {item.is_career_ready ? "Career-Ready" : "Hazırlanıyor"}
        </span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3 pr-28">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-gray-900">{item.display_name || "Öğrenci"}</p>
          <p className="text-xs text-gray-500">Disiplin: {item.discipline}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-md bg-gray-50 px-3 py-1 text-xs text-gray-800 ring-1 ring-gray-200">
            Kariyer Puanı: {formatScore(item.career_point_avg)}
          </span>
          <span className="inline-flex items-center rounded-md bg-indigo-50 px-3 py-1 text-xs text-indigo-800 ring-1 ring-indigo-200">
            Hazırlık: {formatPercent(item.readiness_percent)}
          </span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-4">
        <Stat label="Kavramsal Tutarlılık" value={formatScore(item.conceptual_avg)} icon="🧠" />
        <Stat label="Teknik Yeterlilik" value={formatScore(item.technical_avg)} icon="🛠️" />
        <Stat label="Özgünlük" value={formatScore(item.originality_avg)} icon="✨" />
        {showLearningAgility ? (
          <Stat
            label="Geri Bildirim Uygulama Süresi"
            value={
              item.avg_feedback_application_weeks === null
                ? "—"
                : `${item.avg_feedback_application_weeks.toFixed(2)} hafta`
            }
            icon="⏱️"
          />
        ) : (
          <Stat label="Geri Bildirim Uygulama Süresi" value="Enterprise" icon="⏱️" />
        )}
      </div>

      <div className="mt-4 rounded-lg bg-gray-50 p-3 ring-1 ring-gray-200">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-gray-700">Son 12 Ay Kariyer Puanı</p>
          <p className="text-[11px] text-gray-500">12m trend</p>
        </div>
        <Sparkline values={sparklineValues} />
      </div>

      {item.top_public_summaries.length ? (
        <div className="mt-3">
          <p className="text-xs font-medium text-gray-700">Öne çıkan (onaylı) özet</p>
          <p className="mt-1 text-sm text-gray-700">{snippet(item.top_public_summaries[0], 180)}</p>
        </div>
      ) : null}
    </article>
  )
}

function Stat({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="rounded-md bg-gray-50 p-3 ring-1 ring-gray-200">
      <p className="text-xs text-gray-600">
        <span className="mr-1">{icon}</span>
        {label}
      </p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  )
}

function normalizeSparkline(values: Array<number | null>): number[] {
  let last = 0
  return values.map((v) => {
    if (v === null || Number.isNaN(v)) return last
    last = v
    return v
  })
}

function Sparkline({ values }: { values: number[] }) {
  const width = 220
  const height = 46
  const padding = 6
  const min = Math.min(...values, 0)
  const max = Math.max(...values, 10)
  const range = max - min || 1

  const points = values
    .map((v, idx) => {
      const x = padding + (idx * (width - padding * 2)) / Math.max(values.length - 1, 1)
      const y = height - padding - ((v - min) / range) * (height - padding * 2)
      return `${x},${y}`
    })
    .join(" ")

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="h-12 w-full">
      <polyline
        fill="none"
        stroke="#39ff88"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
        style={{ filter: "drop-shadow(0 0 4px rgba(57,255,136,0.9)) drop-shadow(0 0 10px rgba(57,255,136,0.45))" }}
      />
    </svg>
  )
}

