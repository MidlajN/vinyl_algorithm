import { VinylProvider } from '../context/VinylContext'
import { ThemeProvider } from '../context/ThemeContext'
import { AppRouter } from './router'

export function Providers() {
  return (
    <VinylProvider>
      <ThemeProvider>
        <AppRouter />
      </ThemeProvider>
    </VinylProvider>
  )
}
