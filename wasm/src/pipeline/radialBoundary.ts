// Mirrors backend/core/radial_boundary.py → detect_radial_boundary()
//
// THE BOTTLENECK: 91% of backend time. Ported as pure typed-array JS
// (no OpenCV calls) so V8 JIT can optimise the inner loop.
//
// Key differences from Python:
//  - Counting-sort histogram for percentile (avoids sort() in hot loop)
//  - Left/right transitions computed only for the winner (not every candidate)
//  - Typed Float32Array for trig tables, Uint8Array for pixel values

export interface RadialBoundaryResult {
  center: [number, number];
  radiusPx: number;
  score: number;
  leftTransition: number;
  rightTransition: number;
}

export interface RadialBoundaryOptions {
  searchPercent?: number;
  centerOffset?: number;
  polarity?: 'dark_to_bright' | 'bright_to_dark';
  sampleCount?: number;
  sampleOffset?: number;
  radiusStep?: number;
}

export function detectRadialBoundary(
  pixels: Uint8Array,   // flat row-major grayscale pixel data
  imageWidth: number,
  imageHeight: number,
  imageStep: number,    // bytes per row (may differ from width if non-contiguous)
  centerX: number,
  centerY: number,
  expectedRadius: number,
  opts: RadialBoundaryOptions = {},
): RadialBoundaryResult {
  const {
    searchPercent  = 0.20,
    centerOffset   = 12,
    polarity       = 'bright_to_dark',
    sampleCount    = 720,
    sampleOffset   = 8,
    radiusStep     = 2,
  } = opts;

  const minRadius = Math.round(expectedRadius * (1 - searchPercent));
  const maxRadius = Math.round(expectedRadius * (1 + searchPercent));

  // ── Precompute trig tables (done once per call) ──────────────────────────
  const cosines = new Float32Array(sampleCount);
  const sines   = new Float32Array(sampleCount);
  const twoPI   = 2 * Math.PI;
  for (let i = 0; i < sampleCount; i++) {
    const a = (twoPI * i) / sampleCount;
    cosines[i] = Math.cos(a);
    sines[i]   = Math.sin(a);
  }

  // ── Pre-allocate value buffers outside all loops ─────────────────────────
  const innerVals = new Uint8Array(sampleCount);
  const outerVals = new Uint8Array(sampleCount);
  const hist      = new Uint16Array(256);   // reused for counting sort

  let bestScore = -1e9;
  let bestCx = centerX, bestCy = centerY, bestR = minRadius;

  // ── Triple loop: center × center × radius ────────────────────────────────
  for (let dx = -centerOffset; dx <= centerOffset; dx++) {
    for (let dy = -centerOffset; dy <= centerOffset; dy++) {
      const cx = centerX + dx;
      const cy = centerY + dy;
      const centerPenalty = Math.hypot(dx, dy) * 0.15;

      for (let r = minRadius; r <= maxRadius; r += radiusStep) {
        const innerR = r - sampleOffset;
        const outerR = r + sampleOffset;

        // ── Sample ring pixels ──────────────────────────────────────────
        let validCount = 0;
        for (let i = 0; i < sampleCount; i++) {
          const x1 = Math.round(cx + innerR * cosines[i]);
          const y1 = Math.round(cy + innerR * sines[i]);
          const x2 = Math.round(cx + outerR * cosines[i]);
          const y2 = Math.round(cy + outerR * sines[i]);

          if (
            x1 >= 0 && x1 < imageWidth && y1 >= 0 && y1 < imageHeight &&
            x2 >= 0 && x2 < imageWidth && y2 >= 0 && y2 < imageHeight
          ) {
            innerVals[validCount] = pixels[y1 * imageStep + x1];
            outerVals[validCount] = pixels[y2 * imageStep + x2];
            validCount++;
          }
        }

        if (validCount < sampleCount * 0.8) continue;

        // ── inner 30th percentile via counting sort ─────────────────────
        hist.fill(0);
        for (let i = 0; i < validCount; i++) hist[innerVals[i]]++;
        const tgt30 = Math.ceil(validCount * 0.30);
        let cum = 0, innerLevel = 0;
        for (let v = 0; v < 256; v++) { cum += hist[v]; if (cum >= tgt30) { innerLevel = v; break; } }

        // ── outer 70th percentile ───────────────────────────────────────
        hist.fill(0);
        for (let i = 0; i < validCount; i++) hist[outerVals[i]]++;
        const tgt70 = Math.ceil(validCount * 0.70);
        cum = 0;
        let outerLevel = 0;
        for (let v = 0; v < 256; v++) { cum += hist[v]; if (cum >= tgt70) { outerLevel = v; break; } }

        const transition = outerLevel - innerLevel;

        // ── std of (outer - inner) ──────────────────────────────────────
        let diffSum = 0, diffSumSq = 0;
        for (let i = 0; i < validCount; i++) {
          const d = outerVals[i] - innerVals[i];
          diffSum   += d;
          diffSumSq += d * d;
        }
        const diffMean = diffSum / validCount;
        const transitionStd = Math.sqrt(Math.max(0, diffSumSq / validCount - diffMean * diffMean));

        let score = polarity === 'dark_to_bright' ? transition : -transition;
        score -= transitionStd * 0.25;
        score -= centerPenalty;

        if (score > bestScore) {
          bestScore = score;
          bestCx = cx; bestCy = cy; bestR = r;
        }
      }
    }
  }

  if (bestScore === -1e9) throw new Error('Boundary detection failed — no valid candidates');

  // ── Re-sample winner once for left/right transitions ─────────────────────
  const innerR = bestR - sampleOffset;
  const outerR = bestR + sampleOffset;
  let lInner = 0, lOuter = 0, lCount = 0;
  let rInner = 0, rOuter = 0, rCount = 0;

  for (let i = 0; i < sampleCount; i++) {
    const x1 = Math.round(bestCx + innerR * cosines[i]);
    const y1 = Math.round(bestCy + innerR * sines[i]);
    const x2 = Math.round(bestCx + outerR * cosines[i]);
    const y2 = Math.round(bestCy + outerR * sines[i]);

    if (
      x1 >= 0 && x1 < imageWidth && y1 >= 0 && y1 < imageHeight &&
      x2 >= 0 && x2 < imageWidth && y2 >= 0 && y2 < imageHeight
    ) {
      const iv = pixels[y1 * imageStep + x1];
      const ov = pixels[y2 * imageStep + x2];
      if (cosines[i] < 0) { lInner += iv; lOuter += ov; lCount++; }
      else                 { rInner += iv; rOuter += ov; rCount++; }
    }
  }

  return {
    center:          [bestCx, bestCy],
    radiusPx:        bestR,
    score:           bestScore,
    leftTransition:  lCount > 0 ? (lOuter - lInner) / lCount : 0,
    rightTransition: rCount > 0 ? (rOuter - rInner) / rCount : 0,
  };
}
