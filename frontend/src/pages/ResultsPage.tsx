import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, CheckCircle2, Disc3, Send, WifiOff } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { IconButton } from '../components/ui/IconButton'
import { VinylCanvas } from '../components/vinyl/VinylCanvas'
import { TrackList } from '../components/tracks/TrackList'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { useVinyl } from '../hooks/useVinyl'
import { BottomActionBar } from '../components/layout/BottomActionBar'
import { Button } from '../components/ui/Button'
import { confirmAnalysisResult } from '../services/firebase.service'
import type { Track } from '../types/vinyl'

type ConfirmationState = 'idle' | 'confirming' | 'confirmed' | 'error'

export function ResultsPage() {
  const navigate = useNavigate()
  const { analysisResult } = useVinyl()
  const [highlightedTrackNumber, setHighlightedTrackNumber] = useState<number | null>(null)
  const [confirmationState, setConfirmationState] = useState<ConfirmationState>('idle')
  const highlightTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current)
      }
    }
  }, [])

  if (!analysisResult) {
    return <Navigate to="/" replace />
  }

  const tracks = analysisResult.tracks

  function clearHighlightTimeout() {
    if (highlightTimeoutRef.current) {
      window.clearTimeout(highlightTimeoutRef.current)
      highlightTimeoutRef.current = null
    }
  }

  function highlightTrack(track: Track) {
    clearHighlightTimeout()
    setHighlightedTrackNumber(track.track_number)
    highlightTimeoutRef.current = window.setTimeout(() => {
      setHighlightedTrackNumber(null)
    }, 1600)
  }

  function clearHighlight() {
    clearHighlightTimeout()
    setHighlightedTrackNumber(null)
  }

  async function confirmResult() {
    setConfirmationState('confirming')

    try {
      await confirmAnalysisResult(tracks)
      setConfirmationState('confirmed')
    } catch {
      setConfirmationState('error')
    }
  }

  const confirmButtonLabel =
    confirmationState === 'confirming'
      ? 'Updating Firmware State'
      : confirmationState === 'confirmed'
        ? 'Result Confirmed'
        : 'Confirm Result'

  return (
    <div className="flex flex-1 flex-col">
      <header className="mb-5 flex items-center justify-between">
        <IconButton label="Back to preview" onClick={() => navigate('/preview')}>
          <ArrowLeft size={18} />
        </IconButton>
        <div className="flex items-center gap-2 rounded-full bg-[var(--color-chip)] px-3 py-2 text-sm font-semibold">
          <Disc3 size={16} className="text-[var(--color-accent)]" />
          Detected Tracks: {analysisResult.tracks.length}
        </div>
        <ThemeToggle />
      </header>

      <section className="mb-5">
        <VinylCanvas
          tracks={tracks}
          highlightedTrackNumber={highlightedTrackNumber}
          onHighlightTrack={highlightTrack}
          onClearHighlight={clearHighlight}
          mode="generated"
        />
      </section>

      <div className="mt-auto space-y-3 pb-2">
        <TrackList
          tracks={tracks}
          highlightedTrackNumber={highlightedTrackNumber}
          onHighlightTrack={highlightTrack}
          onClearHighlight={clearHighlight}
        />
        {confirmationState === 'error' ? (
          <p className="flex items-center justify-center gap-2 px-4 text-center text-sm text-[var(--color-danger)]">
            <WifiOff size={16} />
            Firebase update failed. Check the RTDB URL and try again.
          </p>
        ) : null}
      </div>

      <BottomActionBar>
        <Button
          className="w-full"
          icon={confirmationState === 'confirmed' ? <CheckCircle2 size={18} /> : <Send size={18} />}
          disabled={confirmationState === 'confirming'}
          onClick={confirmResult}
        >
          {confirmButtonLabel}
        </Button>
      </BottomActionBar>
    </div>
  )
}
