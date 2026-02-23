/**
 * Для отображения закупщика на фронте: только фамилия и имя (первые 2 слова).
 * Используется в таблицах, карточках и везде, где показывается закупщик.
 */
export function purchaserDisplayName(name: string | null | undefined): string {
  if (!name || !name.trim()) return '—';
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).join(' ') || '—';
}
