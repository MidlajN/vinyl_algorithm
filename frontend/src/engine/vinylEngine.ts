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

  if (config?.debug) {
    logEnvironment()
    logFileMetadata(file)
  }

  const imageData = await fileToImageData(file, Boolean(config?.debug))

  return new Promise<VinylResult>((resolve, reject) => {
    activeAnalysis = { resolve, reject, onProgress }
    getWorker().postMessage({ type: 'analyse', imageData, config } satisfies WorkerInMessage)
  })
}

async function fileToImageData(file: File, debug: boolean): Promise<ImageData> {
  const metadata = debug ? await inspectImageFile(file) : undefined
  const bitmap = await createImageBitmap(file)
  const noOrientationBitmap = debug ? await createNoOrientationBitmap(file) : undefined

  try {
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height

    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Could not create canvas context')
    }

    context.imageSmoothingEnabled = false
    context.drawImage(bitmap, 0, 0)
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

    if (debug) {
      logDecodeDiagnostics({
        metadata,
        bitmap,
        noOrientationBitmap,
        canvas,
        imageData,
      })
    }

    return imageData
  } finally {
    bitmap.close()
    noOrientationBitmap?.close()
  }
}

function toVinylResult(result: AnalysisResult): VinylResult {
  return {
    success: result.success,
    tracks: result.tracks.map(toAppTrack),
    debug: result.debug,
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

function logEnvironment() {
  const extendedNavigator = navigator as Navigator & { deviceMemory?: number; userAgentData?: unknown }

  console.groupCollapsed('[vinyl-debug] environment')
  console.table({
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency,
    devicePixelRatio: window.devicePixelRatio,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    outerWindow: `${window.outerWidth}x${window.outerHeight}`,
    screen: `${window.screen.width}x${window.screen.height}`,
    availableScreen: `${window.screen.availWidth}x${window.screen.availHeight}`,
    deviceMemory: extendedNavigator.deviceMemory ?? 'unavailable',
    userAgentData: extendedNavigator.userAgentData ? JSON.stringify(extendedNavigator.userAgentData) : 'unavailable',
  })
  console.groupEnd()
}

function logFileMetadata(file: File) {
  console.groupCollapsed('[vinyl-debug] file')
  console.table({
    fileName: file.name,
    mimeType: file.type,
    fileSize: file.size,
    lastModified: file.lastModified,
  })
  console.groupEnd()
}

type ImageFileMetadata = {
  rawWidth?: number
  rawHeight?: number
  exifOrientation?: number
  format?: string
}

type DecodeDiagnosticInput = {
  metadata?: ImageFileMetadata
  bitmap: ImageBitmap
  noOrientationBitmap?: ImageBitmap
  canvas: HTMLCanvasElement
  imageData: ImageData
}

async function inspectImageFile(file: File): Promise<ImageFileMetadata> {
  const bytes = new Uint8Array(await file.slice(0, Math.min(file.size, 256 * 1024)).arrayBuffer())

  return {
    ...parseImageDimensions(bytes),
    exifOrientation: parseExifOrientation(bytes),
  }
}

async function createNoOrientationBitmap(file: File): Promise<ImageBitmap | undefined> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'none' })
  } catch (error) {
    console.warn('[vinyl-debug] createImageBitmap imageOrientation:none unsupported', error)
    return undefined
  }
}

function logDecodeDiagnostics({
  metadata,
  bitmap,
  noOrientationBitmap,
  canvas,
  imageData,
}: DecodeDiagnosticInput) {
  const orientationSwapsDimensions =
    metadata?.exifOrientation === 5 ||
    metadata?.exifOrientation === 6 ||
    metadata?.exifOrientation === 7 ||
    metadata?.exifOrientation === 8

  const expectedBitmapWidth = orientationSwapsDimensions ? metadata?.rawHeight : metadata?.rawWidth
  const expectedBitmapHeight = orientationSwapsDimensions ? metadata?.rawWidth : metadata?.rawHeight
  const possibleDownscale =
    expectedBitmapWidth !== undefined &&
    expectedBitmapHeight !== undefined &&
    (bitmap.width !== expectedBitmapWidth || bitmap.height !== expectedBitmapHeight)

  console.groupCollapsed('[vinyl-debug] decode')
  console.table({
    rawWidth: metadata?.rawWidth ?? 'unknown',
    rawHeight: metadata?.rawHeight ?? 'unknown',
    format: metadata?.format ?? 'unknown',
    exifOrientation: metadata?.exifOrientation ?? 'none/unknown',
    orientationSwapsDimensions,
    bitmapWidth: bitmap.width,
    bitmapHeight: bitmap.height,
    noOrientationBitmapWidth: noOrientationBitmap?.width ?? 'unavailable',
    noOrientationBitmapHeight: noOrientationBitmap?.height ?? 'unavailable',
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    imageDataWidth: imageData.width,
    imageDataHeight: imageData.height,
    imageSmoothingEnabled: canvas.getContext('2d')?.imageSmoothingEnabled,
  })

  if (possibleDownscale) {
    console.warn('[vinyl-debug] Possible browser downscaling detected', {
      expectedBitmapWidth,
      expectedBitmapHeight,
      bitmapWidth: bitmap.width,
      bitmapHeight: bitmap.height,
    })
  }

  if (
    noOrientationBitmap &&
    (noOrientationBitmap.width !== bitmap.width || noOrientationBitmap.height !== bitmap.height)
  ) {
    console.warn('[vinyl-debug] EXIF orientation changes decoded bitmap dimensions', {
      bitmapWidth: bitmap.width,
      bitmapHeight: bitmap.height,
      noOrientationBitmapWidth: noOrientationBitmap.width,
      noOrientationBitmapHeight: noOrientationBitmap.height,
    })
  }

  console.groupEnd()
}

