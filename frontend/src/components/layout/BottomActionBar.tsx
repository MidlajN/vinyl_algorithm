import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

export function BottomActionBar({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      className="sticky bottom-0 -mx-5 mt-auto border-t border-[var(--color-border)] bg-[linear-gradient(180deg,transparent,var(--color-bg)_24%)] px-5 pb-[calc(0.25rem+env(safe-area-inset-bottom))] pt-7"
    >
      <div className="flex gap-3">{children}</div>
    </motion.div>
  )
}
