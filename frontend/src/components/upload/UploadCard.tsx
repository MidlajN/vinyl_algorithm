import { ImageUp } from 'lucide-react'
import type { ChangeEvent } from 'react'
import { Card } from '../ui/Card'

type UploadCardProps = {
  onUpload: (file: File) => void
}

export function UploadCard({ onUpload }: UploadCardProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      onUpload(file)
    }
    event.target.value = ''
  }

  return (
    <label className="block cursor-pointer">
      <input className="sr-only" type="file" accept="image/*" onChange={handleChange} />
      <Card className="group flex items-center gap-4 p-4 transition duration-300 hover:border-[var(--color-border-strong)]">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--color-surface-strong)] text-[var(--color-text)] transition group-active:scale-95">
          <ImageUp size={22} strokeWidth={2.2} />
        </span>
        <span className="min-w-0">
          <span className="block text-base font-semibold">Upload Image</span>
          <span className="mt-1 block text-sm text-[var(--color-muted)]">Choose from library</span>
        </span>
      </Card>
    </label>
  )
}
