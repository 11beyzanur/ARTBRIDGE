import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

type PresignPayload = {
  discipline: string
  technique: string
  school: string
  file_name: string
  content_type: string
  file_size: number | null
}

export async function POST(req: NextRequest) {
  const token = cookies().get("artbridge_access_token")?.value
  if (!token) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 })
  }

  const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:8000"
  const payload = (await req.json()) as PresignPayload

  const res = await fetch(`${apiBaseUrl}/portfolios/presign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload),
    cache: "no-store"
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    return NextResponse.json(data ?? { detail: "Presign failed" }, { status: res.status })
  }

  const data = await res.json().catch(() => null)
  return NextResponse.json(data, { status: 201 })
}

