"use client"

import { useEffect, useMemo, useState } from "react"

const RICH_DEMO = process.env.NEXT_PUBLIC_ARTBRIDGE_RICH_DEMO !== "false"

type EarningItem = {
  id: string
  review_id: string
  amount_try: number
  status: string
  created_at: string
}

type EarningsSummary = {
  available_try: number
  paid_try: number
  donated_try: number
  total_try: number
  min_payout_try: number
  items: EarningItem[]
}

type PayoutItem = {
  id: string
  amount_try: number
  status: string
  iban: string
  note: string | null
  created_at: string
}

const demoEarningsSummary = (): EarningsSummary => ({
  available_try: 8420.75,
  paid_try: 15680.2,
  donated_try: 240,
  total_try: 24340.95,
  min_payout_try: 500,
  items: [
    {
      id: "demo-earn-1",
      review_id: "rev-a",
      amount_try: 920,
      status: "AVAILABLE",
      created_at: "2025-03-26T10:00:00.000Z"
    },
    {
      id: "demo-earn-2",
      review_id: "rev-b",
      amount_try: 885,
      status: "AVAILABLE",
      created_at: "2025-03-24T14:30:00.000Z"
    },
    {
      id: "demo-earn-3",
      review_id: "rev-c",
      amount_try: 910,
      status: "PAID",
      created_at: "2025-03-18T09:15:00.000Z"
    },
    {
      id: "demo-earn-4",
      review_id: "rev-d",
      amount_try: 870,
      status: "PAID",
      created_at: "2025-03-10T16:45:00.000Z"
    },
    {
      id: "demo-earn-5",
      review_id: "rev-e",
      amount_try: 895,
      status: "AVAILABLE",
      created_at: "2025-03-02T11:20:00.000Z"
    }
  ]
})

const demoPayouts = (): PayoutItem[] => [
  {
    id: "demo-pay-1",
    amount_try: 4200,
    status: "COMPLETED",
    iban: "TR12 3456 7890 1234 5678 9012 34",
    note: "Mart dönemi",
    created_at: "2025-03-05T12:00:00.000Z"
  },
  {
    id: "demo-pay-2",
    amount_try: 3800,
    status: "PROCESSING",
    iban: "TR12 3456 7890 1234 5678 9012 34",
    note: null,
    created_at: "2025-02-12T09:30:00.000Z"
  }
]

export default function ViewerFinancePage() {
  const [summary, setSummary] = useState<EarningsSummary | null>(null)
  const [payouts, setPayouts] = useState<PayoutItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(false)

  const [iban, setIban] = useState("")
  const [note, setNote] = useState("")

  const canRequest = useMemo(() => {
    if (!summary) return false
    return summary.available_try >= summary.min_payout_try && iban.trim().length >= 8
  }, [iban, summary])

  const fetchAll = async () => {
    if (RICH_DEMO) {
      setSummary(demoEarningsSummary())
      setPayouts(demoPayouts())
      return
    }
    const [earningsRes, payoutsRes] = await Promise.all([
      fetch("/api/viewer/earnings", { method: "GET", cache: "no-store" }),
      fetch("/api/viewer/payouts", { method: "GET", cache: "no-store" }),
    ])
    const earningsBody = await earningsRes.json().catch(() => null)
    const payoutsBody = await payoutsRes.json().catch(() => null)
    if (!earningsRes.ok) {
      throw new Error(earningsBody?.detail ?? "Kazanç verisi alınamadı")
    }
    if (!payoutsRes.ok) {
      throw new Error(payoutsBody?.detail ?? "Payout verisi alınamadı")
    }
    setSummary(earningsBody as EarningsSummary)
    setPayouts((payoutsBody ?? []) as PayoutItem[])
  }

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        await fetchAll()
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Sunucuya bağlanılamadı")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  const handleRequest = async () => {
    if (!canRequest || requesting) return
    setRequesting(true)
    setError(null)
    try {
      if (RICH_DEMO) {
        const amount = summary?.available_try ?? 0
        setPayouts((prev) => [
          {
            id: `demo-pay-${Date.now()}`,
            amount_try: amount,
            status: "REQUESTED",
            iban: iban.trim(),
            note: note.trim() || null,
            created_at: new Date().toISOString()
          },
          ...prev
        ])
        setSummary((s) =>
          s
            ? {
                ...s,
                available_try: 0,
                paid_try: s.paid_try + amount,
                items: s.items.map((it) =>
                  it.status === "AVAILABLE" ? { ...it, status: "PAID" } : it
                )
              }
            : s
        )
        return
      }
      const res = await fetch("/api/viewer/payouts/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          iban: iban.trim(),
          note: note.trim() || null,
        }),
        cache: "no-store",
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        setError(body?.detail ?? "Payout talebi başarısız")
        return
      }
      await fetchAll()
    } catch {
      setError("Sunucuya bağlanılamadı")
    } finally {
      setRequesting(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold text-gray-900">Viewer Kazanç & Payout</h2>
        <p className="text-sm text-gray-600">İnceleme başına kazançlar ve ödeme talebi yönetimi</p>
      </div>

      {error ? (
        <div role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200 text-sm text-gray-600">
          Finans verileri yükleniyor...
        </div>
      ) : null}

      {summary && !loading ? (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Stat label="Mevcut (TL)" value={summary.available_try.toFixed(2)} />
          <Stat label="Ödenen (TL)" value={summary.paid_try.toFixed(2)} />
          <Stat label="Bağışlanan (TL)" value={summary.donated_try.toFixed(2)} />
          <Stat label="Toplam (TL)" value={summary.total_try.toFixed(2)} />
        </section>
      ) : null}

      {summary ? (
        <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Payout Talebi</h3>
          <p className="mt-1 text-xs text-gray-600">
            Minimum payout: {summary.min_payout_try.toFixed(2)} TL
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              value={iban}
              onChange={(e) => setIban(e.target.value)}
              placeholder="IBAN"
              aria-label="IBAN"
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500"
            />
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Not (opsiyonel)"
              aria-label="Not"
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500"
            />
          </div>
          <button
            type="button"
            disabled={!canRequest || requesting}
            onClick={() => void handleRequest()}
            className="mt-3 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {requesting ? "Gönderiliyor..." : "Payout Talebi Oluştur"}
          </button>
        </section>
      ) : null}

      {summary ? (
        <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Kazanç Hareketleri</h3>
          {summary.items.length === 0 ? (
            <p className="mt-2 text-sm text-gray-600">Henüz kazanç oluşmadı.</p>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-2">
              {summary.items.slice(0, 12).map((it) => (
                <div key={it.id} className="rounded-md bg-gray-50 px-3 py-2 text-sm ring-1 ring-gray-200">
                  <div className="flex items-center justify-between">
                    <span>{it.amount_try.toFixed(2)} TL</span>
                    <span className="text-xs text-gray-600">{it.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {payouts.length ? (
        <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Payout Geçmişi</h3>
          <div className="mt-3 grid grid-cols-1 gap-2">
            {payouts.slice(0, 10).map((p) => (
              <div key={p.id} className="rounded-md bg-gray-50 px-3 py-2 text-sm ring-1 ring-gray-200">
                <div className="flex items-center justify-between">
                  <span>{p.amount_try.toFixed(2)} TL</span>
                  <span className="text-xs text-gray-600">{p.status}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <p className="text-xs text-gray-600">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
    </div>
  )
}

