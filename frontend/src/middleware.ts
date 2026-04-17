import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const authToken = request.cookies.get('auth-token');
  // JWT-токены начинаются с "eyJ" (base64 заголовка {"alg":...})
  // Статический токен "authenticated-v2025" больше не принимается (T4 fix)
  const isAuthenticated = authToken &&
    authToken.value.startsWith('eyJ') &&
    authToken.value.split('.').length === 3;
  const isLoginPage = request.nextUrl.pathname === '/login';
  const isChangePasswordPage = request.nextUrl.pathname === '/change-password';
  const isPublicPlanPage = request.nextUrl.pathname.startsWith('/public-plan');
  const isPublicTrainingPage = request.nextUrl.pathname.startsWith('/training-public');
  const isPortalPage = request.nextUrl.pathname.startsWith('/portal');
  const isCSIFeedbackPage = request.nextUrl.pathname.startsWith('/csi/feedback');

  // Разрешаем доступ к публичным страницам без аутентификации
  if (isPublicPlanPage || isPublicTrainingPage || isPortalPage || isCSIFeedbackPage || isChangePasswordPage) {
    return NextResponse.next();
  }

  // Если пользователь не авторизован и пытается зайти не на страницу логина
  if (!isAuthenticated && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Если пользователь авторизован и пытается зайти на страницу логина
  if (isAuthenticated && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

