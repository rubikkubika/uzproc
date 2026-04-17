import { NextResponse } from 'next/server';
import { getBackendUrl } from '@/utils/api';

export async function POST(request: Request) {
  try {
    const { email, newPassword } = await request.json();

    if (!email || !newPassword) {
      return NextResponse.json(
        { error: 'Email и новый пароль обязательны' },
        { status: 400 }
      );
    }

    const backendUrl = getBackendUrl();
    const response = await fetch(`${backendUrl}/api/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), newPassword: newPassword.trim() }),
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
