import { motion } from 'framer-motion'
import type { HTMLMotionProps } from 'framer-motion'
import type { ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

type ButtonProps = Omit<HTMLMotionProps<'button'>, 'children'> & {
  variant?: ButtonVariant
  icon?: ReactNode
  children: ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--color-accent)] text-[var(--color-accent-contrast)] shadow-[0_18px_40px_var(--color-accent-shadow)]',
  secondary:
    'border border-[var(--color-border)] bg-[var(--color-surface-strong)] text-[var(--color-text)] shadow-[0_14px_32px_var(--color-soft-shadow)]',
  ghost: 'text-[var(--color-muted)] hover:text-[var(--color-text)]',
}

export function Button({
  children,
  className = '',
  variant = 'primary',
  icon,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${className}`}
      type={type}
      {...props}
    >
      {icon}
      {children}
    </motion.button>
  )
}
