import { motion } from 'framer-motion'

type NeedleIndicatorProps = {
  angle?: number
}

export function NeedleIndicator({ angle = -34 }: NeedleIndicatorProps) {
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-3 h-[44%] w-1 origin-bottom rounded-full bg-[linear-gradient(180deg,var(--color-needle),transparent)]"
      animate={{ rotate: angle - 25 }}
      transition={{ type: 'spring', stiffness: 120, damping: 18 }}
    >
      <span className="absolute -top-2 left-1/2 size-3 -translate-x-1/2 rounded-full bg-[var(--color-needle)] shadow-[0_0_18px_var(--color-accent-glow)]" />
    </motion.div>
  )
}
