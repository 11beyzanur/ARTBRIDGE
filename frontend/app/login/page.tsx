"use client"

import type { AuthUser, UserRole } from "@shared/contracts/auth"
import type { FormEvent } from "react"
import { useEffect, useState } from "react"

const RICH_DEMO = process.env.NEXT_PUBLIC_ARTBRIDGE_RICH_DEMO !== "false"

const setClientCookie = (name: string, value: string, maxAgeSeconds: number) => {
  document.cookie = `${name}=${value}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`
}

const inferDemoRole = (email: string, override: UserRole | ""): UserRole => {
  if (override) return override
  const e = email.toLowerCase()
  if (e.includes("viewer") || e.includes("uzman") || e.includes("expert")) return "viewer"
  if (
    e.includes("employer") ||
    e.includes("galeri") ||
    e.includes("gallery") ||
    e.includes("company") ||
    e.includes("isveren") ||
    e.includes("işveren") ||
    e.includes("sirket") ||
    e.includes("şirket")
  ) {
    return "employer"
  }
  if (
    e.includes("student") ||
    e.includes("ogrenci") ||
    e.includes("öğrenci") ||
    e.includes("ada") ||
    e.includes("yilmaz") ||
    e.includes("yılmaz")
  ) {
    return "student"
  }
  return "student"
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [demoRoleOverride, setDemoRoleOverride] = useState<UserRole | "">("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    if (params.get("clear_demo") !== "1") return
    setClientCookie("artbridge_access_token", "", 0)
    setClientCookie("artbridge_demo_role", "", 0)
    window.history.replaceState({}, "", "/login")
  }, [])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (isSubmitting) return

    setError(null)
    setIsSubmitting(true)
    try {
      if (RICH_DEMO) {
        const role = inferDemoRole(email, demoRoleOverride)
        const maxAge = 60 * 60 * 24 * 7
        setClientCookie("artbridge_access_token", "demo", maxAge)
        setClientCookie("artbridge_demo_role", role, maxAge)

        const target =
          role === "student"
            ? "/student/dashboard"
            : role === "viewer"
              ? "/viewer/review"
              : "/dashboard"

        window.location.replace(target)
        return
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.detail ?? "Giriş yapılamadı")
        return
      }

      const data = (await res.json().catch(() => null)) as { user?: AuthUser } | null
      const role = data?.user?.role
      const target =
        role === "student"
          ? "/student/dashboard"
          : role === "viewer"
            ? "/viewer/review"
            : "/dashboard"

      window.location.replace(target)
    } catch {
      setError("Sunucuya bağlanılamadı")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-10">
      <h2 className="text-2xl font-semibold text-gray-900">Giriş Yap</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-medium text-gray-800">
            E-posta
          </label>
          <input
            id="email"
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

        {RICH_DEMO ? (
          <div className="flex flex-col gap-2">
            <label htmlFor="demo-role" className="text-sm font-medium text-gray-800">
              Demo rolü (isteğe bağlı)
            </label>
            <select
              id="demo-role"
              value={demoRoleOverride}
              aria-label="Demo rolü"
              onChange={(e) => setDemoRoleOverride(e.target.value as UserRole | "")}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-gray-500 focus:ring-0"
            >
              <option value="">Otomatik (e-posta ipucundan)</option>
              <option value="student">Öğrenci (Ada Yılmaz senaryosu)</option>
              <option value="employer">İşveren / Galeri</option>
              <option value="viewer">Uzman (Viewer)</option>
            </select>
            <p className="text-xs text-gray-500">
              Canlı demo: backend çağrısı yapılmaz. İstediğin e-posta ve şifre ile giriş yapılabilir.
            </p>
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-sm font-medium text-gray-800">
            Şifre
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            aria-label="Şifre"
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-gray-500 focus:ring-0"
          />
        </div>

        {error ? (
          <div role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Giriş yapılıyor..." : "Giriş Yap"}
        </button>
      </form>

      <p className="text-sm text-gray-600">
        Hesabın yok mu?{" "}
        <a className="font-medium text-gray-900 underline" href="/register">
          Kayıt Ol
        </a>
      </p>
    </main>
  )
}

