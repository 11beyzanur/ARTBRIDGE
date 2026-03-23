import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

type FinalizePayload = {
  portfolio_id: string
}

export async function POST(req: NextRequest) {
  const token = cookies().get("artbridge_access_token")?.value
  if (!token) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 })
  }

  const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:8000"
  const payload = (await req.json()) as FinalizePayload

  const res = await fetch(`${apiBaseUrl}/portfolios/${payload.portfolio_id}/finalize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    cache: "no-store"
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    return NextResponse.json(data ?? { detail: "Finalize failed" }, { status: res.status })
  }

  const data = await res.json().catch(() => null)
  return NextResponse.json(data, { status: 200 })
}

