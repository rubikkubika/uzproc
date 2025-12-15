// Utility to get backend API URL
// In production (server), use the server IP or domain
// In development, use localhost
export function getBackendUrl(): string {
  // Check if we're on the server (production)
  if (typeof window !== 'undefined') {
    // Client-side: check if we're on the server IP or domain
    const hostname = window.location.hostname;
    if (hostname === '10.123.48.62') {
      return 'http://10.123.48.62:8080';
    }
    // Если используем домен uzproc.uzum.io, бэкенд должен быть доступен через тот же домен
    if (hostname === 'uzproc.uzum.io') {
      // Используем относительный путь, так как nginx проксирует запросы к бэкенду
      return '/api';
    }
  }
  
  // Default to localhost for development
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
}

export const API_BASE_URL = getBackendUrl();










