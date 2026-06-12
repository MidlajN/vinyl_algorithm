// Mirrors crop_to_disc() in backend/services/vinyl_analyser.py
// Crops tightly around the disc and masks out everything outside the radius.
// Returns a new Mat (caller must delete) and updated geometry with local center.

import type { VinylGeometry } from '../types';

export interface CropResult {
  cropped: any;   // caller must delete
  outer: VinylGeometry;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function cropToDisc(cv: any, src: any, outer: VinylGeometry, margin = 10): CropResult {
  const [cx, cy] = outer.center;
  const r = Math.round(outer.radiusPx);

  const x0 = Math.max(0, Math.round(cx - r - margin));
  const y0 = Math.max(0, Math.round(cy - r - margin));
  const x1 = Math.min(src.cols, Math.round(cx + r + margin));
  const y1 = Math.min(src.rows, Math.round(cy + r + margin));

  // ROI slice → copy
  const roi = new cv.Rect(x0, y0, x1 - x0, y1 - y0);
  const roiMat = src.roi(roi);
  const croppedCopy = new cv.Mat();
  roiMat.copyTo(croppedCopy);
  roiMat.delete();

  // Circle mask
  const localCx = cx - x0;
  const localCy = cy - y0;
  const mask = cv.Mat.zeros(croppedCopy.rows, croppedCopy.cols, cv.CV_8UC1);
  try {
    cv.circle(mask, new cv.Point(Math.round(localCx), Math.round(localCy)), r + margin, new cv.Scalar(255, 0, 0, 0), -1);
    const masked = new cv.Mat();
    cv.bitwise_and(croppedCopy, croppedCopy, masked, mask);
    croppedCopy.delete();

    return {
      cropped: masked,
      outer: { ...outer, center: [localCx, localCy] },
    };
  } finally {
    mask.delete();
  }
}
