import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

type RequestReviewPayload = {
  portfolio_id: string
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get("artbridge_access_token")?.value
  if (!token) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 })
  }

  const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:8000"
  const payload = (await req.json()) as RequestReviewPayload

  const res = await fetch(`${apiBaseUrl}/reviews/request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload),
    cache: "no-store"
  })

  const data = await res.json().catch(() => null)
  return NextResponse.json(data ?? { detail: "Request failed" }, { status: res.status })
}

