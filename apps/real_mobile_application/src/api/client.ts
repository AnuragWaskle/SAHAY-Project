import axios from 'axios';
import { Platform } from 'react-native';

const DEFAULT_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000/api/v1' : 'http://localhost:3000/api/v1';
const API_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_URL;

let authToken: string | null = 'demo_token_ngo';

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken || 'demo_token_ngo';
}

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const activeToken = authToken || 'demo_token_ngo';
    if (config.headers) {
      config.headers.Authorization = `Bearer ${activeToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default apiClient;
