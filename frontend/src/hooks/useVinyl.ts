import { useContext } from 'react'
import { VinylContext } from '../context/VinylContext'

export function useVinyl() {
  const context = useContext(VinylContext)

  if (!context) {
    throw new Error('useVinyl must be used inside VinylProvider')
  }

  return context
}
