import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getBackendUrl } from '@/utils/api';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    const normalizedEmail = String(email || '').trim();
    const normalizedPassword = String(password || '').trim();

    if (!normalizedEmail || !normalizedPassword) {
      return NextResponse.json(
        { error: 'Email и пароль обязательны' },
        { status: 400 }
      );
    }

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

    if (response.ok && data.success && data.token) {
      const cookieStore = await cookies();

      // JWT-токен подписан бэкендом — сессия привязана к конкретному пользователю (T4 fix)
      cookieStore.set('auth-token', data.token, {
        httpOnly: true,
        secure: false, // Включить true при переходе на HTTPS
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24 часа (совпадает с expiration JWT на бэкенде)
        path: '/',
      });
      cookieStore.set('user-role', data.role || 'user', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24,
        path: '/',
      });
      // user-email используется только для отображения (не для аутентификации)
      cookieStore.set('user-email', normalizedEmail, {
        httpOnly: false,
        secure: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24,
        path: '/',
      });

      return NextResponse.json({
        success: true,
        role: data.role || 'user',
        email: data.email,
        username: data.username,
        passwordChangeRequired: data.passwordChangeRequired === true,
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

