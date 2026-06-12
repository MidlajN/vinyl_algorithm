import { ArrowLeft, RotateCcw, Sparkles } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { BottomActionBar } from '../components/layout/BottomActionBar'
import { ImagePreview } from '../components/upload/ImagePreview'
import { Button } from '../components/ui/Button'
import { IconButton } from '../components/ui/IconButton'
import { useVinyl } from '../hooks/useVinyl'

export function PreviewPage() {
  const navigate = useNavigate()
  const { analyze, capturedImage, clearCapturedImage } = useVinyl()

  if (!capturedImage) {
    return <Navigate to="/" replace />
  }

  function retake() {
    clearCapturedImage()
    navigate('/')
  }

  function startAnalysis() {
    void analyze().catch(() => undefined)
    navigate('/analyzing')
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="mb-6 flex items-center justify-between">
        <IconButton label="Back" onClick={() => navigate('/')}>
          <ArrowLeft size={18} />
        </IconButton>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">Preview</p>
          <h1 className="mt-1 text-xl font-semibold">Ready to analyse</h1>
        </div>
      </header>

      <section className="space-y-5">
        <ImagePreview imageUrl={capturedImage.url} />
        <p className="px-2 text-center text-sm text-[var(--color-muted)]">
          Keep the record centered and visible for the cleanest track map.
        </p>
      </section>

      <BottomActionBar>
        <Button className="flex-1" variant="secondary" icon={<RotateCcw size={17} />} onClick={retake}>
          Retake
        </Button>
        <Button className="flex-[1.4]" icon={<Sparkles size={17} />} onClick={startAnalysis}>
          Analyze Vinyl
        </Button>
      </BottomActionBar>
    </div>
  )
}
