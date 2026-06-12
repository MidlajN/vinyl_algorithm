// Mirrors backend/core/separator_detection.py → detect_track_separators()
//
// Pure TypeScript port of scipy.signal.find_peaks + peak_widths.
// No external dependencies.

import type { Separator, PlayableResult } from '../types';
import type { TextureProfile } from './texture';

// ── 1D signal utilities ───────────────────────────────────────────────────────

function gaussianFilter1d(signal: Float32Array, sigma: number): Float32Array {
  const radius = Math.ceil(4 * sigma);
  const kernel = new Float32Array(2 * radius + 1);
  let kSum = 0;
  for (let i = 0; i <= 2 * radius; i++) {
    const x = i - radius;
    kernel[i] = Math.exp(-0.5 * x * x / (sigma * sigma));
    kSum += kernel[i];
  }
  for (let i = 0; i < kernel.length; i++) kernel[i] /= kSum;

  const n = signal.length;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let k = 0; k < kernel.length; k++) {
      const j = Math.max(0, Math.min(n - 1, i + k - radius));
      sum += kernel[k] * signal[j];
    }
    out[i] = sum;
  }
  return out;
}

// Prominence for a single peak index given the set of all peak indices.
function peakProminence(signal: Float32Array, allPeaks: number[], p: number): number {
  const peakH = signal[p];

  // Left: find nearest taller peak, then min in [boundary, p]
  let leftBoundary = 0;
  for (let k = allPeaks.indexOf(p) - 1; k >= 0; k--) {
    if (signal[allPeaks[k]] > peakH) { leftBoundary = allPeaks[k]; break; }
  }
  let leftBase = Infinity;
  for (let i = leftBoundary; i <= p; i++) if (signal[i] < leftBase) leftBase = signal[i];

  // Right: find nearest taller peak, then min in [p, boundary]
  let rightBoundary = signal.length - 1;
  const pIdx = allPeaks.indexOf(p);
  for (let k = pIdx + 1; k < allPeaks.length; k++) {
    if (signal[allPeaks[k]] > peakH) { rightBoundary = allPeaks[k]; break; }
  }
  let rightBase = Infinity;
  for (let i = p; i <= rightBoundary; i++) if (signal[i] < rightBase) rightBase = signal[i];

  return peakH - Math.max(leftBase, rightBase);
}

interface Peak { idx: number; prom: number; }

// scipy-compatible find_peaks with prominence + distance filtering.
function findPeaks(signal: Float32Array, minProminence: number, minDistance: number): Peak[] {
  const n = signal.length;

  // Local maxima (strictly greater than left neighbor, ≥ right neighbor)
  const allPeakIdxs: number[] = [];
  for (let i = 1; i < n - 1; i++) {
    if (signal[i] > signal[i - 1] && signal[i] >= signal[i + 1]) allPeakIdxs.push(i);
  }

  // Compute prominence
  const candidates: Peak[] = allPeakIdxs
    .map(i => ({ idx: i, prom: peakProminence(signal, allPeakIdxs, i) }))
    .filter(p => p.prom >= minProminence);

  // Distance filter: priority = higher peak. Mark too-close lower peaks as removed.
  candidates.sort((a, b) => signal[b.idx] - signal[a.idx]); // desc by height
  const kept: Peak[] = [];
  for (const c of candidates) {
    if (!kept.some(k => Math.abs(k.idx - c.idx) < minDistance)) kept.push(c);
  }

  kept.sort((a, b) => a.idx - b.idx); // restore index order
  return kept;
}

// scipy-compatible peak_widths at rel_height=0.5
interface WidthResult { width: number; leftIp: number; rightIp: number; }

function peakWidth(signal: Float32Array, peak: Peak, relHeight: number): WidthResult {
  const threshold = signal[peak.idx] - relHeight * peak.prom;
  const n = signal.length;

  // Left crossing: walk left from peak
  let leftIp = 0;
  for (let j = peak.idx - 1; j >= 0; j--) {
    if (signal[j] <= threshold) {
      // Linear interpolation between j and j+1
      const denom = signal[j + 1] - signal[j];
      leftIp = denom !== 0 ? j + (threshold - signal[j]) / denom : j;
      break;
    }
    if (j === 0) leftIp = 0;
  }

  // Right crossing: walk right from peak
  let rightIp = n - 1;
  for (let j = peak.idx + 1; j < n; j++) {
    if (signal[j] <= threshold) {
      const denom = signal[j - 1] - signal[j];
      rightIp = denom !== 0 ? j - 1 + (signal[j - 1] - threshold) / denom : j;
      break;
    }
    if (j === n - 1) rightIp = n - 1;
  }

  return { width: rightIp - leftIp, leftIp, rightIp };
}

// ── Main export ───────────────────────────────────────────────────────────────

export interface SeparatorResult {
  count: number;
  separators: Separator[];
}

export function detectTrackSeparators(
  profile: TextureProfile,
  playable: PlayableResult,
  ppm: number,
  smoothingSigma = 2.0,
  minProminence = 2.0,
  minDistanceMm = 8.0,
  minWidthMm = 0.5,
  maxWidthMm = 8.0,
  ignoreEdgeMm = 6.0,
): SeparatorResult {
  const { radii, energy } = profile;
  const n = radii.length;
  if (n === 0) return { count: 0, separators: [] };

  const signal = gaussianFilter1d(energy, smoothingSigma);

  const innerLimit = playable.innerPlayableRadiusPx + ignoreEdgeMm * ppm;
  const outerLimit = playable.outerPlayableRadiusPx - ignoreEdgeMm * ppm;

  const minDistancePx = minDistanceMm * ppm;
  const minWidthPx    = minWidthMm    * ppm;
  const maxWidthPx    = maxWidthMm    * ppm;

  const peaks = findPeaks(signal, minProminence, minDistancePx);

  const separators: Separator[] = [];

  for (const peak of peaks) {
    const radiusPx = radii[peak.idx];

    if (radiusPx < innerLimit || radiusPx > outerLimit) continue;

    const { width: widthPx, leftIp, rightIp } = peakWidth(signal, peak, 0.5);

    if (widthPx < minWidthPx || widthPx > maxWidthPx) continue;

    const radiusMm = radiusPx / ppm;
    const widthMm  = widthPx  / ppm;
    const score    = peak.prom / (widthMm + 1e-6);

    const leftIdx  = Math.max(0,     Math.min(n - 1, Math.round(leftIp)));
    const rightIdx = Math.max(0,     Math.min(n - 1, Math.round(rightIp)));

    separators.push({
      radiusPx,
      radiusMm,
      energy:     signal[peak.idx],
      prominence: peak.prom,
      widthPx,
      widthMm,
      score,
      leftPx:  radii[leftIdx],
      rightPx: radii[rightIdx],
    });
  }

  // Sort inner → outer
  separators.sort((a, b) => a.radiusPx - b.radiusPx);

  return { count: separators.length, separators };
}
