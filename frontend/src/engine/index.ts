import { analyze, init, type AnalysisProgressCallback } from './vinylEngine'
import type { VinylResult } from '../types/vinyl'

export type { AnalysisProgressCallback, VinylResult }

export function initVinylEngine(): Promise<void> {
  return init()
}

export function analyzeVinyl(
  file: File,
  onProgress?: AnalysisProgressCallback,
): Promise<VinylResult> {
  return analyze(file, onProgress)
}
