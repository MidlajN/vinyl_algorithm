export type Theme = 'dark' | 'light'

export type VinylMode = 'generated' | 'image'

export type Track = {
  track_number: number
  start_radius_px: number
  end_radius_px: number
  start_radius_mm: number
  end_radius_mm: number
  width_px: number
  width_mm: number
  servo_angle_deg: number
}

export type VinylAnalysisResponse = {
  success: boolean
  tracks: Track[]
}

export type VinylResult = VinylAnalysisResponse

export type AnalysisProgress = {
  stage: string
  stageIndex: number
  totalStages: number
}

export type CapturedImage = {
  file: File
  url: string
  source: 'camera' | 'upload'
}

export type AnalysisError = {
  title: string
  message: string
}
