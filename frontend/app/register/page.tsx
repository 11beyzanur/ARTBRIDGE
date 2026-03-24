"use client"

import type { UserRole } from "@shared/contracts/auth"
import type { FormEvent } from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"

const RICH_DEMO = process.env.NEXT_PUBLIC_ARTBRIDGE_RICH_DEMO !== "false"

export default function RegisterPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<UserRole>("student")
  const [displayName, setDisplayName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (isSubmitting) return

    setError(null)
    setSuccess(null)
    setIsSubmitting(true)
    try {
      if (RICH_DEMO) {
        setSuccess("Kayıt tamamlandı (demo). Giriş sayfasına yönlendiriliyorsun.")
        router.push("/login")
        return
      }
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role, display_name: displayName })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.detail ?? "Kayıt yapılamadı")
        return
      }

      setSuccess("Kayıt tamamlandı. Giriş yapabilirsin.")
      router.push("/login")
    } catch {
      setError("Sunucuya bağlanılamadı")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-10">
      <h2 className="text-2xl font-semibold text-gray-900">Kayıt Ol</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="email-register" className="text-sm font-medium text-gray-800">
            E-posta
          </label>
          <input
            id="email-register"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            aria-label="E-posta"
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-gray-500 focus:ring-0"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="password-register" className="text-sm font-medium text-gray-800">
            Şifre
          </label>
          <input
            id="password-register"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            aria-label="Şifre"
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-gray-500 focus:ring-0"
          />
          <p className="text-xs text-gray-500">En az 8 karakter kullan.</p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="role" className="text-sm font-medium text-gray-800">
            Rol
          </label>
          <select
            id="role"
            name="role"
            aria-label="Rol"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-gray-500 focus:ring-0"
          >
            <option value="student">Öğrenci / Yeni Mezun</option>
            <option value="viewer">Viewer / Değerlendirici</option>
            <option value="employer">İşveren / Galeri</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="displayName" className="text-sm font-medium text-gray-800">
            Username / Ad Soyad
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            autoComplete="name"
            required
            value={displayName}
            aria-label="Username / Ad Soyad"
            onChange={(e) => setDisplayName(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-gray-500 focus:ring-0"
          />
        </div>

        {error ? (
          <div role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        {success ? <div className="text-sm text-green-700">{success}</div> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Kayıt yapılıyor..." : "Kayıt Ol"}
        </button>
      </form>

      <p className="text-sm text-gray-600">
        Zaten hesabın var mı?{" "}
        <a className="font-medium text-gray-900 underline" href="/login">
          Giriş Yap
        </a>
      </p>
    </main>
  )
}

