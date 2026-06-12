import type { AnalysisDebugReport } from './types'
import type { VinylResult } from '../types/vinyl'

export function isVinylDebugEnabled(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  const params = new URLSearchParams(window.location.search)
  return (
    params.get('debug') === 'true' ||
    params.get('debug') === '1' ||
    params.get('vinylDebug') === 'true' ||
    params.get('vinylDebug') === '1' ||
    window.localStorage.getItem('vinylDebug') === 'true' ||
    window.localStorage.getItem('vinylDebug') === '1'
  )
}

export function publishVinylDebugResult(result: VinylResult): void {
  if (typeof window === 'undefined' || !result.debug) {
    return
  }

  const debugWindow = window as Window & {
    __vinylLastDebug?: AnalysisDebugReport
    __vinylLastResult?: VinylResult
    compareAnalysisRuns?: typeof compareAnalysisRuns
  }

  debugWindow.__vinylLastDebug = result.debug
  debugWindow.__vinylLastResult = result
  debugWindow.compareAnalysisRuns = compareAnalysisRuns
  console.info('[vinyl-debug] Result available on window.__vinylLastDebug and window.__vinylLastResult')
}

export function compareAnalysisRuns(
  desktop: VinylResult | AnalysisDebugReport,
  mobile: VinylResult | AnalysisDebugReport,
) {
  const desktopDebug = extractDebug(desktop)
  const mobileDebug = extractDebug(mobile)

  if (!desktopDebug || !mobileDebug) {
    console.warn('[vinyl-debug:compare] Missing debug reports for comparison')
    return
  }

  const rows = [
    comparePoint('outer.center', getValue(desktopDebug, 'outer.center'), getValue(mobileDebug, 'outer.center')),
    compareNumber('outer.majorRadiusPx', getValue(desktopDebug, 'outer.majorRadiusPx'), getValue(mobileDebug, 'outer.majorRadiusPx')),
    compareNumber('outer.minorRadiusPx', getValue(desktopDebug, 'outer.minorRadiusPx'), getValue(mobileDebug, 'outer.minorRadiusPx')),
    compareNumber('outer.angle', getValue(desktopDebug, 'outer.angle'), getValue(mobileDebug, 'outer.angle')),
    comparePoint('spindle.center', getValue(desktopDebug, 'spindle.center'), getValue(mobileDebug, 'spindle.center')),
    compareNumber('label.radiusPx', getValue(desktopDebug, 'label.radiusPx'), getValue(mobileDebug, 'label.radiusPx')),
    compareNumber(
      'playable.innerPlayableRadiusPx',
      getValue(desktopDebug, 'playable.innerPlayableRadiusPx'),
      getValue(mobileDebug, 'playable.innerPlayableRadiusPx'),
    ),
    compareNumber(
      'playable.outerPlayableRadiusPx',
      getValue(desktopDebug, 'playable.outerPlayableRadiusPx'),
      getValue(mobileDebug, 'playable.outerPlayableRadiusPx'),
    ),
    compareArray(
      'separators.radiusPx',
      getValue(desktopDebug, 'separators.radiusPx'),
      getValue(mobileDebug, 'separators.radiusPx'),
    ),
  ].filter(Boolean)

  console.group('[vinyl-debug:compare] Desktop vs Mobile')
  console.table(rows)
  console.groupEnd()
}

function extractDebug(value: VinylResult | AnalysisDebugReport): AnalysisDebugReport | undefined {
  return 'stages' in value ? value : value.debug
}

function getValue(report: AnalysisDebugReport, path: string): unknown {
  const stageName = path.split('.')[0]
  const keyPath = path.split('.').slice(1)
  const stage = report.stages.find((entry) => entry.stage === stageName)
  let value: unknown = stage?.data

  for (const key of keyPath) {
    if (!value || typeof value !== 'object') {
      return undefined
    }
    value = (value as Record<string, unknown>)[key]
  }

  return value
}

function comparePoint(name: string, desktop: unknown, mobile: unknown) {
  if (!Array.isArray(desktop) || !Array.isArray(mobile)) {
    return null
  }

  return {
    field: name,
    desktop: `(${desktop[0]}, ${desktop[1]})`,
    mobile: `(${mobile[0]}, ${mobile[1]})`,
    delta: `dx=${toDelta(desktop[0], mobile[0])}, dy=${toDelta(desktop[1], mobile[1])}`,
  }
}

function compareNumber(name: string, desktop: unknown, mobile: unknown) {
  if (typeof desktop !== 'number' || typeof mobile !== 'number') {
    return null
  }

  return {
    field: name,
    desktop,
    mobile,
    delta: toDelta(desktop, mobile),
  }
}

function compareArray(name: string, desktop: unknown, mobile: unknown) {
  if (!Array.isArray(desktop) || !Array.isArray(mobile)) {
    return null
  }

  return {
    field: name,
    desktop: desktop.join(', '),
    mobile: mobile.join(', '),
    delta: desktop.map((value, index) => toDelta(value, mobile[index])).join(', '),
  }
}

function toDelta(a: unknown, b: unknown): number | string {
  if (typeof a !== 'number' || typeof b !== 'number') {
    return 'n/a'
  }

  return Number((b - a).toFixed(4))
}
