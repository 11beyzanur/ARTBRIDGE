"use client"

import type { ChangeEvent, FormEvent } from "react"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"

export default function UploadPortfolioPage() {
  const router = useRouter()
  const [discipline, setDiscipline] = useState("")
  const [technique, setTechnique] = useState("")
  const [school, setSchool] = useState("")

  const [file, setFile] = useState<File | null>(null)
  const [uploadedPortfolioId, setUploadedPortfolioId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [reviewRequestStatus, setReviewRequestStatus] = useState<string | null>(null)

  const canSubmit = useMemo(() => {
    if (!file) return false
    if (!discipline.trim()) return false
    if (!technique.trim()) return false
    if (!school.trim()) return false
    if (!file.type) return false
    return true
  }, [discipline, file, school, technique])

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null
    setFile(selected)
    setError(null)
    setSuccess(null)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!file) return
    if (!canSubmit) return
    if (isUploading) return

    setError(null)
    setSuccess(null)
    setUploadedPortfolioId(null)
    setReviewRequestStatus(null)
    setIsUploading(true)

    try {
      const presignRes = await fetch("/api/portfolios/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discipline: discipline.trim(),
          technique: technique.trim(),
          school: school.trim(),
          file_name: file.name,
          content_type: file.type,
          file_size: file.size
        })
      })

      if (!presignRes.ok) {
        const data = await presignRes.json().catch(() => null)
        const detail = data?.detail ?? "Yükleme başlatılamadı"
        setError(detail)
        if (detail === "Aktif abonelik gereklidir") {
          router.push("/student/subscribe?reason=subscription_required")
        }
        return
      }

      const presign = await presignRes.json()

      const putRes = await fetch(presign.upload_url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file
      })

      if (!putRes.ok) {
        setError("Dosya S3'e yüklenemedi")
        return
      }

      const finalizeRes = await fetch("/api/portfolios/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portfolio_id: presign.portfolio_id })
      })

      if (!finalizeRes.ok) {
        const data = await finalizeRes.json().catch(() => null)
        const detail = data?.detail ?? "Yükleme tamamlanamadı"
        setError(detail)
        if (detail === "Aktif abonelik gereklidir") {
          router.push("/student/subscribe?reason=subscription_required")
        }
        return
      }

      const finalizeData = await finalizeRes.json().catch(() => null)
      setUploadedPortfolioId(finalizeData?.portfolio_id ?? presign.portfolio_id)
      setSuccess("Portfolyo yüklendi")
      setFile(null)
    } catch {
      setError("Sunucuya bağlanılamadı")
    } finally {
      setIsUploading(false)
    }
  }

  const handleRequestReview = async () => {
    const portfolioId = uploadedPortfolioId
    if (!portfolioId) return
    if (isSubmittingReview) return

    setIsSubmittingReview(true)
    setError(null)
    setReviewRequestStatus(null)

    try {
      const res = await fetch("/api/reviews/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portfolio_id: portfolioId })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        const detail = data?.detail ?? "Değerlendirmeye gönderilemedi"
        setError(detail)
        if (detail === "Aktif abonelik gereklidir") {
          router.push("/student/subscribe?reason=subscription_required")
        }
        return
      }

      const data = await res.json().catch(() => null)
      setReviewRequestStatus(data?.status ?? "queued")
      setSuccess("Değerlendirmeye gönderildi")
      router.push(`/student/reviews?portfolio_id=${encodeURIComponent(portfolioId)}`)
    } catch {
      setError("Sunucuya bağlanılamadı")
    } finally {
      setIsSubmittingReview(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-10">
      <h2 className="text-2xl font-semibold text-gray-900">Portfolyo Yükle</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="technique" className="text-sm font-medium text-gray-800">
            Teknik
          </label>
          <input
            id="technique"
            value={technique}
            aria-label="Teknik"
            onChange={(e) => setTechnique(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-gray-500 focus:ring-0"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="school" className="text-sm font-medium text-gray-800">
            Okul
          </label>
          <input
            id="school"
            value={school}
            aria-label="Okul"
            onChange={(e) => setSchool(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-gray-500 focus:ring-0"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="file" className="text-sm font-medium text-gray-800">
            Dosya (image/video)
          </label>
          <input
            id="file"
            name="file"
            type="file"
            accept="image/*,video/*"
            aria-label="Dosya"
            onChange={handleFileChange}
            required
          />
          {file ? <p className="text-xs text-gray-500">Seçilen: {file.name}</p> : null}
        </div>

        {error ? (
          <div role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        {success ? <div className="text-sm text-green-700">{success}</div> : null}

        <button
          type="submit"
          disabled={!canSubmit || isUploading}
          className="mt-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isUploading ? "Yükleniyor..." : "Yükle"}
        </button>
      </form>

      {uploadedPortfolioId ? (
        <div className="mt-6 rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Sonraki adım</h3>
          <p className="mt-1 text-sm text-gray-600">
            Çift körleme için portfolyoyu review kuyruğuna gönderebilirsin. Viewer anonimliğini korur.
          </p>
          <button
            type="button"
            onClick={handleRequestReview}
            disabled={isSubmittingReview}
            className="mt-3 w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmittingReview ? "Gönderiliyor..." : "Değerlendirmeye Gönder"}
          </button>
          {reviewRequestStatus ? (
            <p className="mt-2 text-xs text-gray-500">Durum: {reviewRequestStatus}</p>
          ) : null}
        </div>
      ) : null}
    </main>
  )
}

