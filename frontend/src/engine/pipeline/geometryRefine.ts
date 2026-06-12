// Mirrors backend/core/geometry_refine.py → refine_geometry()
// Pure math — no OpenCV. Trusts label center over outer ellipse center.

import type { VinylGeometry, LabelResult } from '../types';

export interface RefinedGeometry {
  centerX: number;
  centerY: number;
  expectedLabelRadiusPx: number;
  detectedLabelRadiusPx: number;
  scaleFactor: number;
  translationDx: number;
  translationDy: number;
  centerErrorPx: number;
  geometryConfidence: number;
}

export function refineGeometry(outer: VinylGeometry, label: LabelResult): RefinedGeometry {
  const [outerX, outerY] = outer.center;
  const [labelX, labelY] = label.center;

  const expectedLabelRadius = outer.radiusPx * (50.0 / 152.4);
  const dx = labelX - outerX;
  const dy = labelY - outerY;
  const centerErrorPx = Math.sqrt(dx * dx + dy * dy);

  return {
    centerX:                labelX,
    centerY:                labelY,
    expectedLabelRadiusPx:  expectedLabelRadius,
    detectedLabelRadiusPx:  label.radiusPx,
    scaleFactor:            expectedLabelRadius / label.radiusPx,
    translationDx:          dx,
    translationDy:          dy,
    centerErrorPx,
    geometryConfidence:     Math.max(0.0, 1.0 - centerErrorPx / 15.0),
  };
}
