import axios from 'axios';

// ── Live production backend URL ─────────────────────────────────────────────
// IMPORTANT: EXPO_PUBLIC_API_URL must be set at EAS build time to the actual
// deployed Render backend URL, e.g.:
//   EXPO_PUBLIC_API_URL=https://your-sahay-api.onrender.com/api/v1 npx eas build ...
//
// The default below is a placeholder. If you see 404 errors, it means the
// backend is not deployed yet or the URL is wrong.
const DEFAULT_URL = 'https://sahay-api.onrender.com/api/v1';
const API_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_URL;

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30s timeout — Render free tier has cold starts
});

apiClient.interceptors.request.use(
  (config) => {
    if (authToken && config.headers) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: detect wrong-server responses (FastAPI format vs Express)
apiClient.interceptors.response.use(
  (response) => {
    // If backend responds with FastAPI format {"detail": ...} instead of {"success": ...}
    // this means we are hitting the wrong server.
    if (response.data && 'detail' in response.data && !('success' in response.data)) {
      console.warn('[Sahay API] Warning: Response looks like FastAPI, not the Sahay Express backend. Check EXPO_PUBLIC_API_URL.');
    }
    return response;
  },
  (error) => {
    if (!error.response) {
      // Network error / no connectivity / server down
      error.userMessage = 'Cannot reach the Sahay server. Please check your internet connection.';
    } else if (error.response.status === 404) {
      // Likely wrong URL or backend not deployed
      const isWrongServer = error.response.data && 'detail' in error.response.data;
      if (isWrongServer) {
        error.userMessage = 'Backend server not found. The API may not be deployed yet.';
      } else {
        error.userMessage = 'The requested resource was not found (404).';
      }
    } else if (error.response.status === 401) {
      error.userMessage = 'Session expired. Please log in again.';
    } else if (error.response.status >= 500) {
      error.userMessage = 'Server error. Please try again in a moment.';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
