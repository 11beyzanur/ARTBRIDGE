import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import type { AuthUser } from "@shared/contracts/auth"

const RICH_DEMO = process.env.NEXT_PUBLIC_ARTBRIDGE_RICH_DEMO !== "false"

export default async function StudentDashboardPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get("artbridge_access_token")?.value
  const demoRole = cookieStore.get("artbridge_demo_role")?.value

  if (RICH_DEMO && token === "demo") {
    if (demoRole && demoRole !== "student") {
      redirect("/dashboard")
    }

    const user: AuthUser = {
      id: "demo-student-ada",
      email: "ada.yilmaz@demo.artbridge",
      display_name: "Ada Yılmaz",
      role: "student"
    }

    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-10">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold text-gray-900">Öğrenci Paneli</h2>
          <p className="text-sm text-gray-600">
            Hoş geldin, <span className="font-medium text-gray-900">{user.display_name}</span>
          </p>
          <p className="text-xs text-amber-800 ring-1 ring-amber-200 bg-amber-50 rounded-md px-2 py-1 w-fit">
            Zengin demo modu: gelişim metrikleri örnek veriyle dolu
          </p>
        </div>

        <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <h3 className="text-base font-semibold text-gray-900">Öne çıkan performans</h3>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-md bg-gray-50 p-3 ring-1 ring-gray-200">
              <p className="text-xs text-gray-600">Kariyer hazırlığı</p>
              <p className="text-lg font-semibold text-gray-900">%89</p>
            </div>
            <div className="rounded-md bg-gray-50 p-3 ring-1 ring-gray-200">
              <p className="text-xs text-gray-600">Öğrenme ivmesi</p>
              <p className="text-lg font-semibold text-gray-900">87 / 100</p>
            </div>
            <div className="rounded-md bg-gray-50 p-3 ring-1 ring-gray-200">
              <p className="text-xs text-gray-600">Review tamamlanma</p>
              <p className="text-lg font-semibold text-gray-900">6 / 4+</p>
            </div>
          </div>
        </section>

        <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <h3 className="text-base font-semibold text-gray-900">Hızlı Erişim</h3>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href="/upload"
              className="w-fit rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-900 ring-1 ring-gray-300 hover:bg-gray-50"
            >
              Portfolyo Yükle
            </a>
            <a
              href="/student/reviews"
              className="w-fit rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-900 ring-1 ring-gray-300 hover:bg-gray-50"
            >
              Review Durumlarım
            </a>
            <a
              href="/student/learning-agility"
              className="w-fit rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-900 ring-1 ring-gray-300 hover:bg-gray-50"
            >
              Öğrenme İvmesi
            </a>
            <a
              href="/student/career-ready"
              className="w-fit rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-900 ring-1 ring-gray-300 hover:bg-gray-50"
            >
              Kariyere Hazırlık Analizi
            </a>
            <a
              href="/student/subscribe"
              className="w-fit rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-900 ring-1 ring-gray-300 hover:bg-gray-50"
            >
              Abonelik
            </a>
            <a
              href="/login?clear_demo=1"
              className="w-fit rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 ring-1 ring-gray-200 hover:bg-gray-50"
            >
              Çıkış Yap
            </a>
          </div>
        </section>
      </main>
    )
  }

  if (!token) {
    redirect("/login")
  }

  const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:8000"
  const res = await fetch(`${apiBaseUrl}/auth/me`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store"
  })

  if (!res.ok) {
    redirect("/login")
  }

  const user = (await res.json()) as AuthUser
  if (user.role !== "student") {
    redirect("/dashboard")
  }

  const logoutHref = RICH_DEMO ? "/login?clear_demo=1" : "/api/auth/logout"

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold text-gray-900">Öğrenci Paneli</h2>
        <p className="text-sm text-gray-600">
          Hoş geldin, <span className="font-medium text-gray-900">{user.display_name}</span>
        </p>
      </div>

      <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
        <h3 className="text-base font-semibold text-gray-900">Hızlı Erişim</h3>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="/upload"
            className="w-fit rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-900 ring-1 ring-gray-300 hover:bg-gray-50"
          >
            Portfolyo Yükle
          </a>
          <a
            href="/student/reviews"
            className="w-fit rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-900 ring-1 ring-gray-300 hover:bg-gray-50"
          >
            Review Durumlarım
          </a>
          <a
            href="/student/learning-agility"
            className="w-fit rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-900 ring-1 ring-gray-300 hover:bg-gray-50"
          >
            Öğrenme İvmesi
          </a>
          <a
            href="/student/career-ready"
            className="w-fit rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-900 ring-1 ring-gray-300 hover:bg-gray-50"
          >
            Kariyere Hazırlık Analizi
          </a>
          <a
            href={logoutHref}
            className="w-fit rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 ring-1 ring-gray-200 hover:bg-gray-50"
          >
            Çıkış Yap
          </a>
        </div>
      </section>
    </main>
  )
}
