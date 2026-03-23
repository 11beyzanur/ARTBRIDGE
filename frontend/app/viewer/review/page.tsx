"use client"

import type { ChangeEvent, FormEvent } from "react"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

const disciplineSuggestions = [
  "Resim",
  "Heykel",
  "İllüstrasyon",
  "Grafik Tasarım",
  "Endüstriyel Tasarım",
  "3D Animasyon"
]

type ReviewTask = {
  session_id: string
  portfolio_id: string
  discipline: string
  technique: string
  asset_url: string
  content_type: string
}

export default function ViewerReviewPage() {
  const router = useRouter()
  const [discipline, setDiscipline] = useState("")
  const [task, setTask] = useState<ReviewTask | null>(null)
  const [isRoleChecked, setIsRoleChecked] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isLoadingTask, setIsLoadingTask] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [conceptualScore, setConceptualScore] = useState<number>(7)
  const [technicalScore, setTechnicalScore] = useState<number>(7)
  const [originalityScore, setOriginalityScore] = useState<number>(7)
  const [privateComment, setPrivateComment] = useState<string>("")
  const [publicSummary, setPublicSummary] = useState<string>("")

  const canSubmit = useMemo(() => {
    if (!task) return false
    if (conceptualScore < 1 || conceptualScore > 10) return false
    if (technicalScore < 1 || technicalScore > 10) return false
    if (originalityScore < 1 || originalityScore > 10) return false
    if (privateComment.trim().length < 10) return false
    if (publicSummary.trim().length < 1) return false
    return true
  }, [task, conceptualScore, technicalScore, originalityScore, privateComment, publicSummary])

  const handleDisciplineChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDiscipline(event.target.value)
    setError(null)
    setMessage(null)
  }

  const resetReviewInputs = () => {
    setConceptualScore(7)
    setTechnicalScore(7)
    setOriginalityScore(7)
    setPrivateComment("")
    setPublicSummary("")
  }

  const handleFetchNextTask = async () => {
    if (isLoadingTask) return
    const disciplineValue = discipline.trim()
    if (!disciplineValue) {
      setError("Lütfen bir disiplin gir")
      return
    }

    setIsLoadingTask(true)
    setError(null)
    setMessage(null)

    try {
      const res = await fetch(`/api/reviews/next?discipline=${encodeURIComponent(disciplineValue)}`)
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        const detail = String(data?.detail ?? "")
        if (res.status === 404) {
          setTask(null)
          setMessage(detail || "Bu disiplin için şu an sırada iş bulunmuyor")
          return
        }
        setError(detail || "Görev alınamadı")
        return
      }

      const data = (await res.json()) as ReviewTask
      setTask(data)
      resetReviewInputs()
    } catch {
      setError("Sunucuya bağlanılamadı")
    } finally {
      setIsLoadingTask(false)
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!task) return
    if (!canSubmit) return
    if (isSubmitting) return

    setIsSubmitting(true)
    setError(null)
    setMessage(null)

    try {
      const payload = {
        session_id: task.session_id,
        conceptual_consistency_score: conceptualScore,
        technical_adequacy_score: technicalScore,
        originality_score: originalityScore,
        private_comment: privateComment,
        public_summary: publicSummary
      }

      const res = await fetch("/api/reviews/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.detail ?? "Gönderim başarısız")
        return
      }

      setMessage("Değerlendirme gönderildi. Yeni görev için tekrar dene.")
      setTask(null)
    } catch {
      setError("Sunucuya bağlanılamadı")
    } finally {
      setIsSubmitting(false)
    }
  }

  const isImage = task?.content_type?.startsWith("image/") ?? false
  const isVideo = task?.content_type?.startsWith("video/") ?? false

  useEffect(() => {
    let cancelled = false
    const ensureViewerRole = async () => {
      try {
        const res = await fetch("/api/auth/me", { method: "GET", cache: "no-store" })
        const data = await res.json().catch(() => null)
        if (!res.ok || !data?.role) {
          if (!cancelled) router.replace("/login")
          return
        }
        if (data.role !== "viewer") {
          if (!cancelled) {
            if (data.role === "student") {
              router.replace("/student/dashboard")
            } else {
              router.replace("/dashboard")
            }
          }
          return
        }
        if (!cancelled) setIsRoleChecked(true)
      } catch {
        if (!cancelled) router.replace("/login")
      }
    }
    void ensureViewerRole()
    return () => {
      cancelled = true
    }
  }, [router])

  if (!isRoleChecked) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-10">
        <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <p className="text-sm text-gray-600">Yetki kontrolu yapiliyor...</p>
        </section>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold text-gray-900">Viewer Değerlendirme</h2>
        <p className="text-sm text-gray-600">Çift körleme: Öğrenci kimliği görünmez, yalnızca iş değerlendirilir</p>
      </div>

      <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">Disiplin</h3>
        <div className="mt-3 flex flex-col gap-2">
          <label htmlFor="viewer-discipline" className="text-sm font-medium text-gray-800">
            Disiplin adı (double-blind eşleşmesi)
          </label>
          <input
            id="viewer-discipline"
            value={discipline}
            aria-label="Disiplin"
            onChange={handleDisciplineChange}
            list="discipline-options"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-gray-500 focus:ring-0"
            placeholder="Örn: 3D Animasyon, İllüstrasyon"
          />
          <datalist id="discipline-options">
            {disciplineSuggestions.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </div>

        <button
          type="button"
          onClick={handleFetchNextTask}
          disabled={isLoadingTask || !discipline.trim()}
          className="mt-4 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoadingTask ? "Görev alınıyor..." : "Sonraki görev"}
        </button>

        {error ? (
          <div role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        {message ? <div className="mt-3 text-sm text-green-700">{message}</div> : null}
      </section>

      {task ? (
        <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-sm text-gray-600">Disiplin: {task.discipline}</p>
              <p className="text-sm text-gray-600">Teknik: {task.technique}</p>
            </div>
            <p className="text-xs text-gray-500">Anonim iş</p>
          </div>

          <div className="mt-4">
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={task.asset_url}
                alt="Anonim portfolyo"
                className="max-h-[420px] w-full rounded-md object-contain"
                loading="lazy"
              />
            ) : null}

            {isVideo ? (
              <video
                src={task.asset_url}
                controls
                preload="metadata"
                className="w-full rounded-md"
              />
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-2">
                <label htmlFor="conceptual" className="text-sm font-medium text-gray-800">
                  Kavramsal Tutarlılık (1-10)
                </label>
                <input
                  id="conceptual"
                  type="number"
                  min={1}
                  max={10}
                  value={conceptualScore}
                  aria-label="Kavramsal Tutarlılık"
                  onChange={(e) => setConceptualScore(Number(e.target.value))}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-gray-500 focus:ring-0"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="technical" className="text-sm font-medium text-gray-800">
                  Teknik Yeterlilik (1-10)
                </label>
                <input
                  id="technical"
                  type="number"
                  min={1}
                  max={10}
                  value={technicalScore}
                  aria-label="Teknik Yeterlilik"
                  onChange={(e) => setTechnicalScore(Number(e.target.value))}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-gray-500 focus:ring-0"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="originality" className="text-sm font-medium text-gray-800">
                  Özgünlük (1-10)
                </label>
                <input
                  id="originality"
                  type="number"
                  min={1}
                  max={10}
                  value={originalityScore}
                  aria-label="Özgünlük"
                  onChange={(e) => setOriginalityScore(Number(e.target.value))}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-gray-500 focus:ring-0"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="private-comment" className="text-sm font-medium text-gray-800">
                Özel Yorum (yapıcı eleştiri)
              </label>
              <textarea
                id="private-comment"
                value={privateComment}
                aria-label="Özel Yorum"
                onChange={(e) => setPrivateComment(e.target.value)}
                rows={6}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-gray-500 focus:ring-0"
                placeholder="Örn: Güçlü yönlerin, iyileştirme önerilerin ve nedenleri..."
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="public-summary" className="text-sm font-medium text-gray-800">
                Genel Özet (paylaşılabilir)
              </label>
              <textarea
                id="public-summary"
                value={publicSummary}
                aria-label="Genel Özet"
                onChange={(e) => setPublicSummary(e.target.value)}
                rows={3}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-gray-500 focus:ring-0"
                placeholder="Kısa ve anlaşılır bir özet yaz..."
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={!canSubmit || isSubmitting}
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Gönderiliyor..." : "Değerlendirmeyi Gönder"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setTask(null)
                  setMessage(null)
                  setError(null)
                }}
                className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-900 ring-1 ring-gray-300 hover:bg-gray-50"
              >
                Vazgeç
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </main>
  )
}

