import type { DeliveryPlanSpecification, SpecificationStatusStyle } from '../types/delivery-plan.types';

export function formatDateKey(date: Date): string {
  // Используем локальную дату, чтобы избежать проблем с часовыми поясами
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getStatusStyle(status: string | null): SpecificationStatusStyle {
  if (!status) return { bg: 'bg-gray-100', text: 'text-gray-600', short: '—' };
  switch (status) {
    case 'Подписан':
      return { bg: 'bg-green-100', text: 'text-green-800', short: 'Подп.' };
    case 'На согласовании':
      return { bg: 'bg-amber-100', text: 'text-amber-800', short: 'Согл.' };
    case 'Не согласован':
      return { bg: 'bg-red-100', text: 'text-red-800', short: 'Не согл.' };
    case 'Проект':
      return { bg: 'bg-slate-100', text: 'text-slate-700', short: 'Проект' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-600', short: status };
  }
}

export function isToday(date: Date): boolean {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

export function isCurrentMonth(date: Date, currentDate: Date): boolean {
  return date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear();
}

export function getSpecificationDisplayName(spec: DeliveryPlanSpecification): string {
  return spec.name || spec.title || spec.innerId || `ID: ${spec.id}`;
}

export function formatBudget(amount: number, currency: string | null): string {
  return `${new Intl.NumberFormat('ru-RU', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)} ${currency || 'UZS'}`;
}
