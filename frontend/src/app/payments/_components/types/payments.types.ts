export interface Payment {
  id: number;
  /** Основной номер оплаты (колонка "Номер" в Excel) */
  mainId: string | null;
  amount: number | null;
  cfo: string | null;
  cfoId: number | null;
  comment: string | null;
  purchaseRequestId: number | null;
  /** Номер заявки (id_purchase_request), не внутренний номер */
  purchaseRequestNumber: number | null;
  /** Статус оплаты: К оплате, Оплата возвращена, Оплачена */
  paymentStatus: string | null;
  /** Статус заявки: На согласовании, Отклонен, Утвержден, Черновик */
  requestStatus: string | null;
  /** Дата расхода (план) */
  plannedExpenseDate: string | null;
  /** Дата оплаты */
  paymentDate: string | null;
  executorId: number | null;
  executorDisplayName: string | null;
  responsibleId: number | null;
  responsibleDisplayName: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Значения для фильтра «Статус оплаты» */
export const PAYMENT_STATUS_OPTIONS = ['К оплате', 'Оплата возвращена', 'Оплачена'] as const;

/** Значения для фильтра «Статус заявки» */
export const REQUEST_STATUS_OPTIONS = ['На согласовании', 'Отклонен', 'Утвержден', 'Черновик'] as const;

export interface PageResponse {
  content: Payment[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export type SortField = keyof Payment | null;
export type SortDirection = 'asc' | 'desc' | null;
