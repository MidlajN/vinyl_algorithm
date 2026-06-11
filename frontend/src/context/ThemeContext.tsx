/* eslint-disable react-refresh/only-export-components */
import { createContext, type ReactNode } from 'react'
import { useTheme } from '../hooks/useTheme'
import type { Theme } from '../types/vinyl'

type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useTheme()

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
}
