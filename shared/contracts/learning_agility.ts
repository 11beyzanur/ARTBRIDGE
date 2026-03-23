export type LearningAgilityTransition = {
  from_session_id: string
  to_session_id: string
  completed_at: string
  next_request_created_at: string
  days_to_apply: number
  agility_score: number
  conceptual_avg: number | null
  technical_avg: number | null
  originality_avg: number | null
}

export type LearningAgilityDisciplineBreakdown = {
  discipline: string
  transitions: LearningAgilityTransition[]
  avg_days_to_apply: number | null
  avg_agility_score: number | null
}

export type LearningAgilityMineResponse = {
  target_days: number
  disciplines: LearningAgilityDisciplineBreakdown[]
  overall_avg_days_to_apply: number | null
  overall_avg_agility_score: number | null
  transitions_count: number
}

