// Mirrors backend/core/vinyl_normalize.py → normalize_vinyl()
//
// Input: RGBA Mat (output of rectifyDisc / refineRectification)
// Output: grayscale normalized Mat — caller must delete
//
// Steps:
//  1. RGBA → gray
//  2. Large GaussianBlur (σ=25) to suppress groove texture
//  3. subtract(smooth, gray) — keeps flat regions bright, grooves dark
//  4. normalize 0-255 (NORM_MINMAX)
//  5. Apply disc mask

import type { VinylGeometry } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeVinyl(cv: any, src: any, outer?: VinylGeometry): any {
  const gray = new cv.Mat();
  try {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    // σ=25 → auto kernel size via Size(0,0)
    const smooth = new cv.Mat();
    try {
      cv.GaussianBlur(gray, smooth, new cv.Size(0, 0), 25, 25);

      const detailRemoved = new cv.Mat();
      try {
        // smooth - gray: subtracts groove texture; saturates to 0 where gray > smooth
        cv.subtract(smooth, gray, detailRemoved);

        const normalized = new cv.Mat();
        cv.normalize(detailRemoved, normalized, 0, 255, cv.NORM_MINMAX, cv.CV_8U);

        if (!outer) return normalized;

        // Disc mask — keep only inside outer radius
        const [cx, cy] = outer.center;
        const r = Math.round(outer.radiusPx * 1.01);
        const mask = cv.Mat.zeros(normalized.rows, normalized.cols, cv.CV_8UC1);
        try {
          cv.circle(
            mask,
            new cv.Point(Math.round(cx), Math.round(cy)),
            r,
            new cv.Scalar(255, 0, 0, 0),
            -1,
          );
          const masked = new cv.Mat();
          cv.bitwise_and(normalized, normalized, masked, mask);
          normalized.delete();
          return masked;
        } finally {
          mask.delete();
        }
      } finally {
        detailRemoved.delete();
      }
    } finally {
      smooth.delete();
    }
  } finally {
    gray.delete();
  }
}
