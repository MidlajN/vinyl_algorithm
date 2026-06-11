import { motion } from 'framer-motion'

export function AnalysisLoader() {
  return (
    <div className="relative mx-auto grid size-64 place-items-center">
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,var(--color-accent-soft),transparent_64%)] blur-2xl" />
      <motion.div
        className="relative size-52 rounded-full border border-[var(--color-border)] bg-[radial-gradient(circle_at_48%_42%,var(--color-vinyl-center),var(--color-vinyl-mid)_38%,var(--color-vinyl-edge)_100%)] shadow-[0_28px_70px_var(--color-soft-shadow)]"
        animate={{ rotate: 360 }}
        transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
      >
        <div className="absolute inset-6 rounded-full border border-[var(--color-vinyl-sheen)] opacity-50" />
        <div className="absolute inset-12 rounded-full border border-[var(--color-vinyl-sheen)] opacity-35" />
        <div className="absolute left-1/2 top-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-label)]" />
        <div className="absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-bg)]" />
      </motion.div>
    </div>
  )
}
