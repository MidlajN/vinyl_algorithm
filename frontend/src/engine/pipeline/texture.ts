// Mirrors backend/core/radial_texture.py → build_radial_texture_profile()
//
// Pure typed-array JS. For each radius r in [innerPx, outerPx]:
//   sample 5 band offsets × 720 points → std() as energy metric
// Separator bands have lower std (uniform); groove regions have higher std.

import type { SpindleResult } from '../types';

export interface TextureProfile {
  radii: Int32Array;
  energy: Float32Array;
}

export function buildRadialTextureProfile(
  pixels: Uint8Array,
  imgW: number,
  imgH: number,
  step: number,
  spindle: SpindleResult,
  innerRadiusPx: number,
  outerRadiusPx: number,
  sampleCount = 720,
  bandHalfWidth = 2,
): TextureProfile {
  const cx = spindle.x;
  const cy = spindle.y;
  const rMin = Math.round(innerRadiusPx);
  const rMax = Math.round(outerRadiusPx);
  const count = rMax - rMin;

  const radii  = new Int32Array(count);
  const energy = new Float32Array(count);

  // Pre-compute trig once
  const cosines = new Float32Array(sampleCount);
  const sines   = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    const a = (2 * Math.PI * i) / sampleCount;
    cosines[i] = Math.cos(a);
    sines[i]   = Math.sin(a);
  }

  // Max possible band samples: (2*bandHalfWidth+1) * sampleCount
  const maxBandSamples = (2 * bandHalfWidth + 1) * sampleCount;
  const bandVals = new Float32Array(maxBandSamples);

  for (let ri = 0; ri < count; ri++) {
    const r = rMin + ri;
    radii[ri] = r;

    let totalSamples = 0;
    for (let off = -bandHalfWidth; off <= bandHalfWidth; off++) {
      const rr = r + off;
      for (let i = 0; i < sampleCount; i++) {
        const x = Math.round(cx + rr * cosines[i]);
        const y = Math.round(cy + rr * sines[i]);
        if (x >= 0 && x < imgW && y >= 0 && y < imgH) {
          bandVals[totalSamples++] = pixels[y * step + x];
        }
      }
    }

    // std of band values
    if (totalSamples === 0) { energy[ri] = 0; continue; }
    let sum = 0, sumSq = 0;
    for (let i = 0; i < totalSamples; i++) { sum += bandVals[i]; sumSq += bandVals[i] * bandVals[i]; }
    const mean = sum / totalSamples;
    energy[ri] = Math.sqrt(Math.max(0, sumSq / totalSamples - mean * mean));
  }

  return { radii, energy };
}
