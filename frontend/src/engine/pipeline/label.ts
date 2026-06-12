// Mirrors backend/core/label.py → detect_label_ring()
//
// Calls detectRadialBoundary with label-specific params:
//  expected_radius = outer.radiusPx * (50mm / 152.4mm)
//  polarity = "dark_to_bright"  (vinyl grooves are dark, label is bright)

import { detectRadialBoundary } from './radialBoundary';
import type { LabelResult, VinylGeometry } from '../types';

export function detectLabelRing(_cv: unknown, normalized: any, outer: VinylGeometry): LabelResult { // eslint-disable-line @typescript-eslint/no-explicit-any
  const expectedRadius = outer.radiusPx * (50.0 / 152.4);
  const [cx0, cy0] = outer.center;

  // Pull raw pixels out of the OpenCV Mat for the pure-JS hot loop.
  // step[0] is bytes-per-row (may differ from cols on non-contiguous Mats).
  const pixels: Uint8Array = normalized.data as Uint8Array;
  const step: number = (normalized.step as Uint32Array)[0];

  const result = detectRadialBoundary(
    pixels, normalized.cols, normalized.rows, step,
    cx0, cy0, expectedRadius,
    {
      searchPercent: 0.20,
      centerOffset:  15,
      polarity:      'dark_to_bright',
      sampleCount:   600,
      sampleOffset:  8,
      radiusStep:    2,
    },
  );

  return {
    center:          result.center,
    radiusPx:        result.radiusPx,
    score:           result.score,
    leftTransition:  result.leftTransition,
    rightTransition: result.rightTransition,
  };
}
