import { useVinyl } from './useVinyl'

export function useTheme() {
  const { theme, setTheme, toggleTheme } = useVinyl()

  return {
    theme,
    setTheme,
    toggleTheme,
  }
}
