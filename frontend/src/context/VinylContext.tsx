/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { DEFAULT_THEME, THEME_STORAGE_KEY, THEMES } from '../constants/theme'
import type { CapturedImage, Theme, VinylAnalysisResponse } from '../types/vinyl'

type VinylContextValue = {
  capturedImage: CapturedImage | null
  analysisResult: VinylAnalysisResponse | null
  isAnalyzing: boolean
  theme: Theme
  setCapturedImage: (file: File, source: CapturedImage['source']) => void
  clearCapturedImage: () => void
  startAnalysis: () => void
  setAnalysisResult: (result: VinylAnalysisResponse | null) => void
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  stopAnalysis: () => void
}

export const VinylContext = createContext<VinylContextValue | null>(null)

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
  return THEMES.includes(storedTheme as Theme) ? (storedTheme as Theme) : DEFAULT_THEME
}

export function VinylProvider({ children }: { children: ReactNode }) {
  const [capturedImage, setCapturedImageState] = useState<CapturedImage | null>(null)
  const [analysisResult, setAnalysisResultState] = useState<VinylAnalysisResponse | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    root.classList.toggle('dark', theme === 'dark')
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  useEffect(() => {
    return () => {
      if (capturedImage?.url) {
        URL.revokeObjectURL(capturedImage.url)
      }
    }
  }, [capturedImage?.url])

  const setCapturedImage = useCallback((file: File, source: CapturedImage['source']) => {
    setCapturedImageState((currentImage) => {
      if (currentImage?.url) {
        URL.revokeObjectURL(currentImage.url)
      }

      return {
        file,
        source,
        url: URL.createObjectURL(file),
      }
    })
    setAnalysisResultState(null)
  }, [])

  const clearCapturedImage = useCallback(() => {
    setCapturedImageState((currentImage) => {
      if (currentImage?.url) {
        URL.revokeObjectURL(currentImage.url)
      }
      return null
    })
    setAnalysisResultState(null)
    setIsAnalyzing(false)
  }, [])

  const startAnalysis = useCallback(() => {
    setIsAnalyzing(true)
    setAnalysisResultState(null)
  }, [])

  const stopAnalysis = useCallback(() => {
    setIsAnalyzing(false)
  }, [])

  const setAnalysisResult = useCallback((result: VinylAnalysisResponse | null) => {
    setAnalysisResultState(result)
    setIsAnalyzing(false)
  }, [])

  const setTheme = useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))
  }, [])

  const value = useMemo<VinylContextValue>(
    () => ({
      capturedImage,
      analysisResult,
      isAnalyzing,
      theme,
      setCapturedImage,
      clearCapturedImage,
      startAnalysis,
      setAnalysisResult,
      setTheme,
      toggleTheme,
      stopAnalysis,
    }),
    [
      capturedImage,
      analysisResult,
      isAnalyzing,
      theme,
      setCapturedImage,
      clearCapturedImage,
      startAnalysis,
      setAnalysisResult,
      setTheme,
      toggleTheme,
      stopAnalysis,
    ],
  )

  return <VinylContext.Provider value={value}>{children}</VinylContext.Provider>
}
