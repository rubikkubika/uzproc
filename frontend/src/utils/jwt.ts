/**
 * Верификация JWT на BFF-слое (T2 fix, CWE-347/CWE-287).
 *
 * Раньше Next.js (middleware и /api/auth/check) только декодировал токен и проверял
 * его ФОРМАТ (начинается с "eyJ", три части). Это принимало любой структурно валидный
 * токен, включая alg:none и поддельную подпись. Здесь подпись HS256 проверяется
 * криптографически тем же секретом, что и на Spring-бэкенде, плюс проверяются
 * алгоритм (запрет none) и срок действия (exp).
 *
 * Реализация на Web Crypto (SubtleCrypto) — работает и в Edge (middleware),
 * и в Node (route handlers), без дополнительных зависимостей.
 */

export interface JwtPayload {
  sub?: string;
  role?: string;
  userId?: number;
  /** Флаг «закупщик» (может отсутствовать в старых токенах) */
  isPurchaser?: boolean;
  /** Флаг «договорник» (может отсутствовать в старых токенах) */
  isContractor?: boolean;
  /** Имя пользователя */
  name?: string;
  /** Фамилия пользователя */
  surname?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

/** Секрет должен совпадать с security.jwt.secret бэкенда (передаётся через env JWT_SECRET). */
function getSecret(): string {
  return (
    process.env.JWT_SECRET ||
    // Дефолт совпадает с application.yml — только для локальной разработки.
    'uzproc-jwt-secret-key-CHANGE-IN-PROD-min32ch'
  );
}

function base64UrlDecodeToBytes(input: string): Uint8Array {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64UrlDecodeToString(input: string): string {
  const bytes = base64UrlDecodeToBytes(input);
  return new TextDecoder().decode(bytes);
}

/**
 * Проверяет подпись, алгоритм и срок действия JWT.
 * Возвращает payload при успехе либо null при любой ошибке проверки.
 */
export async function verifyJwt(token: string | undefined | null): Promise<JwtPayload | null> {
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signatureB64] = parts;

  let header: { alg?: string; typ?: string };
  let payload: JwtPayload;
  try {
    header = JSON.parse(base64UrlDecodeToString(headerB64));
    payload = JSON.parse(base64UrlDecodeToString(payloadB64));
  } catch {
    return null;
  }

  // Разрешаем только семейство HMAC-SHA (HS256/HS384/HS512), запрещаем alg:none и
  // асимметричные алгоритмы. Бэкенд (jjwt) выбирает алгоритм по длине ключа:
  // 64-байтный секрет из JWT_SECRET даёт HS512, поэтому жёсткий HS256 отвергал валидные токены.
  const HMAC_HASH: Record<string, string> = {
    HS256: 'SHA-256',
    HS384: 'SHA-384',
    HS512: 'SHA-512',
  };
  const hashName = header.alg ? HMAC_HASH[header.alg] : undefined;
  if (!hashName) return null;

  // Проверка срока действия
  if (typeof payload.exp === 'number') {
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp <= nowSeconds) return null;
  }

  // Криптографическая проверка подписи HS256
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(getSecret()),
      { name: 'HMAC', hash: hashName },
      false,
      ['verify']
    );
    const signature = base64UrlDecodeToBytes(signatureB64);
    const data = enc.encode(`${headerB64}.${payloadB64}`);
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature as BufferSource,
      data as BufferSource
    );
    return valid ? payload : null;
  } catch {
    return null;
  }
}
