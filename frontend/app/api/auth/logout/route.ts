import { NextRequest, NextResponse } from "next/server"

export function GET(req: NextRequest) {
  const response = NextResponse.redirect(new URL("/", req.url))
  response.cookies.set("artbridge_access_token", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0
  })
  return response
}

