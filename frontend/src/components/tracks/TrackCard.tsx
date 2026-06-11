import { motion } from 'framer-motion'
import type { Track } from '../../types/vinyl'

type TrackCardProps = {
  track: Track
  isSelected: boolean
  onSelect: (track: Track) => void
}

export function TrackCard({ track, isSelected, onSelect }: TrackCardProps) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(track)}
      className={`flex w-full items-center justify-between rounded-[24px] border px-4 py-3 text-left transition ${
        isSelected
          ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface-strong)]'
      }`}
    >
      <span>
        <span className="block text-sm font-semibold">Track {track.track_number}</span>
        <span className="mt-1 block text-xs text-[var(--color-muted)]">
          {track.width_mm.toFixed(1)} mm groove band
        </span>
      </span>
      <span className="rounded-full bg-[var(--color-chip)] px-3 py-1 text-sm font-semibold text-[var(--color-text)]">
        {track.servo_angle_deg.toFixed(1)} deg
      </span>
    </motion.button>
  )
}
