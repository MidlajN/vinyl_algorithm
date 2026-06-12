import type {
  AnalysisDebugReport,
  Separator,
  SpindleResult,
  VinylGeometry,
} from '../types'
import type { LabelResult, PlayableResult } from '../types'
import type { TextureProfile } from './texture'

export type DebugCollector = AnalysisDebugReport

export function createDebugCollector(enabled: boolean): DebugCollector | undefined {
  return enabled ? { stages: [], images: [] } : undefined
}

export function debugStage(
  debug: DebugCollector | undefined,
  stage: string,
  data: Record<string, unknown>,
): void {
  if (!debug) {
    return
  }

  debug.stages.push({ stage, data })
  console.log(`[vinyl-debug:pipeline] ${stage}`, data)
}

export async function addMatDebugImage(
  debug: DebugCollector | undefined,
  name: string,
  mat: unknown,
): Promise<void> {
  if (!debug) {
    return
  }

  const imageData = matToImageData(mat)
  debug.images.push({
    name,
    width: imageData.width,
    height: imageData.height,
    dataUrl: await imageDataToPngDataUrl(imageData),
  })
}

export async function addPlayableMaskDebugImage(
  debug: DebugCollector | undefined,
  name: string,
  width: number,
  height: number,
  spindle: SpindleResult,
  playable: PlayableResult,
): Promise<void> {
  if (!debug) {
    return
  }

  const imageData = new ImageData(width, height)
  const data = imageData.data
  const innerSq = playable.innerPlayableRadiusPx * playable.innerPlayableRadiusPx
  const outerSq = playable.outerPlayableRadiusPx * playable.outerPlayableRadiusPx

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const dx = x - spindle.x
      const dy = y - spindle.y
      const distanceSq = dx * dx + dy * dy
      const idx = (y * width + x) * 4
      const value = distanceSq >= innerSq && distanceSq <= outerSq ? 255 : 0
      data[idx] = value
      data[idx + 1] = value
      data[idx + 2] = value
      data[idx + 3] = 255
    }
  }

  debug.images.push({
    name,
    width,
    height,
    dataUrl: await imageDataToPngDataUrl(imageData),
  })
}

export async function addOverlayDebugImage(
  debug: DebugCollector | undefined,
  name: string,
  mat: unknown,
  overlay: (context: OffscreenCanvasRenderingContext2D) => void,
): Promise<void> {
  if (!debug) {
    return
  }

  const imageData = matToImageData(mat)
  debug.images.push({
    name,
    width: imageData.width,
    height: imageData.height,
    dataUrl: await imageDataToPngDataUrl(imageData, overlay),
  })
}

export function geometryDebug(geometry: VinylGeometry): Record<string, unknown> {
  return {
    center: geometry.center,
    axes: {
      majorRadiusPx: geometry.majorRadiusPx,
      minorRadiusPx: geometry.minorRadiusPx,
    },
    radiusPx: geometry.radiusPx,
    rotation: geometry.angle,
    confidence: null,
  }
}

export function labelDebug(label: LabelResult, outer: VinylGeometry): Record<string, unknown> {
  const centerOffset = Math.hypot(label.center[0] - outer.center[0], label.center[1] - outer.center[1])

  return {
    center: label.center,
    radiusPx: label.radiusPx,
    score: label.score,
    centerOffset,
    leftTransition: label.leftTransition,
    rightTransition: label.rightTransition,
  }
}

export function profileStats(profile: TextureProfile): Record<string, unknown> {
  let min = Infinity
  let max = -Infinity
  let sum = 0

  for (let i = 0; i < profile.energy.length; i += 1) {
    const value = profile.energy[i]
    min = Math.min(min, value)
    max = Math.max(max, value)
    sum += value
  }

  return {
    profileLength: profile.energy.length,
    min: profile.energy.length ? min : 0,
    max: profile.energy.length ? max : 0,
    mean: profile.energy.length ? sum / profile.energy.length : 0,
  }
}

export function drawCircle(
  context: OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  lineWidth = 2,
): void {
  context.beginPath()
  context.arc(x, y, radius, 0, Math.PI * 2)
  context.strokeStyle = color
  context.lineWidth = lineWidth
  context.stroke()
}

export function separatorDebug(separators: Separator[], trackCount: number): Record<string, unknown> {
  return {
    separatorPositions: separators.map((separator) => separator.radiusPx),
    separatorPositionsMm: separators.map((separator) => separator.radiusMm),
    confidence: separators.map((separator) => separator.score),
    prominence: separators.map((separator) => separator.prominence),
    trackCount,
  }
}

type MatLike = {
  cols: number
  rows: number
  data: Uint8Array
  step?: Uint32Array | number[]
  channels?: () => number
}

function matToImageData(mat: unknown): ImageData {
  const source = mat as MatLike
  const width = source.cols
  const height = source.rows
  const channels = typeof source.channels === 'function'
    ? source.channels()
    : Math.max(1, Math.round(source.data.length / (width * height)))
  const step = Array.isArray(source.step) || source.step instanceof Uint32Array ? source.step[0] : width * channels
  const out = new ImageData(width, height)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const srcIdx = y * step + x * channels
      const dstIdx = (y * width + x) * 4

      if (channels === 1) {
        const value = source.data[srcIdx]
        out.data[dstIdx] = value
        out.data[dstIdx + 1] = value
        out.data[dstIdx + 2] = value
        out.data[dstIdx + 3] = 255
      } else {
        out.data[dstIdx] = source.data[srcIdx]
        out.data[dstIdx + 1] = source.data[srcIdx + 1]
        out.data[dstIdx + 2] = source.data[srcIdx + 2]
        out.data[dstIdx + 3] = channels >= 4 ? source.data[srcIdx + 3] : 255
      }
    }
  }

  return out
}

async function imageDataToPngDataUrl(
  imageData: ImageData,
  overlay?: (context: OffscreenCanvasRenderingContext2D) => void,
): Promise<string> {
  const canvas = new OffscreenCanvas(imageData.width, imageData.height)
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Could not create debug canvas context')
  }

  context.imageSmoothingEnabled = false
  context.putImageData(imageData, 0, 0)
  overlay?.(context)

  const blob = await canvas.convertToBlob({ type: 'image/png' })
  const bytes = new Uint8Array(await blob.arrayBuffer())
  return `data:image/png;base64,${toBase64(bytes)}`
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}
