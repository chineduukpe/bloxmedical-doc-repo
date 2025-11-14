import axios from 'axios';

const baseURL = process.env.NEXT_PUBLIC_AI_SERVICE_URL;

if (!baseURL) {
  console.warn('NEXT_PUBLIC_AI_SERVICE_URL is not set');
}

export const aiService = axios.create({
  baseURL: baseURL || '',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
aiService.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('AI Service Error:', error);
    return Promise.reject(error);
  }
);
