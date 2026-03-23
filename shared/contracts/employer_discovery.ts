export type EmployerDiscoverySearchRequest = {
  discipline: string
  score_min: number
  score_max: number
  career_ready_only: boolean
  limit: number
}

export type EmployerCandidateItem = {
  student_id: string
  display_name: string
  discipline: string

  career_point_avg: number
  conceptual_avg: number
  technical_avg: number
  originality_avg: number

  readiness_percent: number
  completed_reviews_total: number
  required_reviews: number
  is_career_ready: boolean

  top_public_summaries: string[]
  trend_points_12m: Array<number | null>
  avg_feedback_application_weeks: number | null
}

export type EmployerDiscoverySearchResponse = {
  discipline: string
  score_min: number
  score_max: number
  career_ready_only: boolean
  limit: number
  items: EmployerCandidateItem[]
  total_candidates_matched: number | null
}

