import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJwt } from '@/utils/jwt';

export async function middleware(request: NextRequest) {
  const authToken = request.cookies.get('auth-token');
  // Криптографическая проверка подписи/алгоритма/срока JWT (T2 fix).
  // Раньше проверялся только формат токена — принимались поддельные (alg:none и т.п.).
  const payload = await verifyJwt(authToken?.value);
  const isAuthenticated = !!payload;

  const path = request.nextUrl.pathname;
  const isLoginPage = path === '/login';
  const isChangePasswordPage = path === '/change-password';
  const isPublicPlanPage = path.startsWith('/public-plan');
  const isPublicTrainingPage = path.startsWith('/training-public');
  const isPurchaseTrackerPage = path.startsWith('/purchase-tracker');
  const isPortalPage = path.startsWith('/portal');
  const isCSIFeedbackPage = path.startsWith('/csi/feedback');

  const isPublicPage =
    isPublicPlanPage || isPublicTrainingPage || isPurchaseTrackerPage || isPortalPage || isCSIFeedbackPage || isChangePasswordPage;

  // «Простой» пользователь — авторизован, но без роли admin и без флагов закупщик/договорник.
  // Ему доступны ТОЛЬКО трекер и публичный план. Флаги берём из подписанного JWT.
  // Старые токены без флагов (claimsPresent=false) не ограничиваем — чтобы не блокировать до перелогина.
  const claimsPresent = !!payload && ('isPurchaser' in payload || 'isContractor' in payload);
  const isPlainUser =
    isAuthenticated &&
    claimsPresent &&
    payload!.role !== 'admin' &&
    payload!.isPurchaser !== true &&
    payload!.isContractor !== true;

  // Разрешаем доступ к публичным страницам (в т.ч. простому пользователю) без ограничений
  if (isPublicPage) {
    return NextResponse.next();
  }

  // Если пользователь не авторизован и пытается зайти не на страницу логина
  if (!isAuthenticated && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Если пользователь авторизован и пытается зайти на страницу логина
  if (isAuthenticated && isLoginPage) {
    return NextResponse.redirect(new URL(isPlainUser ? '/purchase-tracker' : '/', request.url));
  }

  // «Простому» пользователю доступны: главная «/» (там показывается трекер в общем шелле),
  // трекер и публичный план (уже разрешены выше как public). Прочие внутренние маршруты
  // (отдельные страницы вроде /roadmap и т.п.) — недоступны, отправляем на трекер.
  if (isPlainUser && path !== '/') {
    return NextResponse.redirect(new URL('/purchase-tracker', request.url));
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
     * - images (публичные статические картинки: логотип и т.п.) — иначе без логина
     *   запрос /images/*.svg редиректится на /login и картинка не грузится
     */
    '/((?!api|_next/static|_next/image|favicon.ico|images).*)',
  ],
};

