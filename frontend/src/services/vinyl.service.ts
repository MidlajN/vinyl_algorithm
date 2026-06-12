import { analyzeVinyl, type AnalysisProgressCallback } from '@/engine'
import type { VinylResult } from '../types/vinyl'

export async function analyseVinyl(
  image: File,
  onProgress?: AnalysisProgressCallback,
): Promise<VinylResult> {
  return analyzeVinyl(image, onProgress)
}

export const analyzeRecord = analyseVinyl
