import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

export function BottomActionBar({ children }: { children: ReactNode }) {
  // Rendered via portal at document.body so position:fixed is relative to the
  // true viewport — not to any ancestor with filter/transform (AppShell page
  // transitions apply filter:blur which would otherwise become the containing block).
  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      className="fixed bottom-0 left-1/2 w-full max-w-[480px] -translate-x-1/2 border-t border-[var(--color-border)] bg-[linear-gradient(to_bottom,transparent,var(--color-bg)_44%)] px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-6 shadow-[0_-8px_28px_var(--color-soft-shadow)] backdrop-blur-xl sm:px-6"
    >
      <div className="flex gap-3">{children}</div>
    </motion.div>,
    document.body,
  )
}
