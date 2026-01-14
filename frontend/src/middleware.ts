import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PASSWORD_VERSION = 'v2025';

export function middleware(request: NextRequest) {
  const authToken = request.cookies.get('auth-token');
  // Проверяем, что cookie содержит актуальную версию пароля
  const isAuthenticated = authToken && authToken.value === `authenticated-${PASSWORD_VERSION}`;
  const isLoginPage = request.nextUrl.pathname === '/login';
  const isPublicPlanPage = request.nextUrl.pathname.startsWith('/public-plan');
  const isPortalPage = request.nextUrl.pathname.startsWith('/portal');

  // Разрешаем доступ к публичным страницам без аутентификации
  if (isPublicPlanPage || isPortalPage) {
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

