export type ReviewSessionStatus = "queued" | "assigned" | "completed"

export type StudentReviewSessionItem = {
  session_id: string
  portfolio_id: string
  discipline: string
  technique: string
  status: ReviewSessionStatus | string
  created_at: string
  completed_at: string | null
}

export type StudentReviewsResponse = {
  items: StudentReviewSessionItem[]
}

