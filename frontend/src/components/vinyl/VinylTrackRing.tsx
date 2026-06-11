import { motion } from 'framer-motion'
import type { Track } from '../../types/vinyl'

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
  return (
    <motion.circle
      cx="150"
      cy="150"
      r={radius}
      fill="none"
      stroke={isHighlighted ? 'var(--color-accent)' : 'var(--color-groove)'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      className="cursor-pointer outline-none"
      role="button"
      tabIndex={0}
      aria-label={`Inspect track ${track.track_number}`}
      initial={false}
      animate={{
        opacity: isHighlighted ? 0.96 : 0.42,
        filter: isHighlighted ? 'drop-shadow(0 0 13px var(--color-accent-glow))' : 'drop-shadow(0 0 0 transparent)',
      }}
      transition={{ duration: 0.28 }}
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
  )
}
