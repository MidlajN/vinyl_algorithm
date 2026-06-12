// Mirrors backend/core/tracks.py → build_tracks()
// Boundaries = [outer_r, ...separator_radii_desc, inner_r]
// Each consecutive pair → one track.

import type { Track, Separator, PlayableResult } from '../types';

export function buildTracks(
  playable: PlayableResult,
  separators: Separator[],
  ppm: number,
): Track[] {
  const outerR = playable.outerPlayableRadiusPx;
  const innerR = playable.innerPlayableRadiusPx;

  // Descending separator radii
  const sepRadii = separators
    .map(s => s.radiusPx)
    .sort((a, b) => b - a);

  const boundaries = [outerR, ...sepRadii, innerR];

  return boundaries.slice(0, -1).map((startPx, i) => {
    const endPx   = boundaries[i + 1];
    const widthPx = startPx - endPx;
    return {
      trackNumber:    i + 1,
      startRadiusPx: startPx,
      endRadiusPx:   endPx,
      startRadiusMm: startPx / ppm,
      endRadiusMm:   endPx   / ppm,
      widthPx,
      widthMm:       widthPx / ppm,
    };
  });
}
