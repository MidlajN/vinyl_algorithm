import { Disc3, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CaptureCard } from '../components/upload/CaptureCard'
import { UploadCard } from '../components/upload/UploadCard'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { useVinyl } from '../hooks/useVinyl'

export function HomePage() {
  const navigate = useNavigate()
  const { setCapturedImage } = useVinyl()

  function handleImage(file: File, source: 'camera' | 'upload') {
    setCapturedImage(file, source)
    navigate('/preview')
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Vinyl Algorithm</p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight">Select the groove.</h1>
        </div>
        <ThemeToggle />
      </header>

      <section className="flex flex-1 flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative mb-8 aspect-[0.86] overflow-hidden rounded-[38px] border border-[var(--color-border)] bg-[linear-gradient(145deg,var(--color-surface),var(--color-surface-strong))] p-6 shadow-[0_30px_80px_var(--color-soft-shadow)]"
        >
          <div className="absolute -right-14 -top-10 size-52 rounded-full bg-[var(--color-accent-soft)] blur-3xl" />
          <div className="absolute inset-x-8 top-10 aspect-square rounded-full bg-[radial-gradient(circle_at_45%_40%,var(--color-vinyl-center),var(--color-vinyl-mid)_38%,var(--color-vinyl-edge)_100%)] shadow-[0_25px_80px_var(--color-soft-shadow)]">
            <div className="absolute inset-8 rounded-full border border-[var(--color-vinyl-sheen)] opacity-60" />
            <div className="absolute inset-16 rounded-full border border-[var(--color-vinyl-sheen)] opacity-40" />
            <div className="absolute left-1/2 top-1/2 grid size-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[var(--color-label)]">
              <Disc3 className="text-[var(--color-accent)]" size={28} strokeWidth={1.8} />
            </div>
          </div>
          <div className="absolute bottom-6 left-6 right-6">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[var(--color-chip)] px-3 py-1 text-xs font-semibold text-[var(--color-muted)]">
              <Sparkles size={14} />
              Track detection ready
            </div>
            <p className="max-w-[15rem] text-2xl font-semibold leading-tight">
              Turn a record image into playable track positions.
            </p>
          </div>
        </motion.div>

        <div className="space-y-3">
          <CaptureCard onCapture={(file) => handleImage(file, 'camera')} />
          <UploadCard onUpload={(file) => handleImage(file, 'upload')} />
        </div>
      </section>
    </div>
  )
}
