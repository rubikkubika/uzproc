// Utility to get backend API URL
// In production (server), use nginx proxy (relative paths without port)
// In development, use localhost
export function getBackendUrl(): string {
  // Server-side (Next.js API routes, SSR): use Docker service name or environment variable
  if (typeof window === 'undefined') {
    // В серверном коде (API routes) используем переменную окружения или определяем автоматически
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
    if (backendUrl) {
      return backendUrl;
    }
    
    // Определяем, находимся ли мы в Docker контейнере
    // В Docker контейнере можно использовать имя сервиса backend:8080
    // Проверяем наличие переменной окружения или пытаемся определить по окружению
    // Если NODE_ENV === 'production' и нет LOCAL_DEV, вероятно мы в Docker
    // Также проверяем наличие переменной DOCKER_ENV
    const isDocker = process.env.DOCKER_ENV === 'true' || 
                     (process.env.NODE_ENV === 'production' && 
                      process.env.LOCAL_DEV !== 'true' &&
                      !process.env.BACKEND_URL && 
                      !process.env.NEXT_PUBLIC_BACKEND_URL);
    
    if (isDocker) {
      // В Docker контейнере используем имя сервиса backend:8080
      // Оба контейнера (frontend и backend) находятся в одной Docker сети
      return 'http://backend:8080';
    }
    
    // Для локальной разработки используем localhost
    return 'http://localhost:8080';
  }
  
  // Client-side: check if we're on the server IP or domain
  const hostname = window.location.hostname;
  const port = window.location.port;
  
  // Если используем домен uzproc.uzum.io или IP 10.123.48.62, бэкенд доступен через nginx
  // nginx проксирует /api на backend:8080/api, который имеет context-path: /api
  // Формируем URL без порта, чтобы запросы шли через порт 80 (nginx)
  if (hostname === 'uzproc.uzum.io' || hostname === '10.123.48.62') {
    // Используем протокол и hostname без порта для гарантии запросов через порт 80
    return `${window.location.protocol}//${hostname}`;
  }
  
  // Для локальной разработки (localhost:3000) используем прямой URL бэкенда
  if (hostname === 'localhost' && (port === '3000' || port === '')) {
    return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
  }
  
  // Если порт 80 или нет порта (стандартный HTTP), значит работаем через nginx в Docker
  // В этом случае используем относительные пути через nginx
  if (port === '80' || port === '') {
    // Используем относительный путь или текущий origin для работы через nginx
    return window.location.origin;
  }
  
  // Default to localhost:8080 for local development (not in Docker)
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
}

export const API_BASE_URL = getBackendUrl();

/** In-flight request map: same URL → same promise (clone for concurrent callers). Reduces duplicate calls from React Strict Mode. */
const inFlightMap = new Map<string, Promise<Response>>();

/**
 * GET-запрос с дедупликацией: повторный вызов с тем же URL пока первый в полёте вернёт клон ответа вместо нового запроса.
 * Все вызывающие получают клон ответа, чтобы body не потреблялся дважды (Response body only readable once).
 */
export function fetchDeduped(url: string, options?: RequestInit): Promise<Response> {
  const existing = inFlightMap.get(url);
  if (existing) {
    return existing.then((r) => r.clone());
  }
  const promise = fetch(url, options).then((r) => r);
  inFlightMap.set(url, promise);
  promise.finally(() => inFlightMap.delete(url));
  return promise.then((r) => r.clone());
}










