"use client"

import type { EmployerPackageMeResponse } from "@shared/contracts/employer_packages"
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"

type EmployerCustomerForm = {
  name: string
  surname: string
  email: string
  gsmNumber: string
  identityNumber: string
  address: string
  contactName: string
  city: string
  country: string
  zipCode: string
}

type EmployerPackageInitializeShape = {
  checkout_form_content: string
  token: string
  token_expire_time: number
}

function mapPlanTypeToLabel(plan: string) {
  if (plan === "enterprise") return "Enterprise (5.000 TL)"
  return "Standart (2.500 TL)"
}

export default function EmployerPackagesPage() {
  const router = useRouter()

  const [me, setMe] = useState<EmployerPackageMeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoadingMe, setIsLoadingMe] = useState(true)

  const [planType, setPlanType] = useState<"standard" | "enterprise">("standard")
  const [form, setForm] = useState<EmployerCustomerForm>({
    name: "",
    surname: "",
    email: "",
    gsmNumber: "",
    identityNumber: "",
    address: "",
    contactName: "",
    city: "",
    country: "",
    zipCode: ""
  })

  const [checkout, setCheckout] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)

  const checkoutContainerRef = useRef<HTMLDivElement | null>(null)

  const canSubmit = useMemo(() => {
    return (
      form.name.trim().length > 0 &&
      form.surname.trim().length > 0 &&
      form.email.trim().length > 0 &&
      form.gsmNumber.trim().length > 0 &&
      form.identityNumber.trim().length > 0 &&
      form.address.trim().length > 0 &&
      form.contactName.trim().length > 0 &&
      form.city.trim().length > 0 &&
      form.country.trim().length > 0
    )
  }, [form])

  const fetchMe = async () => {
    const res = await fetch("/api/employers/packages/me", { method: "GET", cache: "no-store" })
    const body = await res.json().catch(() => null)
    if (!res.ok || !body) {
      setError(body?.detail ?? "Paket durumu okunamadı")
      return
    }
    setMe(body as EmployerPackageMeResponse)
  }

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setIsLoadingMe(true)
      setError(null)
      try {
        await fetchMe()
      } catch {
        if (!cancelled) setError("Sunucuya bağlanılamadı")
      } finally {
        if (!cancelled) setIsLoadingMe(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!checkout) return
    const container = checkoutContainerRef.current
    if (!container) return

    container.innerHTML = ""
    const tmp = document.createElement("div")
    tmp.innerHTML = checkout

    const nodes = Array.from(tmp.childNodes)
    for (const node of nodes) {
      if (node.nodeName.toLowerCase() === "script") {
        const oldScript = node as HTMLScriptElement
        const newScript = document.createElement("script")
        if (oldScript.src) newScript.src = oldScript.src
        newScript.type = oldScript.type
        newScript.async = oldScript.async
        newScript.defer = oldScript.defer
        newScript.text = oldScript.text
        container.appendChild(newScript)
      } else {
        container.appendChild(node.cloneNode(true))
      }
    }
  }, [checkout])

  const handleChange = (key: keyof EmployerCustomerForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleStartPayment = async () => {
    setError(null)
    if (!canSubmit) return
    if (isInitializing) return
    setIsInitializing(true)

    try {
      const res = await fetch("/api/employers/packages/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_type: planType,
          customer: {
            name: form.name.trim(),
            surname: form.surname.trim(),
            email: form.email.trim(),
            gsmNumber: form.gsmNumber.trim(),
            identityNumber: form.identityNumber.trim(),
            billingAddress: {
              address: form.address.trim(),
              contactName: form.contactName.trim(),
              city: form.city.trim(),
              country: form.country.trim(),
              ...(form.zipCode.trim() ? { zipCode: form.zipCode.trim() } : {})
            }
          }
        }),
        cache: "no-store"
      })

      const body = await res.json().catch(() => null)
      if (!res.ok || !body) {
        setError(body?.detail ?? "Iyzico başlatılamadı")
        return
      }

      const init = body as { checkout_form_content: string; token: string; token_expire_time: number }
      setCheckout(init.checkout_form_content)

      // Demo UX: ödeme tamamlanınca callback redirect edeceği için burada kısa bekleme + kontrol
      const pollInterval = window.setInterval(async () => {
        try {
          await fetchMe()
          if (window.location.pathname.includes("/employer/packages")) {
            const isActive = (me?.can_access_learning_agility ?? false) || (body?.status === "ACTIVE")
            // ignore
          }
        } catch {
          // ignore
        }
      }, 4000)

      setTimeout(() => window.clearInterval(pollInterval), 180000)
    } catch {
      setError("Sunucuya bağlanılamadı")
    } finally {
      setIsInitializing(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold text-gray-900">Employer Paketleri</h2>
        <p className="text-sm text-gray-600">Standart (2.500 TL) ve Enterprise (5.000 TL). Enterprise ile Gelişim Analitiği açılır.</p>
      </div>

      {error ? (
        <div role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {isLoadingMe ? (
        <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <p className="text-sm text-gray-600">Paket durumu yükleniyor...</p>
        </div>
      ) : null}

      {me ? (
        <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <p className="text-sm text-gray-600">Mevcut durum</p>
              <p className="text-lg font-semibold text-gray-900">{me.status}</p>
              <p className="text-sm text-gray-600">
                Plan: {me.plan_type ?? "—"} · Learning Agility: {me.can_access_learning_agility ? "Açık" : "Kapalı"}
              </p>
            </div>
            {me.can_access_learning_agility ? (
              <button
                type="button"
                onClick={() => router.push("/employer/discovery")}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Aday Keşfe Dön
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">Paket Seçimi</h3>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-md border border-gray-200 p-3">
            <input
              type="radio"
              name="plan"
              value="standard"
              checked={planType === "standard"}
              onChange={() => setPlanType("standard")}
            />
            <span className="text-sm font-medium text-gray-900">{mapPlanTypeToLabel("standard")}</span>
          </label>

          <label className="flex cursor-pointer items-center gap-3 rounded-md border border-gray-200 p-3">
            <input
              type="radio"
              name="plan"
              value="enterprise"
              checked={planType === "enterprise"}
              onChange={() => setPlanType("enterprise")}
            />
            <span className="text-sm font-medium text-gray-900">{mapPlanTypeToLabel("enterprise")}</span>
          </label>
        </div>
      </section>

      <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">Ödeme Bilgileri (Demo)</h3>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            void handleStartPayment()
          }}
          className="mt-4 flex flex-col gap-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="name" className="text-sm font-medium text-gray-800">
                Ad
              </label>
              <input
                id="name"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-gray-500 focus:ring-0"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="surname" className="text-sm font-medium text-gray-800">
                Soyad
              </label>
              <input
                id="surname"
                value={form.surname}
                onChange={(e) => handleChange("surname", e.target.value)}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-gray-500 focus:ring-0"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-800">
                E-posta
              </label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-gray-500 focus:ring-0"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="gsmNumber" className="text-sm font-medium text-gray-800">
                GSM
              </label>
              <input
                id="gsmNumber"
                value={form.gsmNumber}
                onChange={(e) => handleChange("gsmNumber", e.target.value)}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-gray-500 focus:ring-0"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="identityNumber" className="text-sm font-medium text-gray-800">
              T.C. Kimlik No
            </label>
            <input
              id="identityNumber"
              value={form.identityNumber}
              onChange={(e) => handleChange("identityNumber", e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-gray-500 focus:ring-0"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="address" className="text-sm font-medium text-gray-800">
              Adres
            </label>
            <input
              id="address"
              value={form.address}
              onChange={(e) => handleChange("address", e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-gray-500 focus:ring-0"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="contactName" className="text-sm font-medium text-gray-800">
                İletişim Adı
              </label>
              <input
                id="contactName"
                value={form.contactName}
                onChange={(e) => handleChange("contactName", e.target.value)}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-gray-500 focus:ring-0"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="zipCode" className="text-sm font-medium text-gray-800">
                Posta Kodu (opsiyonel)
              </label>
              <input
                id="zipCode"
                value={form.zipCode}
                onChange={(e) => handleChange("zipCode", e.target.value)}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-gray-500 focus:ring-0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="city" className="text-sm font-medium text-gray-800">
                İl
              </label>
              <input
                id="city"
                value={form.city}
                onChange={(e) => handleChange("city", e.target.value)}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-gray-500 focus:ring-0"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="country" className="text-sm font-medium text-gray-800">
                Ülke
              </label>
              <input
                id="country"
                value={form.country}
                onChange={(e) => handleChange("country", e.target.value)}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-gray-500 focus:ring-0"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!canSubmit || isInitializing}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isInitializing ? "Iyzico hazırlanıyor..." : "Ödemeyi Başlat"}
          </button>
        </form>
      </section>

      {checkout ? (
        <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Iyzico Checkout Form</h3>
          <div className="mt-4" ref={checkoutContainerRef} />
        </section>
      ) : null}
    </main>
  )
}

