import type { AuthUser, UserRole } from "@shared/contracts/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

const roleLabels: Record<UserRole, string> = {
  student: "Öğrenci",
  viewer: "Viewer / Değerlendirici",
  employer: "İşveren / Galeri"
}

export default async function DashboardPage() {
  const headerStore = await headers()
  const cookieHeader = headerStore.get("cookie") ?? ""
  const token = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("artbridge_access_token="))
    ?.split("=")[1]

  const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:8000"
  if (!token) {
    redirect("/login")
  }

  const res = await fetch(`${apiBaseUrl}/auth/me`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store"
  })

  if (!res.ok) {
    redirect("/login")
  }

  const user = (await res.json()) as AuthUser

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold text-gray-900">Dashboard</h2>
        <p className="text-sm text-gray-600">
          Hoş geldin, <span className="font-medium text-gray-900">{user.email}</span>
        </p>
      </div>

      <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
        <p className="text-sm text-gray-600">Rolün</p>
        <p className="text-xl font-semibold text-gray-900">{roleLabels[user.role]}</p>
      </section>

      <section className="rounded-lg bg-gray-900 p-5 text-white">
        <h3 className="text-base font-semibold">MVP Foundation</h3>
        <p className="mt-2 text-sm leading-relaxed text-white/90">
          Şu an çift körleme eşleşme ve puanlama modülleri Faz 2/3 kapsamındadır. Bu ekranda
          sadece giriş ve role bazlı kimlik doğrulama akışı doğrulanır.
        </p>
      </section>

      <div className="flex flex-wrap gap-3">
        {user.role === "student" ? (
          <a
            href="/upload"
            className="w-fit rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-900 ring-1 ring-gray-300 hover:bg-gray-50"
          >
            Portfolyo Yükle
          </a>
        ) : null}

        {user.role === "student" ? (
          <a
            href="/student/reviews"
            className="w-fit rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-900 ring-1 ring-gray-300 hover:bg-gray-50"
          >
            Review Durumlarım
          </a>
        ) : null}

        {user.role === "student" ? (
          <a
            href="/student/learning-agility"
            className="w-fit rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-900 ring-1 ring-gray-300 hover:bg-gray-50"
          >
            Öğrenme İvmesi
          </a>
        ) : null}

        {user.role === "student" ? (
          <a
            href="/student/career-ready"
            className="w-fit rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-900 ring-1 ring-gray-300 hover:bg-gray-50"
          >
            Kariyere Hazırlık Analizi
          </a>
        ) : null}

        {user.role === "viewer" ? (
          <a
            href="/viewer/review"
            className="w-fit rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-900 ring-1 ring-gray-300 hover:bg-gray-50"
          >
            Viewer Değerlendirme
          </a>
        ) : null}

        {user.role === "viewer" ? (
          <a
            href="/viewer/finance"
            className="w-fit rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-900 ring-1 ring-gray-300 hover:bg-gray-50"
          >
            Kazanç & Payout
          </a>
        ) : null}

        {user.role === "employer" ? (
          <a
            href="/employer/discovery"
            className="w-fit rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-900 ring-1 ring-gray-300 hover:bg-gray-50"
          >
            Aday Keşfi & Filtreleme
          </a>
        ) : null}

        {user.role === "employer" ? (
          <a
            href="/employer/packages"
            className="w-fit rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-900 ring-1 ring-gray-300 hover:bg-gray-50"
          >
            Paketler (Standard/Enterprise)
          </a>
        ) : null}

        <a
          href="/api/auth/logout"
          className="w-fit rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 ring-1 ring-gray-200 hover:bg-gray-50"
        >
          Çıkış Yap
        </a>
      </div>
    </main>
  )
}

