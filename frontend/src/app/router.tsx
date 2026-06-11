import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { HomePage } from '../pages/HomePage'
import { PreviewPage } from '../pages/PreviewPage'
import { AnalyzingPage } from '../pages/AnalyzingPage'
import { ResultsPage } from '../pages/ResultsPage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/preview" element={<PreviewPage />} />
          <Route path="/analyzing" element={<AnalyzingPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  )
}
