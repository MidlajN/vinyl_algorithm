import { Camera } from 'lucide-react'
import type { ChangeEvent } from 'react'
import { Card } from '../ui/Card'

type CaptureCardProps = {
  onCapture: (file: File) => void
}

export function CaptureCard({ onCapture }: CaptureCardProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      onCapture(file)
    }
    event.target.value = ''
  }

  return (
    <label className="block cursor-pointer">
      <input
        className="sr-only"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
      />
      <Card className="group flex items-center gap-4 p-4 transition duration-300 hover:border-[var(--color-border-strong)]">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--color-accent-soft)] text-[var(--color-accent)] transition group-active:scale-95">
          <Camera size={22} strokeWidth={2.2} />
        </span>
        <span className="min-w-0">
          <span className="block text-base font-semibold">Capture Vinyl</span>
          <span className="mt-1 block text-sm text-[var(--color-muted)]">Use the rear camera</span>
        </span>
      </Card>
    </label>
  )
}
