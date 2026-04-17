import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token');
    const userRole = cookieStore.get('user-role');
    const userEmail = cookieStore.get('user-email');

    // Проверяем JWT-формат (три части, разделённые точкой, начинается с eyJ)
    const isJwt = authToken &&
      authToken.value.startsWith('eyJ') &&
      authToken.value.split('.').length === 3;

    if (isJwt) {
      return NextResponse.json({
        authenticated: true,
        role: userRole?.value || null,
        email: userEmail?.value || null,
      });
    }

    return NextResponse.json({ authenticated: false, role: null, email: null });
  } catch (error) {
    return NextResponse.json({ authenticated: false, role: null, email: null });
  }
}
