import type { LoginRequest, LoginResponse } from "@shared/contracts/auth"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:8000"

  const payload = (await req.json()) as LoginRequest
  const res = await fetch(`${apiBaseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store"
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    return NextResponse.json(data ?? { detail: "Login failed" }, { status: res.status })
  }

  const data = (await res.json()) as LoginResponse

  const response = NextResponse.json({ user: data.user }, { status: 200 })
  const isProd = process.env.NODE_ENV === "production"

  response.cookies.set("artbridge_access_token", data.access_token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: data.expires_in_seconds
  })

  return response
}

