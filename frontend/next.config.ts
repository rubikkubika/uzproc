import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Локальная разработка (auth.enabled=true): проксируем /api/* на backend :8080,
  // чтобы браузерные запросы шли same-origin через :3000 и httpOnly-cookie `auth-token`
  // доезжал до backend (cross-origin fetch его не отправляет). Работает как afterFiles-rewrite:
  // существующие Next API-роуты (/api/auth/*, /api/upload-csv и т.п.) имеют приоритет и НЕ проксируются.
  // В production (Docker) rewrites не подключаются — там /api проксирует nginx.
  async rewrites() {
    if (process.env.NODE_ENV !== 'development') {
      return [];
    }
    const backend = process.env.BACKEND_URL || 'http://localhost:8080';
    return {
      afterFiles: [
        {
          source: '/api/:path*',
          destination: `${backend}/api/:path*`,
        },
      ],
      beforeFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
