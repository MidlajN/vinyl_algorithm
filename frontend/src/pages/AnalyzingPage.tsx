import { useEffect, useRef, useState } from 'react'
import { AlertCircle, ArrowLeft, RotateCcw } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AnalysisLoader } from '../components/loading/AnalysisLoader'
import { LoaderStep } from '../components/loading/LoaderStep'
import { Button } from '../components/ui/Button'
import { analyseVinyl } from '../services/vinyl.service'
import { useVinyl } from '../hooks/useVinyl'
import type { AnalysisError } from '../types/vinyl'

const loaderSteps = [
  'Detecting grooves',
  'Finding track separators',
  'Mapping groove positions',
  'Preparing track layout',
]

export function AnalyzingPage() {
  const navigate = useNavigate()
  const { capturedImage, startAnalysis, setAnalysisResult, stopAnalysis } = useVinyl()
  const [stepIndex, setStepIndex] = useState(0)
  const [error, setError] = useState<AnalysisError | null>(null)
  const hasStarted = useRef(false)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setStepIndex((currentStep) => (currentStep + 1) % loaderSteps.length)
    }, 1200)

    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!capturedImage || hasStarted.current) {
      return
    }

    hasStarted.current = true
    startAnalysis()

    async function runAnalysis() {
      if (!capturedImage) {
        return
      }

      try {
        const startedAt = Date.now()
        const result = await analyseVinyl(capturedImage.file)
        const elapsed = Date.now() - startedAt
        const minimumDelay = Math.max(0, 2800 - elapsed)

        await new Promise((resolve) => window.setTimeout(resolve, minimumDelay))

        if (!result.success || result.tracks.length === 0) {
          throw new Error('The analysis did not return a usable track map.')
        }

        setAnalysisResult(result)
        navigate('/results', { replace: true })
      } catch {
        stopAnalysis()
        setError({
          title: 'Analysis needs another pass',
          message: 'The backend did not return a usable track map. Try the image again or capture a clearer record.',
        })
      }
    }

    void runAnalysis()
  }, [capturedImage, navigate, setAnalysisResult, startAnalysis, stopAnalysis])

  if (!capturedImage) {
    return <Navigate to="/" replace />
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col justify-center">
        <div className="rounded-[34px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center shadow-[0_22px_55px_var(--color-soft-shadow)]">
          <div className="mx-auto mb-5 grid size-14 place-items-center rounded-full bg-[var(--color-danger-soft)] text-[var(--color-danger)]">
            <AlertCircle size={24} />
          </div>
          <h1 className="text-2xl font-semibold">{error.title}</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">{error.message}</p>
          <div className="mt-7 flex gap-3">
            <Button className="flex-1" variant="secondary" icon={<ArrowLeft size={17} />} onClick={() => navigate('/preview')}>
              Back
            </Button>
            <Button className="flex-1" icon={<RotateCcw size={17} />} onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <AnalysisLoader />
      <div className="mt-10 space-y-3">
        <p className="text-center text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">Analyzing vinyl</p>
        <h1 className="text-center text-3xl font-semibold">Reading the record</h1>
        <LoaderStep message={loaderSteps[stepIndex]} />
      </div>
    </div>
  )
}
