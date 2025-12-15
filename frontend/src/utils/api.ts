// Utility to get backend API URL
// In production (server), use nginx proxy (relative paths)
// In development, use localhost
export function getBackendUrl(): string {
  // Check if we're on the server (production)
  if (typeof window !== 'undefined') {
    // Client-side: check if we're on the server IP or domain
    const hostname = window.location.hostname;
    
    // Если используем домен uzproc.uzum.io или IP 10.123.48.62, бэкенд доступен через nginx
    // nginx проксирует /api на backend:8080/api, который имеет context-path: /api
    // Поэтому возвращаем пустую строку - запросы будут идти на /api/... относительно текущего домена/IP
    if (hostname === 'uzproc.uzum.io' || hostname === '10.123.48.62') {
      return '';
    }
  }
  
  // Default to localhost for development
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
}

export const API_BASE_URL = getBackendUrl();










