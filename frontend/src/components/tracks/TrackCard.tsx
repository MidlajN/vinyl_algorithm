import { motion } from 'framer-motion'
import type { Track } from '../../types/vinyl'

type TrackCardProps = {
  track: Track
  isHighlighted: boolean
  onHighlight: (track: Track) => void
  onClearHighlight: () => void
}

export function TrackCard({ track, isHighlighted, onHighlight, onClearHighlight }: TrackCardProps) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={() => onHighlight(track)}
      onMouseEnter={() => onHighlight(track)}
      onMouseLeave={onClearHighlight}
      onFocus={() => onHighlight(track)}
      onBlur={onClearHighlight}
      className={`flex w-full items-center justify-between rounded-[24px] border px-4 py-3 text-left transition ${
        isHighlighted
          ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface-strong)]'
      }`}
    >
      <span>
        <span className="block text-sm font-semibold">Track {track.track_number}</span>
        <span className="mt-1 block text-xs text-[var(--color-muted)]">
          {track.start_radius_mm.toFixed(1)} mm
        </span>
      </span>
      <span className="size-2 rounded-full bg-[var(--color-accent)] opacity-70" />
    </motion.button>
  )
}
