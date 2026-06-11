import { API_CONFIG, api } from './api'
import type { VinylAnalysisResponse } from '../types/vinyl'

export async function analyseVinyl(image: File): Promise<VinylAnalysisResponse> {
  const formData = new FormData()
  formData.append('image', image)

  const response = await api.post<VinylAnalysisResponse>(API_CONFIG.analyseEndpoint, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.data
}
