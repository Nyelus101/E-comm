// frontend/lib/api.ts
import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' },
})

// ─── Request interceptor ─────────────────────────────────────────────────────
// Attaches the access token to every request automatically.
// Components never manually set Authorization headers.
api.interceptors.request.use((config) => {
  // Only runs in browser (not during SSR)
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// ─── Response interceptor ────────────────────────────────────────────────────
// When any request returns 401, attempt a token refresh once.
// If the refresh also fails, log the user out.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // _retry flag prevents infinite loops
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (!refreshToken) throw new Error('No refresh token')

        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
          { refresh_token: refreshToken }
        )

        // Store new tokens
        localStorage.setItem('access_token', data.access_token)
        localStorage.setItem('refresh_token', data.refresh_token)

        // Retry the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`
        return api(originalRequest)
      } catch {
        // Refresh failed — clear tokens and redirect to login
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export default api