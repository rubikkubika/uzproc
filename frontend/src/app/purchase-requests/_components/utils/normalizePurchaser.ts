/**
 * Нормализует имя закупщика:
 * - Убирает невидимые символы и нормализует пробелы
 * - Извлекает только имя (фамилию и имя) из строк вида "Isakova Anastasiia (Отдел закупок, Менеджер по закупкам)"
 * - Возвращает "Не назначен" если имя пустое или null
 */
export function normalizePurchaserName(name: string | null | undefined): string {
  if (!name) {
    return 'Не назначен';
  }
  
  // Сначала нормализуем пробелы и невидимые символы
  let normalized = name
    .replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ') // Заменяем все виды пробелов на обычные
    .replace(/[\u200C\u200D]/g, '') // Убираем невидимые символы
    .trim()
    .replace(/\s+/g, ' '); // Заменяем множественные пробелы на одинарные
  
  // Извлекаем только имя (фамилию и имя) из строк вида "Isakova Anastasiia (Отдел закупок, Менеджер по закупкам)"
  // Убираем часть в скобках, если она есть
  const match = normalized.match(/^([^(]+?)(?:\s*\([^)]*\))?\s*$/);
  if (match && match[1]) {
    normalized = match[1].trim();
  }
  
  // Финальная нормализация пробелов
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized || 'Не назначен';
}
