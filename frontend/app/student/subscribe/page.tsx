"use client"

import type { FormEvent } from "react"
import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useSearchParams } from "next/navigation"

const RICH_DEMO = process.env.NEXT_PUBLIC_ARTBRIDGE_RICH_DEMO !== "false"

type SubscriptionMe = {
  status: string
  subscription_reference_code?: string | null
  order_reference_code?: string | null
}

type CheckoutInitialize = {
  checkout_form_content: string
  token: string
  token_expire_time: number
}

function getIsActive(status: string) {
  return status === "ACTIVE"
}

function StudentSubscribeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [me, setMe] = useState<SubscriptionMe | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoadingMe, setIsLoadingMe] = useState(true)

  const [checkout, setCheckout] = useState<CheckoutInitialize | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)

  const checkoutContainerRef = useRef<HTMLDivElement | null>(null)

  const [toast, setToast] = useState<string | null>(null)

  const reason = searchParams.get("reason")

  const [form, setForm] = useState({
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

  const canSubmit = useMemo(() => {
    if (!form.name.trim()) return false
    if (!form.surname.trim()) return false
    if (!form.email.trim()) return false
    if (!form.gsmNumber.trim()) return false
    if (!form.identityNumber.trim()) return false
    if (!form.address.trim()) return false
    if (!form.contactName.trim()) return false
    if (!form.city.trim()) return false
    if (!form.country.trim()) return false
    return true
  }, [form])

  const handleCloseToast = () => setToast(null)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setIsLoadingMe(true)
      setError(null)
      try {
        if (RICH_DEMO) {
          if (!cancelled) setMe({ status: "ACTIVE", subscription_reference_code: "DEMO-B2C", order_reference_code: "DEMO-ORD" })
          return
        }
        const res = await fetch("/api/subscriptions/me", { method: "GET", cache: "no-store" })
        const data = (await res.json().catch(() => null)) as SubscriptionMe | null
        if (!res.ok || !data) {
          if (!cancelled) setError(data?.status ? "Abonelik bilgisi alınamadı" : "Abonelik bilgisi alınamadı")
          return
        }
        if (!cancelled) setMe(data)
      } catch {
        if (!cancelled) setError("Sunucuya bağlanılamadı")
      } finally {
        if (!cancelled) setIsLoadingMe(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!checkout?.checkout_form_content) return
    const container = checkoutContainerRef.current
    if (!container) return

    const html = checkout.checkout_form_content
    container.innerHTML = ""
    const tmp = document.createElement("div")
    tmp.innerHTML = html

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

  useEffect(() => {
    if (!checkout) return
    let cancelled = false
    let intervalId: number | undefined

    const poll = async () => {
      if (cancelled) return
      try {
        if (RICH_DEMO) {
          setMe({ status: "ACTIVE", subscription_reference_code: "DEMO-B2C", order_reference_code: "DEMO-ORD" })
          if (cancelled) return
          setToast("Aboneliğin aktif (demo). Yüklemeye devam edebilirsin")
          if (intervalId) window.clearInterval(intervalId)
          setTimeout(() => {
            router.push("/upload")
          }, 1200)
          return
        }
        const res = await fetch("/api/subscriptions/me", { method: "GET", cache: "no-store" })
        const data = (await res.json().catch(() => null)) as SubscriptionMe | null
        if (!res.ok || !data) return
        setMe(data)

        if (getIsActive(data.status)) {
          if (cancelled) return
          setToast("Aboneliğin aktif. Yüklemeye devam edebilirsin")
          if (intervalId) window.clearInterval(intervalId)
          setTimeout(() => {
            router.push("/upload")
          }, 1200)
        }
      } catch {
        // ignore polling errors
      }
    }

    intervalId = window.setInterval(poll, 3000)
    poll()

    return () => {
      cancelled = true
      if (intervalId) window.clearInterval(intervalId)
    }
  }, [checkout, router])

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setToast(null)
    if (isInitializing) return
    if (!canSubmit) return
    setIsInitializing(true)

    try {
      if (RICH_DEMO) {
        setMe({ status: "ACTIVE", subscription_reference_code: "DEMO-B2C", order_reference_code: "DEMO-ORD" })
        setToast("Demo: abonelik anında aktifleştirildi.")
        return
      }
      const res = await fetch("/api/subscriptions/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.detail ?? "Abonelik başlatılamadı")
        return
      }

      const data = (await res.json().catch(() => null)) as CheckoutInitialize | null
      if (!data) {
        setError("Iyzico yanıtı alınamadı")
        return
      }

      setCheckout(data)
    } catch {
      setError("Sunucuya bağlanılamadı")
    } finally {
      setIsInitializing(false)
    }
  }

  const isActive = me ? getIsActive(me.status) : false

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold text-gray-900">Öğrenci Aboneliği</h2>
        <p className="text-sm text-gray-600">Yükleme ve değerlendirme için aktif abonelik gerekir.</p>
      </div>

      {toast ? (
        <div
          aria-live="polite"
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900 shadow-sm"
        >
          <div className="font-semibold">Tamamlandı</div>
          <div>{toast}</div>
          <button
            type="button"
            onClick={handleCloseToast}
            className="mt-2 rounded-md bg-white px-3 py-1 text-sm font-medium text-gray-900 ring-1 ring-gray-200 hover:bg-gray-50"
          >
            Kapat
          </button>
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {reason === "subscription_required" ? (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-900">
          Aktif abonelik gereklidir. Ödemeyi tamamlayarak hemen başlayabilirsin.
        </div>
      ) : null}

      {isLoadingMe ? (
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <p className="text-sm text-gray-600">Abonelik durumu yükleniyor...</p>
        </div>
      ) : null}

      {me && isActive ? (
        <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <h3 className="text-base font-semibold text-gray-900">Aktif abonelik</h3>
          <p className="mt-1 text-sm text-gray-600">Yükleme ve değerlendirme işlemlerine devam edebilirsin.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href="/upload"
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Portfolyo Yükle
            </a>
            <a
              href="/student/reviews"
              className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-900 ring-1 ring-gray-300 hover:bg-gray-50"
            >
              Review Durumlarım
            </a>
          </div>
        </section>
      ) : null}

      {me && !isActive ? (
        <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <h3 className="text-base font-semibold text-gray-900">Abone Ol</h3>
          <p className="mt-1 text-sm text-gray-600">Demo için basit form. Adres validasyonu yapılmaz.</p>

          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-800" htmlFor="name">
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
                <label className="text-sm font-medium text-gray-800" htmlFor="surname">
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
                <label className="text-sm font-medium text-gray-800" htmlFor="email">
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
                <label className="text-sm font-medium text-gray-800" htmlFor="gsmNumber">
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
              <label className="text-sm font-medium text-gray-800" htmlFor="identityNumber">
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-800" htmlFor="address">
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
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-800" htmlFor="contactName">
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
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-800" htmlFor="city">
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
                <label className="text-sm font-medium text-gray-800" htmlFor="country">
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

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-800" htmlFor="zipCode">
                Posta Kodu (opsiyonel)
              </label>
              <input
                id="zipCode"
                value={form.zipCode}
                onChange={(e) => handleChange("zipCode", e.target.value)}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-gray-500 focus:ring-0"
              />
            </div>

            <button
              type="submit"
              disabled={!canSubmit || isInitializing}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isInitializing ? "Iyzico başlatılıyor..." : "Ödemeyi Başlat"}
            </button>
          </form>

          <div className="mt-6">
            <div ref={checkoutContainerRef} />
          </div>
        </section>
      ) : null}
    </main>
  )
}

export default function StudentSubscribePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-10">
          <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
            <p className="text-sm text-gray-600">Abonelik ekranı yükleniyor...</p>
          </div>
        </main>
      }
    >
      <StudentSubscribeContent />
    </Suspense>
  )
}

