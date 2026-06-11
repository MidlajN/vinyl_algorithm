import { AnimatePresence, motion } from 'framer-motion'

type LoaderStepProps = {
  message: string
}

export function LoaderStep({ message }: LoaderStepProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={message}
        initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -8, filter: 'blur(6px)' }}
        transition={{ duration: 0.28 }}
        className="text-center text-sm font-medium text-[var(--color-muted)]"
      >
        {message}
      </motion.p>
    </AnimatePresence>
  )
}
