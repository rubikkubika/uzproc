import type { Delivery } from '../types/delivery.types';
import type { RowSignal } from '../types/delivery-view.types';
import { daysBetween, parseIsoDate } from './date.utils';

const DELIVERED = 'Поставлено';
const PAID = 'Оплачено';

export const isDelivered = (d: Delivery) => d.shipmentStatus === DELIVERED;
export const isPaid = (d: Delivery) => d.status === PAID;
/** Закрыто по правилам системы: «Поставлено» + «Оплачено» */
export const isClosed = (d: Delivery) => isDelivered(d) && isPaid(d);

/**
 * Когда статус ручного отчёта противоречит системе. Правила совпадают с бэкендом
 * (DeliverySpecifications.reportDiscrepancy); прочие значения отчёта расхождением не считаются.
 */
const REPORT_DISCREPANCY_RULES: Record<string, (d: Delivery) => boolean> = {
  'закрыто': (d) => !isClosed(d),
  'ожидаем поставку': (d) => isDelivered(d),
  'полностью поставлено': (d) => !isDelivered(d),
  'ожидает доплату': (d) => !isDelivered(d) || isPaid(d),
  'частично поставлено': (d) => isDelivered(d),
};

export function hasReportDiscrepancy(d: Delivery): boolean {
  const key = d.reportStatus?.trim().toLowerCase();
  const rule = key ? REPORT_DISCREPANCY_RULES[key] : undefined;
  return rule ? rule(d) : false;
}

/** Сколько дней просрочена плановая дата непоставленной поставки; null — не просрочено. */
export function getOverdueDays(d: Delivery, today: Date): number | null {
  if (isDelivered(d)) return null;
  const planned = parseIsoDate(d.plannedDeliveryDate);
  if (!planned || planned >= today) return null;
  return daysBetween(today, planned);
}

/**
 * Один сигнал «что делать» со строкой. Приоритет сверху вниз:
 * просрочка → расхождение с отчётом → нераспределённые оплаты → нет ЭСФ → закрыто → без даты.
 */
export function getRowSignal(d: Delivery, today: Date): RowSignal | null {
  const overdueDays = getOverdueDays(d, today);
  if (overdueDays !== null) return { kind: 'overdue', label: `Просрочено ${overdueDays} дн.`, tone: 'red' };
  if (hasReportDiscrepancy(d)) return { kind: 'discrepancy', label: 'Расхождение с отчётом', tone: 'orange' };
  if (d.paymentsCount > 0 && !d.paymentsDistributed) {
    return { kind: 'undistributed', label: `Распределить оплаты (${d.paymentsCount})`, tone: 'orange' };
  }
  if (isDelivered(d) && !d.esfDate) return { kind: 'no-esf', label: 'Нет ЭСФ', tone: 'orange' };
  if (isClosed(d)) return { kind: 'closed', label: 'Закрыто', tone: 'green' };
  if (!isDelivered(d) && !d.plannedDeliveryDate) return { kind: 'no-date', label: 'Без даты', tone: 'slate' };
  return null;
}
