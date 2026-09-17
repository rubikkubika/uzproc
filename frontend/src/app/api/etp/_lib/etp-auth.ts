import { cookies } from 'next/headers';
import { verifyJwt, type JwtPayload } from '@/utils/jwt';

/** Пользователь из подписанного JWT (cookie auth-token) или null */
export async function getEtpUser(): Promise<JwtPayload | null> {
  const cookieStore = await cookies();
  return verifyJwt(cookieStore.get('auth-token')?.value);
}

/**
 * Просмотр ЭТП: авторизован и не «простой» пользователь (та же логика, что в middleware).
 * Старые токены без флагов не ограничиваем.
 */
export function canViewEtp(user: JwtPayload | null): boolean {
  if (!user) return false;
  const claimsPresent = 'isPurchaser' in user || 'isContractor' in user;
  const isPlainUser =
    claimsPresent && user.role !== 'admin' && user.isPurchaser !== true && user.isContractor !== true;
  return !isPlainUser;
}

/** Запуск обновления и просмотр его статуса — только администраторы */
export function canSyncEtp(user: JwtPayload | null): boolean {
  return user?.role === 'admin';
}
