import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

type SubmitReviewPayload = {
  session_id: string
  conceptual_consistency_score: number
  technical_adequacy_score: number
  originality_score: number
  private_comment: string
  public_summary: string
}

export async function POST(req: NextRequest) {
  const token = cookies().get("artbridge_access_token")?.value
  if (!token) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 })
  }

  const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:8000"
  const payload = (await req.json()) as SubmitReviewPayload

  if (!payload.session_id) {
    return NextResponse.json({ detail: "session_id is required" }, { status: 400 })
  }

  const { session_id, ...body } = payload

  const res = await fetch(`${apiBaseUrl}/reviews/${encodeURIComponent(session_id)}/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body),
    cache: "no-store"
  })

  const data = await res.json().catch(() => null)
  return NextResponse.json(data ?? { detail: "Submit failed" }, { status: res.status })
}

