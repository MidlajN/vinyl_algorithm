// Mirrors backend/core/ellipse.py → detect_outer_ellipse()
// Input: grayscale Mat
// Output: VinylGeometry (center, radii, angle)
// All intermediate Mats deleted internally.

import type { VinylGeometry } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function detectOuterEllipse(cv: any, gray: any): VinylGeometry {
  const blurred = new cv.Mat();
  try {
    cv.GaussianBlur(gray, blurred, new cv.Size(7, 7), 0, 0);

    const thresh = new cv.Mat();
    try {
      cv.threshold(blurred, thresh, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU);

      const kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(9, 9));
      try {
        cv.morphologyEx(thresh, thresh, cv.MORPH_CLOSE, kernel);
      } finally {
        kernel.delete();
      }

      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      try {
        cv.findContours(thresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        const imageArea = gray.rows * gray.cols;
        let largestContour: any = null;
        let largestArea = 0;

        for (let i = 0; i < contours.size(); i++) {
          const c = contours.get(i);
          if (c.rows < 5) { c.delete(); continue; }
          const area = cv.contourArea(c);
          if (area < imageArea * 0.05) { c.delete(); continue; }
          if (area > largestArea) {
            if (largestContour) largestContour.delete();
            largestContour = c;
            largestArea = area;
          } else {
            c.delete();
          }
        }

        if (!largestContour) {
          throw new Error('No valid outer contour found — disc not detected');
        }

        try {
          const rrect = cv.fitEllipse(largestContour);
          // RotatedRect: { center: {x,y}, size: {width,height}, angle }
          let cx = rrect.center.x;
          let cy = rrect.center.y;
          let major = rrect.size.width;
          let minor = rrect.size.height;
          let angle = rrect.angle;

          // Normalize: ensure major >= minor (mirrors backend swap)
          if (minor > major) {
            [major, minor] = [minor, major];
            angle += 90;
          }

          const majorRadius = major / 2;
          const minorRadius = minor / 2;
          const radiusPx = Math.sqrt(majorRadius * minorRadius);

          return {
            center: [cx, cy],
            radiusPx,
            majorRadiusPx: majorRadius,
            minorRadiusPx: minorRadius,
            angle,
          };
        } finally {
          largestContour.delete();
        }
      } finally {
        hierarchy.delete();
        contours.delete();
      }
    } finally {
      thresh.delete();
    }
  } finally {
    blurred.delete();
  }
}
