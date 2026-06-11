import type { Track } from '../../types/vinyl'
import { TrackCard } from './TrackCard'

type TrackListProps = {
  tracks: Track[]
  selectedTrack: Track | null
  onSelectTrack: (track: Track) => void
}

export function TrackList({ tracks, selectedTrack, onSelectTrack }: TrackListProps) {
  return (
    <section className="rounded-t-[34px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[0_-18px_50px_var(--color-soft-shadow)]">
      <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-[var(--color-border-strong)]" />
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-semibold">Detected Tracks</h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">{tracks.length} playback positions</p>
        </div>
      </div>
      <div className="space-y-2">
        {tracks.map((track) => (
          <TrackCard
            key={track.track_number}
            track={track}
            isSelected={selectedTrack?.track_number === track.track_number}
            onSelect={onSelectTrack}
          />
        ))}
      </div>
    </section>
  )
}
