import { motion } from 'framer-motion'
import type { Track } from '../../types/vinyl'

// Minimum hit area width in SVG units (~44px equivalent at 300-unit viewBox in a 360px element)
const MIN_HIT_WIDTH = 22

type VinylTrackRingProps = {
  track: Track
  radius: number
  strokeWidth: number
  isHighlighted: boolean
  onHighlight?: (track: Track) => void
  onClearHighlight?: () => void
}

export function VinylTrackRing({
  track,
  radius,
  strokeWidth,
  isHighlighted,
  onHighlight,
  onClearHighlight,
}: VinylTrackRingProps) {
  const hitWidth = Math.max(strokeWidth, MIN_HIT_WIDTH)

  return (
    <g>
      {/* Visual band — no pointer events, purely decorative */}
      <motion.circle
        cx="150"
        cy="150"
        r={radius}
        fill="none"
        stroke={isHighlighted ? 'var(--color-accent)' : 'var(--color-groove)'}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        initial={false}
        animate={{
          opacity: isHighlighted ? 1 : 0.38,
          filter: isHighlighted
            ? 'drop-shadow(0 0 8px var(--color-accent-glow))'
            : 'drop-shadow(0 0 0 transparent)',
        }}
        transition={{ duration: 0.25 }}
        style={{ pointerEvents: 'none' }}
      />

      {/* Invisible generous hit target — pointer-events: stroke means only the stroke
          ring area triggers events, preventing interference with adjacent tracks */}
      <circle
        cx="150"
        cy="150"
        r={radius}
        fill="none"
        stroke="rgba(0,0,0,0)"
        strokeWidth={hitWidth}
        className="cursor-pointer touch-manipulation outline-none"
        role="button"
        tabIndex={0}
        aria-label={`Inspect track ${track.track_number}`}
        style={{ pointerEvents: 'stroke' }}
        onClick={() => onHighlight?.(track)}
        onMouseEnter={() => onHighlight?.(track)}
        onMouseLeave={onClearHighlight}
        onFocus={() => onHighlight?.(track)}
        onBlur={onClearHighlight}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onHighlight?.(track)
          }
        }}
      />
    </g>
  )
}
