import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getBackendUrl } from '@/utils/api';

// Версия пароля - при смене пароля нужно изменить это значение, чтобы все старые сессии стали недействительными
const PASSWORD_VERSION = 'v2025';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // Нормализуем входные данные: убираем пробелы и приводим к строке
    const normalizedEmail = String(email || '').trim();
    const normalizedPassword = String(password || '').trim();

    if (!normalizedEmail || !normalizedPassword) {
      return NextResponse.json(
        { error: 'Email и пароль обязательны' },
        { status: 400 }
      );
    }

    // Отправляем запрос на бэкенд для аутентификации
    const backendUrl = getBackendUrl();
    const response = await fetch(`${backendUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: normalizedEmail,
        password: normalizedPassword,
      }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      // Создаем сессию с версией пароля и ролью
      const cookieStore = await cookies();
      cookieStore.set('auth-token', `authenticated-${PASSWORD_VERSION}`, {
        httpOnly: true,
        secure: false, // Отключено для работы по HTTP
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 дней
        path: '/',
      });
      cookieStore.set('user-role', data.role || 'user', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 дней
        path: '/',
      });
      cookieStore.set('user-email', normalizedEmail, {
        httpOnly: false, // Доступен из JavaScript для отображения
        secure: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 дней
        path: '/',
      });

      return NextResponse.json({ 
        success: true, 
        role: data.role || 'user',
        email: data.email,
        username: data.username 
      });
    } else {
      return NextResponse.json(
        { error: data.error || 'Неверный email или пароль' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}

