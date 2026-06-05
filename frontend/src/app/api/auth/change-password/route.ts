import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getBackendUrl } from '@/utils/api';

export async function POST(request: Request) {
  try {
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Текущий и новый пароль обязательны' },
        { status: 400 }
      );
    }

    // Email не принимаем из тела — бэкенд определяет пользователя по подписанному JWT (T1 fix).
    // Пробрасываем auth-token cookie, чтобы бэкенд аутентифицировал смену пароля.
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token');
    if (!authToken) {
      return NextResponse.json(
        { error: 'Требуется аутентификация' },
        { status: 401 }
      );
    }

    const backendUrl = getBackendUrl();
    const response = await fetch(`${backendUrl}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `auth-token=${authToken.value}`,
      },
      body: JSON.stringify({
        currentPassword: String(currentPassword).trim(),
        newPassword: String(newPassword).trim(),
      }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: data.error || 'Ошибка смены пароля' },
        { status: response.status || 400 }
      );
    }
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
