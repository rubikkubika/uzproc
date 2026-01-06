import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = '1988';
const USER_USERNAME = 'user';
const USER_PASSWORD = '2025';
// Версия пароля - при смене пароля нужно изменить это значение, чтобы все старые сессии стали недействительными
const PASSWORD_VERSION = 'v2025';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    // Нормализуем входные данные: убираем пробелы и приводим к строке
    const normalizedUsername = String(username || '').trim();
    const normalizedPassword = String(password || '').trim();

    let role: string | null = null;

    // Проверяем учетные данные admin
    if (normalizedUsername === ADMIN_USERNAME && normalizedPassword === ADMIN_PASSWORD) {
      role = 'admin';
    }
    // Проверяем учетные данные user
    else if (normalizedUsername === USER_USERNAME && normalizedPassword === USER_PASSWORD) {
      role = 'user';
    }

    if (role) {
      // Создаем сессию с версией пароля и ролью
      const cookieStore = await cookies();
      cookieStore.set('auth-token', `authenticated-${PASSWORD_VERSION}`, {
        httpOnly: true,
        secure: false, // Отключено для работы по HTTP
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 дней
        path: '/',
      });
      cookieStore.set('user-role', role, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 дней
        path: '/',
      });

      return NextResponse.json({ success: true, role });
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

