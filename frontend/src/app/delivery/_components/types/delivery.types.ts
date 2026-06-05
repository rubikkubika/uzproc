export interface Delivery {
  id: number;
  innerId: string | null;
  date: string | null;
  /** Дедлайн поставки — вычисляется автоматически (read-only). */
  deliveryDeadline: string | null;
  /** Фактическая дата поставки (Факт). Задаётся при статусе «Поставлено». */
  actualDeliveryDate: string | null;
  /** Плановая дата начала поставки из договора (План). */
  contractPlannedDeliveryStartDate: string | null;
  /** Срок поставки в рабочих днях. */
  deliveryTermWorkingDays: number | null;
  contractId: number | null;
  contractInnerId: string | null;
  contractName: string | null;
  contractPaymentScheme: string | null;
  contractPaymentTerms: string | null;
  contractDeliveryTerm: string | null;
  /** Дата регистрации договора (дата выполнения согласования «Регистрация»). */
  contractRegistrationDate: string | null;
  /** Дата синхронизации договора (дата выполнения согласования «Синхронизация»). */
  contractSynchronizationDate: string | null;
  supplierId: number | null;
  supplierName: string | null;
  supplierInn: string | null;
  amount: number | null;
  currency: string | null;
  status: string | null;
  statusColor: 'gray' | 'blue' | 'green' | string | null;
  shipmentStatus: string | null;
  shipmentStatusColor: 'gray' | 'blue' | 'green' | 'red' | string | null;
  paymentScheme: 'POSTPAYMENT' | 'PREPAYMENT' | null;
  paymentsCount: number;
  paymentsDistributed: boolean;
  comment: string | null;
  responsibleId: number | null;
  responsibleDisplayName: string | null;
  createdAt: string;
  updatedAt: string;
}

export const PAYMENT_SCHEME_LABELS: Record<'POSTPAYMENT' | 'PREPAYMENT', string> = {
  POSTPAYMENT: 'По факту',
  PREPAYMENT: 'Аванс',
};

/** Текст для колонки «Схема оплаты»: если схема не выбрана — «Схема оплаты не выбрана». */
export function getPaymentSchemeLabel(scheme: Delivery['paymentScheme']): string {
  return scheme ? PAYMENT_SCHEME_LABELS[scheme] : 'Схема оплаты не выбрана';
}

/** Извлекает первое целое число из текста (срок поставки из договора — свободный текст). */
export function parseFirstNumber(text: string | null | undefined): number | null {
  if (!text) return null;
  const m = text.match(/\d+/);
  return m ? Number(m[0]) : null;
}

export interface PaymentsStatus {
  /** 'none' — оплат нет, 'undistributed' — есть, но не у всех указан тип, 'distributed' — все имеют тип. */
  kind: 'none' | 'undistributed' | 'distributed';
  label: string;
  badgeClass: string;
}

/** Статус колонки «Оплаты» по количеству оплат и признаку распределения. */
export function getPaymentsStatus(count: number, distributed: boolean): PaymentsStatus {
  if (!count || count <= 0) {
    return { kind: 'none', label: 'Оплат нет', badgeClass: 'bg-gray-100 text-gray-600' };
  }
  if (distributed) {
    return { kind: 'distributed', label: 'Оплаты распределены', badgeClass: 'bg-green-100 text-green-800' };
  }
  return { kind: 'undistributed', label: `Не распределены (${count})`, badgeClass: 'bg-orange-100 text-orange-800' };
}

export const STATUS_BADGE_CLASSES: Record<string, string> = {
  gray: 'bg-gray-100 text-gray-700',
  blue: 'bg-blue-100 text-blue-800',
  green: 'bg-green-100 text-green-800',
  red: 'bg-red-100 text-red-800',
  yellow: 'bg-yellow-100 text-yellow-800',
};

/** Статус поставки (фактическая отгрузка), задаётся вручную. value — name() enum на бэкенде. */
export const SHIPMENT_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'EXPECTED', label: 'Ожидает поставку' },
  { value: 'AWAITING_ADVANCE_PAYMENT', label: 'Ожидает оплаты аванса' },
  { value: 'DELIVERED', label: 'Поставлено' },
  { value: 'OVERDUE', label: 'Просрочено' },
];

export interface PageResponse {
  content: Delivery[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export type SortField = keyof Delivery | null;
export type SortDirection = 'asc' | 'desc' | null;
