// Mirrors backend/core/rectify.py → rectify_disc()
// 1. Rotate around ellipse center to align the major axis
// 2. Apply affine Y-scale to stretch minor→major (corrects perspective squash)
// Returns new Mat — caller must delete.

import type { VinylGeometry } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rectifyDisc(cv: any, src: any, outer: VinylGeometry): any {
  const [cx, cy] = outer.center;
  const { majorRadiusPx: major, minorRadiusPx: minor, angle } = outer;
  const h = src.rows;
  const w = src.cols;
  const scaleY = major / minor;

  // Step 1: rotate
  const rotM = cv.getRotationMatrix2D(new cv.Point(cx, cy), angle, 1.0);
  const rotated = new cv.Mat();
  try {
    cv.warpAffine(src, rotated, rotM, new cv.Size(w, h), cv.INTER_CUBIC);
  } finally {
    rotM.delete();
  }

  // Step 2: Y-scale affine — stretches vertically around cy
  //   affine = [[1, 0, 0], [0, scaleY, cy*(1 - scaleY)]]
  const affineData = new Float32Array([
    1, 0, 0,
    0, scaleY, cy * (1 - scaleY),
  ]);
  const affine = cv.matFromArray(2, 3, cv.CV_32F, affineData);
  const corrected = new cv.Mat();
  try {
    cv.warpAffine(rotated, corrected, affine, new cv.Size(w, h), cv.INTER_CUBIC);
  } finally {
    affine.delete();
    rotated.delete();
  }

  return corrected;
}
