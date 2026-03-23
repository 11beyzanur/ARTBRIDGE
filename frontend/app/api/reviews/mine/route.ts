import type { StudentReviewsResponse } from "@shared/contracts/reviews"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const token = cookies().get("artbridge_access_token")?.value
  if (!token) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 })
  }

  const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:8000"
  const res = await fetch(`${apiBaseUrl}/reviews/mine`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store"
  })

  const data = (await res.json().catch(() => null)) as StudentReviewsResponse | null
  return NextResponse.json(data ?? { items: [] }, { status: res.status })
}

