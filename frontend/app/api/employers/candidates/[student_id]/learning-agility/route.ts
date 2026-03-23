import type { LearningAgilityMineResponse } from "@shared/contracts/learning_agility"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

type Params = {
  student_id: string
}

export async function GET(req: NextRequest, context: { params: Params }) {
  const token = cookies().get("artbridge_access_token")?.value
  if (!token) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 })
  }

  const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:8000"
  const studentId = context.params.student_id

  const res = await fetch(`${apiBaseUrl}/packages/candidates/${encodeURIComponent(studentId)}/learning-agility`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store"
  })

  const data = await res.json().catch(() => null)
  return NextResponse.json(data ?? ({} as LearningAgilityMineResponse), { status: res.status })
}

