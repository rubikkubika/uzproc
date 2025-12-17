import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = '2025';
// Версия пароля - при смене пароля нужно изменить это значение, чтобы все старые сессии стали недействительными
const PASSWORD_VERSION = 'v2025';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      // Создаем сессию с версией пароля
      const cookieStore = await cookies();
      cookieStore.set('auth-token', `authenticated-${PASSWORD_VERSION}`, {
        httpOnly: true,
        secure: false, // Отключено для работы по HTTP
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 дней
        path: '/',
      });

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Неверный логин или пароль' },
        { status: 401 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}

