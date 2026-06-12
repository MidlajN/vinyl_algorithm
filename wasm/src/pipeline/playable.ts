// Mirrors backend/core/playable.py → detect_playable_boundaries()
//
// Pure typed-array JS — no OpenCV. Reads pixels directly from Mat.data.
//
// Outer boundary: gradient peak on radial profile at 85–97% of outer radius
// Inner boundary: gradient argmin on radial profile at label+5 → label+35% of groove span

import type { VinylGeometry, LabelResult, PlayableResult, SpindleResult } from '../types';

// ── 1D utilities ─────────────────────────────────────────────────────────────

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

  const out = new Float32Array(signal.length);
  const n = signal.length;
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

function gradient1d(signal: Float32Array): Float32Array {
  const g = new Float32Array(signal.length);
  const n = signal.length;
  if (n < 2) return g;
  g[0]     = signal[1] - signal[0];
  g[n - 1] = signal[n - 1] - signal[n - 2];
  for (let i = 1; i < n - 1; i++) g[i] = (signal[i + 1] - signal[i - 1]) / 2;
  return g;
}

// ── Ring sampler (matches backend sample_ring_intensity + build_radial_profile) ──

function buildRadialProfile(
  pixels: Uint8Array,
  imgW: number,
  imgH: number,
  step: number,
  cx: number,
  cy: number,
  rStart: number,
  rEnd: number,
  sampleCount = 720,
): { radii: Int32Array; values: Float32Array } {
  const rMin = Math.round(rStart);
  const rMax = Math.round(rEnd);
  const count = rMax - rMin;
  const radii  = new Int32Array(count);
  const values = new Float32Array(count);

  // Pre-compute trig once
  const cosines = new Float32Array(sampleCount);
  const sines   = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    const a = (2 * Math.PI * i) / sampleCount;
    cosines[i] = Math.cos(a);
    sines[i]   = Math.sin(a);
  }

  // Histogram for percentile
  const hist = new Uint32Array(256);
  // 5 offsets × sampleCount samples per ring
  const allSamples = new Uint8Array(5 * sampleCount);

  for (let ri = 0; ri < count; ri++) {
    const r = rMin + ri;
    radii[ri] = r;

    let totalSamples = 0;
    for (let off = -2; off <= 2; off++) {
      const rr = r + off;
      for (let i = 0; i < sampleCount; i++) {
        const x = Math.round(cx + rr * cosines[i]);
        const y = Math.round(cy + rr * sines[i]);
        if (x >= 0 && x < imgW && y >= 0 && y < imgH) {
          allSamples[totalSamples++] = pixels[y * step + x];
        }
      }
    }

    // 35th percentile via counting sort
    hist.fill(0);
    for (let i = 0; i < totalSamples; i++) hist[allSamples[i]]++;
    const tgt = Math.ceil(totalSamples * 0.35);
    let cum = 0, p35 = 0;
    for (let v = 0; v < 256; v++) { cum += hist[v]; if (cum >= tgt) { p35 = v; break; } }
    values[ri] = p35;
  }

  return { radii, values };
}

// ── Main export ───────────────────────────────────────────────────────────────

export function detectPlayableBoundaries(
  pixels: Uint8Array,
  imgW: number,
  imgH: number,
  step: number,
  outer: VinylGeometry,
  spindle: SpindleResult,
  label: LabelResult,
): PlayableResult {
  const [outerCx, outerCy] = outer.center;
  const outerRadius = outer.radiusPx;
  const labelRadius = label.radiusPx;

  // ── Outer boundary ─────────────────────────────────────────────────────
  const outerStart = outerRadius * 0.85;
  const outerEnd   = outerRadius * 0.97;

  const outerProf  = buildRadialProfile(pixels, imgW, imgH, step, outerCx, outerCy, outerStart, outerEnd);
  const outerSmooth = gaussianFilter1d(outerProf.values, 1.5);
  const outerGrad  = gradient1d(outerSmooth);

  // threshold = mean + std of gradient
  let gMean = 0, gSqSum = 0;
  for (let i = 0; i < outerGrad.length; i++) { gMean += outerGrad[i]; gSqSum += outerGrad[i] * outerGrad[i]; }
  gMean /= outerGrad.length;
  const gStd = Math.sqrt(Math.max(0, gSqSum / outerGrad.length - gMean * gMean));
  const threshold = gMean + gStd;

  // candidates: indices where grad > threshold
  const spacingPx = 15;
  let outerPlayablePx: number;
  let lastR = -1e9;
  const candidates: number[] = [];
  for (let i = 0; i < outerGrad.length; i++) {
    if (outerGrad[i] > threshold) {
      const r = outerProf.radii[i];
      if (r - lastR >= spacingPx) { candidates.push(r); lastR = r; }
    }
  }

  if (candidates.length === 0) {
    // fallback: argmin of gradient
    let minIdx = 0;
    for (let i = 1; i < outerGrad.length; i++) if (outerGrad[i] < outerGrad[minIdx]) minIdx = i;
    outerPlayablePx = outerProf.radii[minIdx];
  } else {
    outerPlayablePx = candidates[0];
  }

  // ── Inner boundary ─────────────────────────────────────────────────────
  const grooveSpan  = outerRadius - labelRadius;
  const innerStart  = labelRadius + 5;
  const innerEnd    = labelRadius + grooveSpan * 0.35;

  const innerProf   = buildRadialProfile(pixels, imgW, imgH, step, spindle.x, spindle.y, innerStart, innerEnd);
  const innerSmooth = gaussianFilter1d(innerProf.values, 1.5);
  const innerGrad   = gradient1d(innerSmooth);

  let minGradIdx = 0;
  for (let i = 1; i < innerGrad.length; i++) if (innerGrad[i] < innerGrad[minGradIdx]) minGradIdx = i;
  const innerPlayablePx = innerProf.radii[minGradIdx];

  return {
    outerPlayableRadiusPx: outerPlayablePx,
    innerPlayableRadiusPx: innerPlayablePx,
  };
}
