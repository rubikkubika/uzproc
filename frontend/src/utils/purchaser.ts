/**
 * Для отображения имени на фронте: только имя и фамилия (первые 2 слова).
 * Используется для закупщика, инициатора и т.п.
 */
export function purchaserDisplayName(name: string | null | undefined): string {
  if (!name || !name.trim()) return '—';
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).join(' ') || '—';
}

/**
 * Для отображения инициатора закупки: только имя и фамилия (первые 2 слова).
 */
export function initiatorDisplayName(name: string | null | undefined): string {
  return purchaserDisplayName(name);
}
