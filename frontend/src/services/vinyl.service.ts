import { analyzeVinyl, type AnalysisConfig, type AnalysisProgressCallback } from '@/engine'
import type { VinylResult } from '../types/vinyl'

export async function analyseVinyl(
  image: File,
  onProgress?: AnalysisProgressCallback,
  config?: AnalysisConfig,
): Promise<VinylResult> {
  return analyzeVinyl(image, onProgress, config)
}

export const analyzeRecord = analyseVinyl
