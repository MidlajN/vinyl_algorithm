import type { HTMLAttributes } from 'react'

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-[32px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_22px_55px_var(--color-soft-shadow)] backdrop-blur-xl ${className}`}
      {...props}
    />
  )
}
