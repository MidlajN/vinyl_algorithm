import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Track, VinylMode } from '../../types/vinyl'
import { VinylAnimation } from './VinylAnimation'
import { VinylTrackRing } from './VinylTrackRing'

// Physical constants
const VINYL_OUTER_MM = 152.4
const LABEL_RADIUS_MM = 50.8
const RENDER_R = 142 // SVG units — matches outer disc circle

function toRenderR(mm: number): number {
  return (mm / VINYL_OUTER_MM) * RENDER_R
}

const LABEL_R = toRenderR(LABEL_RADIUS_MM) // ≈ 47.3

// Radial line angle: upper-right quadrant
const LINE_ANGLE_DEG = -45
const LINE_ANGLE_RAD = (LINE_ANGLE_DEG * Math.PI) / 180

// Convert a track's SVG-space radius to a percentage of the section's width.
// The spinning SVG is inset-[5%] (90% of section), viewBox is 300 units wide.
// So: css% = (svgR / 300) * 90
function svgRToCssPct(svgR: number): number {
  return (svgR / 300) * 90
}

type RingGeometry = {
  track: Track
  innerR: number
  outerR: number
  midR: number
  strokeWidth: number
}

type VinylCanvasProps = {
  tracks: Track[]
  highlightedTrackNumber?: number | null
  onHighlightTrack?: (track: Track) => void
  onClearHighlight?: () => void
  mode?: VinylMode
  imageUrl?: string
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
    return tracks.map((track) => {
      const innerR = toRenderR(track.start_radius_mm)
      const outerR = toRenderR(track.end_radius_mm)
      const midR = (innerR + outerR) / 2
      const strokeWidth = Math.max(outerR - innerR, 2.5)
      return { track, innerR, outerR, midR, strokeWidth }
    })
  }, [tracks])

  const highlightedRing = rings.find((r) => r.track.track_number === highlightedTrackNumber) ?? null

  // Line length as % of section width, anchored at section center (= vinyl center).
  // Extends to the outer edge of the highlighted track band.
  const lineLengthPct = highlightedRing ? svgRToCssPct(highlightedRing.outerR) : 0

  // Chip position: section center (50%) ± the line's x/y projection.
  // This is derived purely from CSS geometry — no SVG coordinate conversion needed.
  const chipLeft = `${(50 + Math.cos(LINE_ANGLE_RAD) * lineLengthPct).toFixed(2)}%`
  const chipTop = `${(50 + Math.sin(LINE_ANGLE_RAD) * lineLengthPct).toFixed(2)}%`

  return (
    <section className="relative mx-auto aspect-square w-full max-w-[360px]" aria-label="Vinyl track map">
      {/* Ambient glow halo */}
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,var(--color-accent-soft),transparent_64%)] blur-2xl" />

      {/* Spinning vinyl disc */}
      <VinylAnimation className="absolute inset-[5%] rounded-full">
        <svg
          className="size-full overflow-visible rounded-full"
          viewBox="0 0 300 300"
          role="img"
          aria-label="Generated vinyl rings"
        >
          <defs>
            {/* Symmetric radial gradient — centered so the disc looks visually balanced */}
            <radialGradient id="vinylFace" cx="50%" cy="50%">
              <stop offset="0%" stopColor="var(--color-vinyl-center)" />
              <stop offset="34%" stopColor="var(--color-vinyl-mid)" />
              <stop offset="100%" stopColor="var(--color-vinyl-edge)" />
            </radialGradient>

            {/* Gloss sheen — wide soft highlight band, diagonal so rotation is perceptible */}
            <linearGradient id="glossSheen" x1="10%" y1="0%" x2="90%" y2="100%">
              <stop offset="0%" stopColor="white" stopOpacity="0" />
              <stop offset="32%" stopColor="white" stopOpacity="0" />
              <stop offset="52%" stopColor="white" stopOpacity="0.09" />
              <stop offset="68%" stopColor="white" stopOpacity="0.03" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>

            {/* Specular hotspot — concentrated highlight in upper portion */}
            <linearGradient id="glossSpecular" x1="20%" y1="0%" x2="55%" y2="48%">
              <stop offset="0%" stopColor="white" stopOpacity="0.07" />
              <stop offset="60%" stopColor="white" stopOpacity="0.02" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>

            {/* Clip path keeps gloss within disc boundary */}
            <clipPath id="discClip">
              <circle cx="150" cy="150" r="141" />
            </clipPath>

            {/* Band glow filter */}
            <filter id="band-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>

          {/* Disc base */}
          <circle cx="150" cy="150" r="142" fill="url(#vinylFace)" />

          {/* Image mode overlay */}
          {mode === 'image' && imageUrl ? (
            <image
              href={imageUrl}
              x="8"
              y="8"
              width="284"
              height="284"
              clipPath="circle(142px at 150px 150px)"
              opacity="0.72"
            />
          ) : null}

          {/* Groove sheen — physically proportional radii */}
          <circle cx="150" cy="150" r="136" fill="none" stroke="var(--color-vinyl-sheen)" strokeWidth="1" opacity="0.5" />
          <circle
            cx="150"
            cy="150"
            r={toRenderR(120)}
            fill="none"
            stroke="var(--color-vinyl-sheen)"
            strokeWidth="0.7"
            opacity="0.3"
          />
          <circle
            cx="150"
            cy="150"
            r={toRenderR(90)}
            fill="none"
            stroke="var(--color-vinyl-sheen)"
            strokeWidth="0.6"
            opacity="0.2"
          />

          {/* Separator lines at track inner edges */}
          {rings.map((ring) => (
            <circle
              key={`separator-${ring.track.track_number}`}
              cx="150"
              cy="150"
              r={ring.innerR}
              fill="none"
              stroke="var(--color-separator)"
              strokeWidth="0.8"
              opacity="0.5"
            />
          ))}

          {/* Track bands */}
          {rings.map((ring) => (
            <VinylTrackRing
              key={ring.track.track_number}
              track={ring.track}
              radius={ring.midR}
              strokeWidth={ring.strokeWidth}
              isHighlighted={highlightedTrackNumber === ring.track.track_number}
              onHighlight={onHighlightTrack}
              onClearHighlight={onClearHighlight}
            />
          ))}

          {/* Band glow — lives in spinning SVG so coordinates are identical to track rings.
              A circle is rotationally symmetric so rotation doesn't affect alignment. */}
          <motion.circle
            cx="150"
            cy="150"
            r={highlightedRing?.midR ?? 80}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={(highlightedRing?.strokeWidth ?? 0) + 10}
            filter="url(#band-glow)"
            animate={{ opacity: highlightedRing ? 0.3 : 0 }}
            transition={{ duration: 0.35 }}
            style={{ pointerEvents: 'none' }}
          />

          {/* Gloss overlay — asymmetric so rotation becomes visually perceptible.
              Two layers: a wide soft sheen + a concentrated specular hotspot. */}
          <rect x="8" y="8" width="284" height="284" fill="url(#glossSheen)" clipPath="url(#discClip)" style={{ pointerEvents: 'none' }} />
          <rect x="8" y="8" width="284" height="284" fill="url(#glossSpecular)" clipPath="url(#discClip)" style={{ pointerEvents: 'none' }} />

          {/* Center label — physically correct radius */}
          <motion.circle
            cx="150"
            cy="150"
            r={LABEL_R}
            fill="var(--color-label)"
            stroke="var(--color-border)"
            strokeWidth="1"
            animate={{ scale: highlightedTrackNumber ? [1, 1.018, 1] : 1 }}
            transition={{ duration: 1.8, repeat: highlightedTrackNumber ? Infinity : 0 }}
          />

          {/* Spindle hole */}
          <circle cx="150" cy="150" r="5" fill="var(--color-bg)" />
        </svg>
      </VinylAnimation>

      {/* Radial inspection line — CSS div anchored at section center = vinyl center.
          left/top: 50% places the origin exactly at the disc spindle.
          transformOrigin: '0 50%' pivots rotation/scale from the start of the line. */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute rounded-full bg-[var(--color-accent)]"
        style={{
          left: '50%',
          top: '50%',
          marginTop: '-0.5px',
          height: '1px',
          width: `${lineLengthPct.toFixed(2)}%`,
          transformOrigin: '0 50%',
        }}
        animate={
          highlightedRing
            ? { rotate: LINE_ANGLE_DEG, scaleX: 1, opacity: 0.5 }
            : { rotate: LINE_ANGLE_DEG, scaleX: 0, opacity: 0 }
        }
        transition={{ duration: 0.34, ease: 'easeOut' }}
      />

      {/* Floating info chip — anchored to the tip of the radial line */}
      <AnimatePresence>
        {highlightedRing && (
          <motion.div
            key={highlightedRing.track.track_number}
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="pointer-events-none absolute whitespace-nowrap rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)] px-3 py-1.5 text-xs font-medium backdrop-blur-md"
            style={{
              left: chipLeft,
              top: chipTop,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <span className="text-[var(--color-text)]">Track {highlightedRing.track.track_number}</span>
            <span className="mx-1.5 opacity-25">•</span>
            <span className="text-[var(--color-muted)]">{highlightedRing.track.start_radius_mm.toFixed(1)} mm</span>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
