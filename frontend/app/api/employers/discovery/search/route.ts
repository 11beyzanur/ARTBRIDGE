import type { EmployerDiscoverySearchRequest, EmployerDiscoverySearchResponse } from "@shared/contracts/employer_discovery"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const token = cookies().get("artbridge_access_token")?.value
  if (!token) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 })
  }

  const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:8000"
  const payload = (await req.json()) as EmployerDiscoverySearchRequest

  const res = await fetch(`${apiBaseUrl}/employers/discovery/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload),
    cache: "no-store"
  })

  const data = await res.json().catch(() => null)
  return NextResponse.json(data ?? { items: [] }, { status: res.status })
}

