export type CareerReadyAnalysisItem = {
  session_id: string
  discipline: string
  completed_at: string

  public_summary: string

  conceptual_consistency_score: number
  technical_adequacy_score: number
  originality_score: number
  avg_score: number
}

export type CareerReadyMineResponse = {
  display_name: string
  required_reviews: number
  completed_reviews: number
  progress_percent: number
  target_label: "Kariyere Hazırlık Analizi"

  avg_score: number | null
  items: CareerReadyAnalysisItem[]
}

export type CareerReadyShareTokenResponse = {
  token: string
}

export type CareerReadyShareResponse = {
  share_display_name: string
  required_reviews: number
  completed_reviews: number
  progress_percent: number
  target_label: "Kariyere Hazırlık Analizi"

  avg_score: number | null
  items: CareerReadyAnalysisItem[]
}

