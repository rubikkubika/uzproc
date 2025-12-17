import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const PASSWORD_VERSION = 'v2025';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token');

    // Проверяем, что cookie содержит актуальную версию пароля
    if (authToken && authToken.value === `authenticated-${PASSWORD_VERSION}`) {
      return NextResponse.json({ authenticated: true });
    }

    return NextResponse.json({ authenticated: false });
  } catch (error) {
    return NextResponse.json({ authenticated: false });
  }
}

