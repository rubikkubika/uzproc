import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJwt } from '@/utils/jwt';

export async function middleware(request: NextRequest) {
  const authToken = request.cookies.get('auth-token');
  // Криптографическая проверка подписи/алгоритма/срока JWT (T2 fix).
  // Раньше проверялся только формат токена — принимались поддельные (alg:none и т.п.).
  const isAuthenticated = !!(await verifyJwt(authToken?.value));
  const isLoginPage = request.nextUrl.pathname === '/login';
  const isChangePasswordPage = request.nextUrl.pathname === '/change-password';
  const isPublicPlanPage = request.nextUrl.pathname.startsWith('/public-plan');
  const isPublicTrainingPage = request.nextUrl.pathname.startsWith('/training-public');
  const isPurchaseTrackerPage = request.nextUrl.pathname.startsWith('/purchase-tracker');
  const isPortalPage = request.nextUrl.pathname.startsWith('/portal');
  const isCSIFeedbackPage = request.nextUrl.pathname.startsWith('/csi/feedback');

  // Разрешаем доступ к публичным страницам без аутентификации
  if (isPublicPlanPage || isPublicTrainingPage || isPurchaseTrackerPage || isPortalPage || isCSIFeedbackPage || isChangePasswordPage) {
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

