// Mirrors backend/core/spindle.py → detect_spindle()
//
// Same ring-sampling hot loop as radialBoundary but with spindle-specific scoring:
//  - polarity-agnostic: strength = |mean(outer) - mean(inner)|
//  - radius_penalty = |r - expected_radius| * 0.35
//  - consistency_penalty = std(outer - inner) * 0.35
//
// Expected spindle radius: outer.radiusPx / 152.4 * 3.62 mm

import type { VinylGeometry, SpindleResult } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function detectSpindle(
  cv: any,
  src: any,   // RGBA Mat (microRectified)
  refinedCenter: [number, number],
  outer: VinylGeometry,
  searchOffset = 15,
  sampleCount = 180,
  sampleOffset = 3,
): SpindleResult {
  // Convert RGBA → gray
  const gray = new cv.Mat();
  try {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    const pixels: Uint8Array = gray.data as Uint8Array;
    const step: number = (gray.step as Uint32Array)[0];
    const imgW = gray.cols;
    const imgH = gray.rows;

    const ppm = outer.radiusPx / 152.4;
    const expectedRadius = ppm * 3.62;
    const minRadius = Math.max(3, Math.round(expectedRadius * 0.6));
    const maxRadius = Math.round(expectedRadius * 1.4);

    const [cx0, cy0] = refinedCenter;

    // Pre-compute trig tables
    const cosines = new Float32Array(sampleCount);
    const sines   = new Float32Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
      const a = (2 * Math.PI * i) / sampleCount;
      cosines[i] = Math.cos(a);
      sines[i]   = Math.sin(a);
    }

    const innerVals = new Float32Array(sampleCount);
    const outerVals = new Float32Array(sampleCount);

    let bestScore = -1e9;
    let bestCx = cx0, bestCy = cy0, bestR = minRadius;

    for (let dx = -searchOffset; dx <= searchOffset; dx++) {
      for (let dy = -searchOffset; dy <= searchOffset; dy++) {
        const cx = cx0 + dx;
        const cy = cy0 + dy;
        const centerPenalty = Math.hypot(dx, dy) * 0.15;

        for (let r = minRadius; r <= maxRadius; r++) {
          const innerR = r - sampleOffset;
          const outerR = r + sampleOffset;
          if (innerR <= 0) continue;

          let validCount = 0;
          for (let i = 0; i < sampleCount; i++) {
            const x1 = Math.round(cx + innerR * cosines[i]);
            const y1 = Math.round(cy + innerR * sines[i]);
            const x2 = Math.round(cx + outerR * cosines[i]);
            const y2 = Math.round(cy + outerR * sines[i]);
            if (x1 >= 0 && x1 < imgW && y1 >= 0 && y1 < imgH &&
                x2 >= 0 && x2 < imgW && y2 >= 0 && y2 < imgH) {
              innerVals[validCount] = pixels[y1 * step + x1];
              outerVals[validCount] = pixels[y2 * step + x2];
              validCount++;
            }
          }
          if (validCount < sampleCount * 0.9) continue;

          // mean(outer) - mean(inner)
          let innerSum = 0, outerSum = 0, diffSumSq = 0, diffSum = 0;
          for (let i = 0; i < validCount; i++) {
            innerSum += innerVals[i];
            outerSum += outerVals[i];
          }
          const innerMean = innerSum / validCount;
          const outerMean = outerSum / validCount;
          const transition = outerMean - innerMean;

          for (let i = 0; i < validCount; i++) {
            const d = outerVals[i] - innerVals[i];
            diffSum  += d;
            diffSumSq += d * d;
          }
          const diffMean = diffSum / validCount;
          const consistencyPenalty =
            Math.sqrt(Math.max(0, diffSumSq / validCount - diffMean * diffMean)) * 0.35;
          const radiusPenalty = Math.abs(r - expectedRadius) * 0.35;

          const score = Math.abs(transition) - consistencyPenalty - centerPenalty - radiusPenalty;

          if (score > bestScore) {
            bestScore = score;
            bestCx = cx; bestCy = cy; bestR = r;
          }
        }
      }
    }

    if (bestScore === -1e9) throw new Error('Spindle detection failed');

    return { x: bestCx, y: bestCy, radiusPx: bestR, score: bestScore };
  } finally {
    gray.delete();
  }
}
