import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwt } from '@/utils/jwt';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token');

    // Криптографическая проверка подписи/алгоритма/срока JWT (T2 fix).
    // Роль и email берём из подписанного токена, а не из отдельных (подделываемых) cookie.
    const payload = await verifyJwt(authToken?.value);

    if (payload) {
      return NextResponse.json({
        authenticated: true,
        role: (payload.role as string) || null,
        email: (payload.sub as string) || null,
        userId: typeof payload.userId === 'number' ? payload.userId : null,
        isPurchaser: payload.isPurchaser === true,
        isContractor: payload.isContractor === true,
        name: (payload.name as string) || null,
        surname: (payload.surname as string) || null,
      });
    }

    return NextResponse.json({ authenticated: false, role: null, email: null });
  } catch (error) {
    return NextResponse.json({ authenticated: false, role: null, email: null });
  }
}
