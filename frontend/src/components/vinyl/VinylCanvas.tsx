import { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { Track, VinylMode } from '../../types/vinyl'
import { VinylAnimation } from './VinylAnimation'
import { VinylTrackRing } from './VinylTrackRing'

type VinylCanvasProps = {
  tracks: Track[]
  highlightedTrackNumber?: number | null
  onHighlightTrack?: (track: Track) => void
  onClearHighlight?: () => void
  mode?: VinylMode
  imageUrl?: string
}

type RingGeometry = {
  track: Track
  radius: number
  strokeWidth: number
}

export function VinylCanvas({
  tracks,
  highlightedTrackNumber,
  onHighlightTrack,
  onClearHighlight,
  mode = 'generated',
  imageUrl,
}: VinylCanvasProps) {
  const rings = useMemo<RingGeometry[]>(() => {
    const largestRadius = Math.max(...tracks.map((track) => track.end_radius_px), 1)
    const minVisualRadius = 38
    const maxVisualRadius = 132
    const visualRange = maxVisualRadius - minVisualRadius

    return tracks.map((track) => {
      const start = minVisualRadius + (track.start_radius_px / largestRadius) * visualRange
      const end = minVisualRadius + (track.end_radius_px / largestRadius) * visualRange
      const strokeWidth = Math.max(end - start, 4)

      return {
        track,
        radius: start + strokeWidth / 2,
        strokeWidth,
      }
    })
  }, [tracks])

  return (
    <section className="relative mx-auto aspect-square w-full max-w-[360px]" aria-label="Vinyl track map">
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,var(--color-accent-soft),transparent_64%)] blur-2xl" />
      <VinylAnimation className="absolute inset-[5%] rounded-full">
        <svg
          className="size-full overflow-visible rounded-full"
          viewBox="0 0 300 300"
          role="img"
          aria-label="Generated vinyl rings"
        >
          <defs>
            <radialGradient id="vinylFace" cx="46%" cy="42%">
              <stop offset="0%" stopColor="var(--color-vinyl-center)" />
              <stop offset="34%" stopColor="var(--color-vinyl-mid)" />
              <stop offset="100%" stopColor="var(--color-vinyl-edge)" />
            </radialGradient>
          </defs>
          <circle cx="150" cy="150" r="142" fill="url(#vinylFace)" />
          {mode === 'image' && imageUrl ? (
            <image href={imageUrl} x="8" y="8" width="284" height="284" clipPath="circle(142px at 150px 150px)" opacity="0.72" />
          ) : null}
          <circle cx="150" cy="150" r="136" fill="none" stroke="var(--color-vinyl-sheen)" strokeWidth="1" />
          <circle cx="150" cy="150" r="116" fill="none" stroke="var(--color-vinyl-sheen)" strokeWidth="0.7" opacity="0.45" />
          <circle cx="150" cy="150" r="92" fill="none" stroke="var(--color-vinyl-sheen)" strokeWidth="0.6" opacity="0.34" />
          {rings.map((ring) => (
            <circle
              key={`separator-${ring.track.track_number}`}
              cx="150"
              cy="150"
              r={Math.max(ring.radius - ring.strokeWidth / 2, 36)}
              fill="none"
              stroke="var(--color-separator)"
              strokeWidth="1"
              opacity="0.62"
            />
          ))}
          {rings.map((ring) => (
            <VinylTrackRing
              key={ring.track.track_number}
              track={ring.track}
              radius={ring.radius}
              strokeWidth={ring.strokeWidth}
              isHighlighted={highlightedTrackNumber === ring.track.track_number}
              onHighlight={onHighlightTrack}
              onClearHighlight={onClearHighlight}
            />
          ))}
          <motion.circle
            cx="150"
            cy="150"
            r="34"
            fill="var(--color-label)"
            stroke="var(--color-border)"
            strokeWidth="1"
            animate={{ scale: highlightedTrackNumber ? [1, 1.025, 1] : 1 }}
            transition={{ duration: 1.8, repeat: highlightedTrackNumber ? Infinity : 0 }}
          />
          <circle cx="150" cy="150" r="7" fill="var(--color-bg)" />
        </svg>
      </VinylAnimation>
    </section>
  )
}
