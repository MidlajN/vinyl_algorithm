import VinylWorker from './workers/vinyl.worker?worker'
import type {
  AnalysisConfig,
  AnalysisResult,
  WorkerInMessage,
  WorkerOutMessage,
} from './types'
import type { Track, VinylResult } from '../types/vinyl'

export type AnalysisProgressCallback = (
  stage: string,
  stageIndex: number,
  totalStages: number,
) => void

type ActiveAnalysis = {
  onProgress?: AnalysisProgressCallback
  reject: (error: Error) => void
  resolve: (result: VinylResult) => void
}

let worker: Worker | null = null
let initPromise: Promise<void> | null = null
let initResolve: (() => void) | null = null
let initReject: ((error: Error) => void) | null = null
let isReady = false
let activeAnalysis: ActiveAnalysis | null = null

function getWorker(): Worker {
  if (worker) {
    return worker
  }

  worker = new VinylWorker()
  worker.onmessage = handleWorkerMessage
  worker.onerror = (event) => {
    const error = new Error(event.message || 'Vinyl worker crashed')
    rejectInit(error)
    rejectActiveAnalysis(error)
  }

  return worker
}

function rejectInit(error: Error) {
  initReject?.(error)
  initPromise = null
  initResolve = null
  initReject = null
  isReady = false
}

function rejectActiveAnalysis(error: Error) {
  activeAnalysis?.reject(error)
  activeAnalysis = null
}

function handleWorkerMessage(event: MessageEvent<WorkerOutMessage>) {
  const message = event.data

  if (message.type === 'ready') {
    isReady = true
    initResolve?.()
    initResolve = null
    initReject = null
    return
  }

  if (message.type === 'progress') {
    activeAnalysis?.onProgress?.(message.stage, message.stageIndex, message.totalStages)
    return
  }

  if (message.type === 'result') {
    activeAnalysis?.resolve(toVinylResult(message.result))
    activeAnalysis = null
    return
  }

  if (message.type === 'error') {
    const error = new Error(message.message)
    if (!isReady) {
      rejectInit(error)
    }
    rejectActiveAnalysis(error)
  }
}

export function init(): Promise<void> {
  if (isReady) {
    return Promise.resolve()
  }

  if (initPromise) {
    return initPromise
  }

  initPromise = new Promise<void>((resolve, reject) => {
    initResolve = resolve
    initReject = reject
    getWorker().postMessage({ type: 'init' } satisfies WorkerInMessage)
  })

  return initPromise
}

export async function analyze(
  file: File,
  onProgress?: AnalysisProgressCallback,
  config?: AnalysisConfig,
): Promise<VinylResult> {
  await init()

  if (activeAnalysis) {
    throw new Error('Vinyl analysis is already running')
  }

  const imageData = await fileToImageData(file)

  return new Promise<VinylResult>((resolve, reject) => {
    activeAnalysis = { resolve, reject, onProgress }
    getWorker().postMessage({ type: 'analyse', imageData, config } satisfies WorkerInMessage)
  })
}

async function fileToImageData(file: File): Promise<ImageData> {
  const bitmap = await createImageBitmap(file)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height

    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Could not create canvas context')
    }

    context.drawImage(bitmap, 0, 0)
    return context.getImageData(0, 0, canvas.width, canvas.height)
  } finally {
    bitmap.close()
  }
}

function toVinylResult(result: AnalysisResult): VinylResult {
  return {
    success: result.success,
    tracks: result.tracks.map(toAppTrack),
  }
}

function toAppTrack(track: AnalysisResult['tracks'][number]): Track {
  return {
    track_number: track.trackNumber,
    start_radius_px: track.startRadiusPx,
    end_radius_px: track.endRadiusPx,
    start_radius_mm: track.startRadiusMm,
    end_radius_mm: track.endRadiusMm,
    width_px: track.widthPx,
    width_mm: track.widthMm,
    servo_angle_deg: track.servoAngleDeg ?? 0,
  }
}
