import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor para adicionar token
api.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor para refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { refreshToken } = useAuthStore.getState();
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post('/api/auth/refresh', {
          refreshToken,
        });

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
          response.data;

        useAuthStore.getState().setTokens(newAccessToken, newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (err) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// API methods
export const authApi = {
  login: (apiKey: string) =>
    api.post('/auth/token', { grantType: 'api_key', apiKey }),
};

export const chatApi = {
  list: () => api.get('/chats'),
  create: (data: { title: string; systemPrompt?: string }) =>
    api.post('/chats', data),
  get: (chatId: string) => api.get(`/chats/${chatId}`),
  sendMessage: (
    chatId: string,
    data: {
      content: string;
      visibility?: 'public' | 'private';
      useRag?: boolean;
      model?: string;
    }
  ) => api.post(`/chats/${chatId}/messages`, data),
  addMember: (chatId: string, userId: string) =>
    api.post(`/chats/${chatId}/members`, { userId }),
};

export const ragApi = {
  search: (query: string, filters?: any) =>
    api.post('/rag/search', { query, filters }),
  uploadDocument: (data: {
    name: string;
    content: string;
    format: string;
    tags?: string[];
  }) => api.post('/rag/documents', data),
};
