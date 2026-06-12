import { compareAnalysisRuns, isVinylDebugEnabled, publishVinylDebugResult } from './debug'
import { analyze, init, type AnalysisProgressCallback } from './vinylEngine'
import type { AnalysisConfig } from './types'
import type { VinylResult } from '../types/vinyl'

export { compareAnalysisRuns, isVinylDebugEnabled, publishVinylDebugResult }
export type { AnalysisConfig, AnalysisProgressCallback, VinylResult }

export function initVinylEngine(): Promise<void> {
  return init()
}

export function analyzeVinyl(
  file: File,
  onProgress?: AnalysisProgressCallback,
  config?: AnalysisConfig,
): Promise<VinylResult> {
  return analyze(file, onProgress, config)
}
