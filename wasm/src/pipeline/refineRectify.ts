// Mirrors backend/core/refine_rectify.py → refine_rectification()
// Translation-only micro correction. Pads before warp to avoid edge clipping.

import type { VinylGeometry } from '../types';
import type { RefinedGeometry } from './geometryRefine';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function refineRectification(
  cv: any,
  src: any,
  outer: VinylGeometry,
  refined: RefinedGeometry,
  padding = 40,
): any {
  const h = src.rows;
  const w = src.cols;
  const [outerX, outerY] = outer.center;
  const dx = outerX - refined.centerX;
  const dy = outerY - refined.centerY;

  // Pad to prevent edge clipping during translation warp
  const padded = new cv.Mat();
  try {
    cv.copyMakeBorder(src, padded, padding, padding, padding, padding,
      cv.BORDER_CONSTANT, new cv.Scalar(0, 0, 0, 0));

    const matrix = cv.matFromArray(2, 3, cv.CV_32F,
      new Float32Array([1, 0, dx, 0, 1, dy]));
    const corrected = new cv.Mat();
    try {
      cv.warpAffine(padded, corrected, matrix,
        new cv.Size(padded.cols, padded.rows), cv.INTER_CUBIC);

      // Crop back to original dimensions
      const roi    = new cv.Rect(padding, padding, w, h);
      const roiMat = corrected.roi(roi);
      const result = new cv.Mat();
      roiMat.copyTo(result);
      roiMat.delete();
      return result;
    } finally {
      corrected.delete();
      matrix.delete();
    }
  } finally {
    padded.delete();
  }
}
