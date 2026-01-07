// Utility to get backend API URL
// In production (server), use nginx proxy (relative paths without port)
// In development, use localhost
export function getBackendUrl(): string {
  // Server-side (Next.js API routes, SSR): use Docker service name or environment variable
  if (typeof window === 'undefined') {
    // В серверном коде (API routes) используем имя сервиса Docker или переменную окружения
    // В Docker контейнере фронтенд может обращаться к бэкенду по имени сервиса backend:8080
    // Или через nginx, если доступен (в зависимости от конфигурации)
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
    if (backendUrl) {
      return backendUrl;
    }
    // Если переменная окружения не задана, пытаемся использовать имя сервиса Docker
    // В Docker Compose сервисы доступны по имени, но это работает только внутри Docker сети
    // Для продакшена лучше использовать nginx proxy через относительный путь
    // Но для прямого обращения из API route используем имя сервиса
    return 'http://backend:8080';
  }
  
  // Client-side: check if we're on the server IP or domain
  const hostname = window.location.hostname;
  
  // Если используем домен uzproc.uzum.io или IP 10.123.48.62, бэкенд доступен через nginx
  // nginx проксирует /api на backend:8080/api, который имеет context-path: /api
  // Формируем URL без порта, чтобы запросы шли через порт 80 (nginx)
  if (hostname === 'uzproc.uzum.io' || hostname === '10.123.48.62') {
    // Используем протокол и hostname без порта для гарантии запросов через порт 80
    return `${window.location.protocol}//${hostname}`;
  }
  
  // Default to localhost for development
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
}

export const API_BASE_URL = getBackendUrl();










