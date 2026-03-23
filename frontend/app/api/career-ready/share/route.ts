import type { CareerReadyShareResponse } from "@shared/contracts/career_ready"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? ""
  if (!token) {
    return NextResponse.json({ detail: "token is required" }, { status: 400 })
  }

  const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:8000"
  const res = await fetch(`${apiBaseUrl}/career-ready/share/${encodeURIComponent(token)}`, {
    method: "GET",
    cache: "no-store"
  })

  const data = await res.json().catch(() => null)
  return NextResponse.json(data ?? { items: [] }, { status: res.status })
}

