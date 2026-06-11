import axios from 'axios'

export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL,
  analyseEndpoint: import.meta.env.VITE_ANALYSE_ENDPOINT,
}

if (!API_CONFIG.baseURL) {
  throw new Error('Missing VITE_API_BASE_URL.')
}

if (!API_CONFIG.analyseEndpoint) {
  throw new Error('Missing VITE_ANALYSE_ENDPOINT.')
}

export const api = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: 20000,
})
