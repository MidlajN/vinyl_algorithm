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
import { isVinylDebugEnabled, publishVinylDebugResult, type AnalysisConfig } from '../engine'
import { analyseVinyl } from '../services/vinyl.service'
import type { AnalysisProgress, CapturedImage, Theme, VinylResult } from '../types/vinyl'

type VinylContextValue = {
  capturedImage: CapturedImage | null
  image?: File
  previewUrl?: string
  analysisResult: VinylResult | null
  result?: VinylResult
  isAnalyzing: boolean
  analysisProgress?: AnalysisProgress
  error?: string
  theme: Theme
  setCapturedImage: (file: File, source: CapturedImage['source']) => void
  clearCapturedImage: () => void
  startAnalysis: () => void
  analyze: (config?: AnalysisConfig) => Promise<void>
  setAnalysisResult: (result: VinylResult | null) => void
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
  const [analysisResult, setAnalysisResultState] = useState<VinylResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | undefined>()
  const [error, setError] = useState<string | undefined>()
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
    if (isVinylDebugEnabled()) {
      console.groupCollapsed('[vinyl-debug] upload')
      console.table({
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        lastModified: file.lastModified,
        source,
      })
      console.groupEnd()
    }

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
    setAnalysisProgress(undefined)
    setError(undefined)
  }, [])

  const clearCapturedImage = useCallback(() => {
    setCapturedImageState((currentImage) => {
      if (currentImage?.url) {
        URL.revokeObjectURL(currentImage.url)
      }
      return null
    })
    setAnalysisResultState(null)
    setAnalysisProgress(undefined)
    setError(undefined)
    setIsAnalyzing(false)
  }, [])

  const startAnalysis = useCallback(() => {
    setIsAnalyzing(true)
    setAnalysisResultState(null)
    setAnalysisProgress(undefined)
    setError(undefined)
  }, [])

  const stopAnalysis = useCallback(() => {
    setIsAnalyzing(false)
  }, [])

  const setAnalysisResult = useCallback((result: VinylResult | null) => {
    setAnalysisResultState(result)
    setIsAnalyzing(false)
  }, [])

  const analyze = useCallback(async (config?: AnalysisConfig) => {
    if (!capturedImage) {
      throw new Error('No vinyl image selected')
    }

    setIsAnalyzing(true)
    setAnalysisResultState(null)
    setAnalysisProgress(undefined)
    setError(undefined)

    try {
      const nextResult = await analyseVinyl(
        capturedImage.file,
        (stage, stageIndex, totalStages) => {
          setAnalysisProgress({ stage, stageIndex, totalStages })
        },
        config,
      )

      setAnalysisResultState(nextResult)
      publishVinylDebugResult(nextResult)
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Vinyl analysis failed'
      setError(message)
      throw caughtError
    } finally {
      setIsAnalyzing(false)
    }
  }, [capturedImage])

  const setTheme = useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))
  }, [])

  const value = useMemo<VinylContextValue>(
    () => ({
      capturedImage,
      image: capturedImage?.file,
      previewUrl: capturedImage?.url,
      analysisResult,
      result: analysisResult ?? undefined,
      isAnalyzing,
      analysisProgress,
      error,
      theme,
      setCapturedImage,
      clearCapturedImage,
      startAnalysis,
      analyze,
      setAnalysisResult,
      setTheme,
      toggleTheme,
      stopAnalysis,
    }),
    [
      capturedImage,
      analysisResult,
      isAnalyzing,
      analysisProgress,
      error,
      theme,
      setCapturedImage,
      clearCapturedImage,
      startAnalysis,
      analyze,
      setAnalysisResult,
      setTheme,
      toggleTheme,
      stopAnalysis,
    ],
  )

  return <VinylContext.Provider value={value}>{children}</VinylContext.Provider>
}
