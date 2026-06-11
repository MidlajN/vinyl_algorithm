import { motion } from 'framer-motion'
import type { HTMLMotionProps } from 'framer-motion'
import type { ReactNode } from 'react'

type IconButtonProps = Omit<HTMLMotionProps<'button'>, 'children'> & {
  label: string
  children: ReactNode
}

export function IconButton({ label, children, className = '', type = 'button', ...props }: IconButtonProps) {
  return (
    <motion.button
      aria-label={label}
      title={label}
      whileTap={{ scale: 0.94 }}
      className={`grid size-11 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-strong)] text-[var(--color-text)] shadow-[0_12px_32px_var(--color-soft-shadow)] transition hover:border-[var(--color-border-strong)] ${className}`}
      type={type}
      {...props}
    >
      {children}
    </motion.button>
  )
}
