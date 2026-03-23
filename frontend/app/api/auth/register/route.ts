import type { RegisterRequest } from "@shared/contracts/auth"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:8000"

  const payload = (await req.json()) as RegisterRequest
  const res = await fetch(`${apiBaseUrl}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store"
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    return NextResponse.json(data ?? { detail: "Register failed" }, { status: res.status })
  }

  const data = await res.json().catch(() => null)
  return NextResponse.json({ user: data }, { status: res.status })
}

