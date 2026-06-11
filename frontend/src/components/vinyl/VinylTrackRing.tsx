import { motion } from 'framer-motion'
import type { Track } from '../../types/vinyl'

type VinylTrackRingProps = {
  track: Track
  radius: number
  strokeWidth: number
  isSelected: boolean
  onSelect?: (track: Track) => void
}

export function VinylTrackRing({
  track,
  radius,
  strokeWidth,
  isSelected,
  onSelect,
}: VinylTrackRingProps) {
  return (
    <motion.circle
      cx="150"
      cy="150"
      r={radius}
      fill="none"
      stroke={isSelected ? 'var(--color-accent)' : 'var(--color-groove)'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      className="cursor-pointer outline-none"
      role="button"
      tabIndex={0}
      aria-label={`Select track ${track.track_number}`}
      initial={false}
      animate={{
        opacity: isSelected ? 0.96 : 0.42,
        filter: isSelected ? 'drop-shadow(0 0 13px var(--color-accent-glow))' : 'drop-shadow(0 0 0 transparent)',
      }}
      transition={{ duration: 0.28 }}
      onClick={() => onSelect?.(track)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect?.(track)
        }
      }}
    />
  )
}
