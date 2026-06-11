import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

type VinylAnimationProps = {
  children: ReactNode
  isSpinning?: boolean
  className?: string
}

export function VinylAnimation({ children, isSpinning = true, className = '' }: VinylAnimationProps) {
  return (
    <motion.div
      className={`relative ${className}`}
      animate={isSpinning ? { rotate: 360 } : { rotate: 0 }}
      transition={isSpinning ? { duration: 28, repeat: Infinity, ease: 'linear' } : { duration: 0.4 }}
      style={{ transformOrigin: '50% 50%' }}
    >
      {children}
    </motion.div>
  )
}
