import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const PASSWORD_VERSION = 'v2025';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token');
    const userRole = cookieStore.get('user-role');
    const userEmail = cookieStore.get('user-email');

    // Проверяем, что cookie содержит актуальную версию пароля
    if (authToken && authToken.value === `authenticated-${PASSWORD_VERSION}`) {
      return NextResponse.json({ 
        authenticated: true,
        role: userRole?.value || null,
        email: userEmail?.value || null
      });
    }

    return NextResponse.json({ authenticated: false, role: null, email: null });
  } catch (error) {
    return NextResponse.json({ authenticated: false, role: null, email: null });
  }
}

