import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get("artbridge_access_token")?.value
  if (!token) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 })
  }

  const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:8000"
  const discipline = req.nextUrl.searchParams.get("discipline") ?? ""
  if (!discipline) {
    return NextResponse.json({ detail: "discipline is required" }, { status: 400 })
  }

  const res = await fetch(`${apiBaseUrl}/reviews/next?discipline=${encodeURIComponent(discipline)}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store"
  })

  const data = await res.json().catch(() => null)
  return NextResponse.json(data ?? { detail: "No task" }, { status: res.status })
}

