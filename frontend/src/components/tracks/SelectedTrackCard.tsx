import { useState } from 'react'
import { motion } from 'framer-motion'
import { Play } from 'lucide-react'
import type { Track } from '../../types/vinyl'
import { Button } from '../ui/Button'

type SelectedTrackCardProps = {
  track: Track | null
}

export function SelectedTrackCard({ track }: SelectedTrackCardProps) {
  const [isPrepared, setIsPrepared] = useState(false)

  if (!track) {
    return null
  }

  return (
    <motion.section
      key={track.track_number}
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 18 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-[30px] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 shadow-[0_18px_45px_var(--color-soft-shadow)]"
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">Selected</p>
          <h3 className="mt-1 text-xl font-semibold">Track {track.track_number}</h3>
        </div>
        <p className="rounded-full bg-[var(--color-chip)] px-3 py-1 text-sm font-semibold">
          {track.servo_angle_deg.toFixed(1)} deg
        </p>
      </div>
      <Button className="w-full" icon={<Play size={17} fill="currentColor" />} onClick={() => setIsPrepared(true)}>
        {isPrepared ? 'Track Ready' : 'Play This Track'}
      </Button>
    </motion.section>
  )
}
