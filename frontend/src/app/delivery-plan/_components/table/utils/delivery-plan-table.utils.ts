import type { DeliveryPlanItem, DailyDistribution, DailyChartData } from '../types/delivery-plan-table.types';

/**
 * Форматирует дату в формат DD.MM.YYYY
 */
export function formatDate(dateString: string | null): string {
  if (!dateString) return '';

  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return '';
  }
}

/**
 * Группирует поставки по дням месяца
 */
export function groupByDay(
  items: DeliveryPlanItem[],
  selectedMonth: number,
  selectedYear: number
): DailyDistribution {
  const distribution: DailyDistribution = {};

  items.forEach(item => {
    if (!item.plannedDeliveryStartDate) return;

    const date = new Date(item.plannedDeliveryStartDate);
    const month = date.getMonth();
    const year = date.getFullYear();

    // Проверяем, что дата соответствует выбранному месяцу и году
    if (month === selectedMonth && year === selectedYear) {
      const day = date.getDate();

      if (!distribution[day]) {
        distribution[day] = [];
      }

      distribution[day].push(item);
    }
  });

  return distribution;
}

/**
 * Подсчитывает количество поставок для каждого дня месяца
 */
export function calculateDailyDistribution(
  items: DeliveryPlanItem[],
  selectedMonth: number,
  selectedYear: number
): DailyChartData[] {
  const distribution = groupByDay(items, selectedMonth, selectedYear);
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

  const result: DailyChartData[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    result.push({
      day,
      count: distribution[day]?.length || 0,
    });
  }

  return result;
}

/**
 * Получает текущий месяц и год
 */
export function getCurrentMonthAndYear(): { month: number; year: number } {
  const now = new Date();
  return {
    month: now.getMonth(),
    year: now.getFullYear(),
  };
}

/**
 * Форматирует сумму с разделителями тысяч
 */
export function formatAmount(amount: number | null): string {
  if (amount === null) return '';
  return amount.toLocaleString('ru-RU');
}

/**
 * Получает цвет статуса спецификации
 */
export function getStatusColor(status: string | null): string {
  switch (status) {
    case 'Подписан':
      return 'bg-green-100 text-green-800';
    case 'На согласовании':
      return 'bg-yellow-100 text-yellow-800';
    case 'Проект':
      return 'bg-blue-100 text-blue-800';
    case 'Не согласован':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Получает короткое обозначение статуса
 */
export function getStatusShort(status: string | null): string {
  switch (status) {
    case 'Подписан':
      return 'П';
    case 'На согласовании':
      return 'С';
    case 'Проект':
      return 'Пр';
    case 'Не согласован':
      return 'Н';
    default:
      return '?';
  }
}
