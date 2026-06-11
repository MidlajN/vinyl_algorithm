import { ArrowLeft, Disc3 } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { Navigate, useNavigate } from 'react-router-dom'
import { IconButton } from '../components/ui/IconButton'
import { VinylCanvas } from '../components/vinyl/VinylCanvas'
import { TrackList } from '../components/tracks/TrackList'
import { SelectedTrackCard } from '../components/tracks/SelectedTrackCard'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { useVinyl } from '../hooks/useVinyl'

export function ResultsPage() {
  const navigate = useNavigate()
  const { analysisResult, selectedTrack, setSelectedTrack } = useVinyl()

  if (!analysisResult) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="mb-5 flex items-center justify-between">
        <IconButton label="Back to preview" onClick={() => navigate('/preview')}>
          <ArrowLeft size={18} />
        </IconButton>
        <div className="flex items-center gap-2 rounded-full bg-[var(--color-chip)] px-3 py-2 text-sm font-semibold">
          <Disc3 size={16} className="text-[var(--color-accent)]" />
          {analysisResult.tracks.length} tracks
        </div>
        <ThemeToggle />
      </header>

      <section className="mb-5">
        <VinylCanvas
          tracks={analysisResult.tracks}
          selectedTrack={selectedTrack}
          onSelectTrack={setSelectedTrack}
          mode="generated"
        />
      </section>

      <div className="mt-auto space-y-3">
        <AnimatePresence mode="wait">
          <SelectedTrackCard track={selectedTrack} />
        </AnimatePresence>
        <TrackList tracks={analysisResult.tracks} selectedTrack={selectedTrack} onSelectTrack={setSelectedTrack} />
      </div>
    </div>
  )
}
