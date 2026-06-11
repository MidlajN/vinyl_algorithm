import { Card } from '../ui/Card'

type ImagePreviewProps = {
  imageUrl: string
  alt?: string
}

export function ImagePreview({ imageUrl, alt = 'Captured vinyl' }: ImagePreviewProps) {
  return (
    <Card className="overflow-hidden p-2">
      <div className="aspect-square overflow-hidden rounded-[26px] bg-[var(--color-surface-strong)]">
        <img className="size-full object-cover" src={imageUrl} alt={alt} />
      </div>
    </Card>
  )
}
