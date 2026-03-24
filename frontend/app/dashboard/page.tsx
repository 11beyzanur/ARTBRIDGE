import type { AuthUser, UserRole } from "@shared/contracts/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

const roleLabels: Record<UserRole, string> = {
  student: "Öğrenci",
  viewer: "Viewer / Değerlendirici",
  employer: "İşveren / Galeri"
}

const RICH_DEMO = process.env.NEXT_PUBLIC_ARTBRIDGE_RICH_DEMO !== "false"

const readCookie = (cookieHeader: string, key: string): string | undefined => {
  const parts = cookieHeader.split(";").map((p) => p.trim())
  const prefix = `${key}=`
  const hit = parts.find((p) => p.startsWith(prefix))
  if (!hit) return undefined
  return decodeURIComponent(hit.slice(prefix.length))
}

const demoJobMatches = [
  { title: "İllüstrasyon — editorial seri", discipline: "İllüstrasyon", matchPercent: 96, applicants: 42 },
  { title: "Grafik kimlik — kültür kurumu", discipline: "Grafik Tasarım", matchPercent: 94, applicants: 28 },
  { title: "3D görselleştirme — ürün lansmanı", discipline: "3D Animasyon", matchPercent: 91, applicants: 35 },
  { title: "Heykel — mekân yerleştirmesi", discipline: "Heykel", matchPercent: 89, applicants: 19 }
]

const demoEvalHighlights = [
  { candidate: "Ada Yılmaz", discipline: "İllüstrasyon", scoreAvg: "8.9", verdict: "Kariyer-Ready · üst çeyrek" },
  { candidate: "Anonim aday B", discipline: "Grafik Tasarım", scoreAvg: "8.6", verdict: "Güçlü tipografi ve ritim" },
  { candidate: "Anonim aday C", discipline: "Endüstriyel Tasarım", scoreAvg: "8.4", verdict: "Prototip okumasını güçlendir" }
]

export default async function DashboardPage() {
  const headerStore = await headers()
  const cookieHeader = headerStore.get("cookie") ?? ""
  const token =
    readCookie(cookieHeader, "artbridge_access_token") ??
    cookieHeader
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("artbridge_access_token="))
      ?.split("=")[1]

  const demoRoleRaw = readCookie(cookieHeader, "artbridge_demo_role")

  const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:8000"

  if (RICH_DEMO && token === "demo") {
    if (demoRoleRaw === "student") redirect("/student/dashboard")
    if (demoRoleRaw === "viewer") redirect("/viewer/review")

    const user: AuthUser = {
      id: "demo-employer-1",
      email: "galeri@demo.artbridge",
      display_name: "ARTBRIDGE Demo Galeri",
      role: "employer"
    }

    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-10">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold text-gray-900">Dashboard</h2>
          <p className="text-sm text-gray-600">
            Hoş geldin, <span className="font-medium text-gray-900">{user.email}</span>
          </p>
          <p className="text-xs text-amber-800 ring-1 ring-amber-200 bg-amber-50 rounded-md px-2 py-1 w-fit">
            Zengin demo modu: örnek veriler gösteriliyor
          </p>
        </div>

        <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <p className="text-sm text-gray-600">Rolün</p>
          <p className="text-xl font-semibold text-gray-900">{roleLabels[user.role]}</p>
        </section>

        <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <h3 className="text-base font-semibold text-gray-900">Eşleşen ilanlar</h3>
          <p className="mt-1 text-sm text-gray-600">
            Demo veri: disiplin ve hedef kitleye göre model tabanlı eşleşme yüzdeleri.
          </p>
          <ul className="mt-4 flex flex-col gap-3">
            {demoJobMatches.map((j) => (
              <li
                key={j.title}
                className="rounded-md border border-gray-100 bg-gray-50 px-4 py-3 ring-1 ring-gray-200"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">{j.title}</p>
                  <span className="text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200 bg-indigo-50 rounded-full px-2 py-0.5">
                    %{j.matchPercent} eşleşme
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-600">
                  {j.discipline} · {j.applicants} uygun aday sinyali
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <h3 className="text-base font-semibold text-gray-900">Aday değerlendirmeleri</h3>
          <p className="mt-1 text-sm text-gray-600">Son tamamlanan çift-kör oturumlarından özet.</p>
          <div className="mt-4 grid grid-cols-1 gap-3">
            {demoEvalHighlights.map((row) => (
              <div
                key={row.candidate + row.discipline}
                className="rounded-md border border-gray-100 bg-white px-3 py-2 ring-1 ring-gray-200"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900">{row.candidate}</p>
                  <span className="text-xs text-gray-700 ring-1 ring-gray-200 rounded px-2 py-0.5">
                    Ort. {row.scoreAvg}/10
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{row.discipline}</p>
                <p className="text-sm text-gray-700 mt-1">{row.verdict}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg bg-gray-900 p-5 text-white">
          <h3 className="text-base font-semibold">MVP Foundation</h3>
          <p className="mt-2 text-sm leading-relaxed text-white/90">
            Şu an çift körleme eşleşme ve puanlama modülleri Faz 2/3 kapsamındadır. Bu ekranda
            sadece giriş ve role bazlı kimlik doğrulama akışı doğrulanır.
          </p>
        </section>

        <div className="flex flex-wrap gap-3">
          <a
            href="/employer/discovery"
            className="w-fit rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-900 ring-1 ring-gray-300 hover:bg-gray-50"
          >
            Aday Keşfi & Filtreleme
          </a>

          <a
            href="/employer/packages"
            className="w-fit rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-900 ring-1 ring-gray-300 hover:bg-gray-50"
          >
            Paketler (Standard/Enterprise)
          </a>

          <a
            href="/login?clear_demo=1"
            className="w-fit rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 ring-1 ring-gray-200 hover:bg-gray-50"
          >
            Çıkış Yap
          </a>
        </div>
      </main>
    )
  }

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
  if (user.role === "student") {
    redirect("/student/dashboard")
  }
  if (user.role === "viewer") {
    redirect("/viewer/review")
  }

  const logoutHref = RICH_DEMO ? "/login?clear_demo=1" : "/api/auth/logout"

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
        <a
          href="/employer/discovery"
          className="w-fit rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-900 ring-1 ring-gray-300 hover:bg-gray-50"
        >
          Aday Keşfi & Filtreleme
        </a>

        <a
          href="/employer/packages"
          className="w-fit rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-900 ring-1 ring-gray-300 hover:bg-gray-50"
        >
          Paketler (Standard/Enterprise)
        </a>

        <a
          href={logoutHref}
          className="w-fit rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 ring-1 ring-gray-200 hover:bg-gray-50"
        >
          Çıkış Yap
        </a>
      </div>
    </main>
  )
}

