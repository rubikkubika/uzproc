// Utility to get backend API URL
// In production (server), use the server IP or domain
// In development, use localhost
export function getBackendUrl(): string {
  // Check if we're on the server (production)
  if (typeof window !== 'undefined') {
    // Client-side: check if we're on the server IP or domain
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    if (hostname === '10.123.48.62') {
      return 'http://10.123.48.62:8080';
    }
    // Если используем домен uzproc.uzum.io, бэкенд доступен через nginx
    // nginx проксирует /api на backend:8080, который имеет context-path: /api
    // Поэтому возвращаем пустую строку - запросы будут идти на /api/... относительно текущего домена
    if (hostname === 'uzproc.uzum.io') {
      return '';
    }
  }
  
  // Default to localhost for development
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
}

export const API_BASE_URL = getBackendUrl();