function parseImageDimensions(bytes: Uint8Array): ImageFileMetadata {
  if (isPng(bytes)) {
    return {
      format: 'png',
      rawWidth: readUint32(bytes, 16, false),
      rawHeight: readUint32(bytes, 20, false),
    }
  }

  if (isJpeg(bytes)) {
    const dimensions = parseJpegDimensions(bytes)
    return { format: 'jpeg', ...dimensions }
  }

  return {}
}

function parseJpegDimensions(bytes: Uint8Array): Pick<ImageFileMetadata, 'rawWidth' | 'rawHeight'> {
  let offset = 2

  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1
      continue
    }

    const marker = bytes[offset + 1]
    const length = readUint16(bytes, offset + 2, false)

    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return {
        rawHeight: readUint16(bytes, offset + 5, false),
        rawWidth: readUint16(bytes, offset + 7, false),
      }
    }

    offset += 2 + length
  }

  return {}
}

function parseExifOrientation(bytes: Uint8Array): number | undefined {
  if (!isJpeg(bytes)) {
    return undefined
  }

  let offset = 2
  while (offset + 4 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1
      continue
    }

    const marker = bytes[offset + 1]
    const length = readUint16(bytes, offset + 2, false)
    const segmentStart = offset + 4

    if (marker === 0xe1 && matchesAscii(bytes, segmentStart, 'Exif\0\0')) {
      return readExifOrientation(bytes, segmentStart + 6, length - 8)
    }

    offset += 2 + length
  }

  return undefined
}

function readExifOrientation(bytes: Uint8Array, tiffStart: number, length: number): number | undefined {
  if (tiffStart + 8 > bytes.length || length <= 0) {
    return undefined
  }

  const littleEndian = bytes[tiffStart] === 0x49 && bytes[tiffStart + 1] === 0x49
  const bigEndian = bytes[tiffStart] === 0x4d && bytes[tiffStart + 1] === 0x4d
  if (!littleEndian && !bigEndian) {
    return undefined
  }

  const ifdOffset = readUint32(bytes, tiffStart + 4, littleEndian)
  const ifdStart = tiffStart + ifdOffset
  if (ifdStart + 2 > bytes.length) {
    return undefined
  }

  const entries = readUint16(bytes, ifdStart, littleEndian)
  for (let i = 0; i < entries; i += 1) {
    const entry = ifdStart + 2 + i * 12
    if (entry + 12 > bytes.length) {
      return undefined
    }

    const tag = readUint16(bytes, entry, littleEndian)
    if (tag === 0x0112) {
      return readUint16(bytes, entry + 8, littleEndian)
    }
  }

  return undefined
}

function isJpeg(bytes: Uint8Array): boolean {
  return bytes[0] === 0xff && bytes[1] === 0xd8
}

function isPng(bytes: Uint8Array): boolean {
  return (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  )
}

function readUint16(bytes: Uint8Array, offset: number, littleEndian: boolean): number {
  if (littleEndian) {
    return bytes[offset] | (bytes[offset + 1] << 8)
  }

  return (bytes[offset] << 8) | bytes[offset + 1]
}

function readUint32(bytes: Uint8Array, offset: number, littleEndian: boolean): number {
  if (littleEndian) {
    return (
      bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24)
    ) >>> 0
  }

  return (
    ((bytes[offset] << 24) >>> 0) |
    (bytes[offset + 1] << 16) |
    (bytes[offset + 2] << 8) |
    bytes[offset + 3]
  ) >>> 0
}

function matchesAscii(bytes: Uint8Array, offset: number, value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    if (bytes[offset + i] !== value.charCodeAt(i)) {
      return false
    }
  }

  return true
}
