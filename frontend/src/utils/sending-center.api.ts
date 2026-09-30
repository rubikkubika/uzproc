import { getBackendUrl } from '@/utils/api';

/** Строка списка отправки спецификаций по ЦФО за месяц. */
export interface CfoSpecificationSending {
  cfoName: string;
  specificationCount: number;
  totalAmount: number | null;
  leaderUserId: number | null;
  leaderFullName: string | null;
  leaderEmail: string | null;
  sent: boolean;
  rated: boolean;
  token: string | null;
  sentTo: string | null;
  sentAt: string | null;
  // Эффективный получатель письма (по умолчанию руководитель ЦФО, либо переопределённый).
  recipientUserId: number | null;
  recipientFullName: string | null;
  recipientEmail: string | null;
  recipientOverridden: boolean;
}

/** Результат отправки. */
export interface SendSpecificationResult {
  sent: boolean;
  cfoName: string;
  recipient: string;
  leaderFullName: string | null;
  specificationCount: number;
  totalAmount: number | null;
  token: string | null;
  formUrl: string | null;
}

/**
 * Список ЦФО с подписанными спецификациями за месяц (по дате синхронизации).
 */
export async function fetchSpecificationSending(
  year: number,
  month: number,
  signal?: AbortSignal
): Promise<CfoSpecificationSending[]> {
  const url = `${getBackendUrl()}/api/sending-center/specifications?year=${year}&month=${month}`;
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error('Не удалось загрузить спецификации для отправки');
  }
  return response.json();
}

/** Назначить получателя письма для ЦФО (переопределить руководителя ЦФО). */
export async function setSendingRecipient(cfoName: string, userId: number): Promise<void> {
  const url = `${getBackendUrl()}/api/sending-center/specifications/recipient`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cfoName, userId }),
  });
  if (!response.ok) {
    throw new Error('Не удалось назначить получателя');
  }
}

/** Сбросить переопределение получателя (вернуть к руководителю ЦФО). */
export async function resetSendingRecipient(cfoName: string): Promise<void> {
  const url = `${getBackendUrl()}/api/sending-center/specifications/recipient?cfoName=${encodeURIComponent(cfoName)}`;
  const response = await fetch(url, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error('Не удалось сбросить получателя');
  }
}

/**
 * Отправить спецификации ЦФО на оценку руководителю за месяц.
 * recipientOverride опционален — если задан, письмо уходит на этот адрес.
 */
export async function sendSpecifications(
  year: number,
  month: number,
  cfoName: string,
  recipientOverride?: string
): Promise<SendSpecificationResult> {
  const url = `${getBackendUrl()}/api/sending-center/specifications/send`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ year, month, cfoName, recipientOverride }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || data.message || 'Не удалось отправить спецификации');
  }
  return response.json();
}

/** Сводка по предстоящим поставкам для раздела «Поставки» центра отправки. */
export interface UpcomingDeliveriesSummary {
  days: number;
  count: number;
  defaultRecipient: string;
}

/** Результат отправки письма о предстоящих поставках. */
export interface UpcomingDeliveriesSendResult {
  sent: boolean;
  recipient: string;
  deliveryCount: number;
  periodFrom: string;
  periodTo: string;
  subject: string;
}

/** Сколько поставок попадёт в письмо и получатель по умолчанию. */
export async function fetchUpcomingDeliveries(
  days: number,
  signal?: AbortSignal
): Promise<UpcomingDeliveriesSummary> {
  const url = `${getBackendUrl()}/api/sending-center/deliveries/upcoming?days=${days}`;
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error('Не удалось загрузить предстоящие поставки');
  }
  return response.json();
}

/** Отправить тестовое письмо о предстоящих поставках. */
export async function sendUpcomingDeliveriesTest(
  recipient: string,
  days: number
): Promise<UpcomingDeliveriesSendResult> {
  const url = `${getBackendUrl()}/api/sending-center/deliveries/test-send`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient, days }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || data.message || 'Не удалось отправить письмо');
  }
  return response.json();
}

/** Сводка по одному периоду недельного отчёта по поставкам. */
export interface DeliveryWeeklyReportPeriod {
  from: string;
  to: string;
  deliveredCount: number;
  deliveredAmount: number | null;
  overdueCount: number;
  overdueAmount: number | null;
  missingEsfCount: number;
  missingEsfAmount: number | null;
}

/** Предпросмотр недельного отчёта по поставкам. */
export interface DeliveryWeeklyReportPreview {
  week: DeliveryWeeklyReportPeriod;
  month: DeliveryWeeklyReportPeriod;
  /** С начала года: в письме — сводка без таблиц, со ссылками на списки */
  year: DeliveryWeeklyReportPeriod;
  defaultRecipientFullName: string;
  defaultRecipientEmail: string;
  subject: string;
}

/** Результат отправки недельного отчёта по поставкам. */
export interface DeliveryWeeklyReportSendResult {
  sent: boolean;
  recipient: string;
  recipientFullName: string;
  subject: string;
  periodFrom: string;
  periodTo: string;
  deliveredCount: number;
  overdueCount: number;
  missingEsfCount: number;
}

/** Что попадёт в недельный отчёт и кому он уйдёт по умолчанию. */
export async function fetchDeliveryWeeklyReport(
  signal?: AbortSignal
): Promise<DeliveryWeeklyReportPreview> {
  const url = `${getBackendUrl()}/api/sending-center/deliveries/weekly-report`;
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error('Не удалось загрузить недельный отчёт по поставкам');
  }
  return response.json();
}

/** Отправить недельный отчёт по поставкам. */
export async function sendDeliveryWeeklyReport(
  recipient: string,
  recipientFullName: string
): Promise<DeliveryWeeklyReportSendResult> {
  const url = `${getBackendUrl()}/api/sending-center/deliveries/weekly-report/send`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient, recipientFullName }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || data.message || 'Не удалось отправить отчёт');
  }
  return response.json();
}

/** Закупка без сложности (Центр отправки → Закупки → «Ошибка сложности»). */
export interface ComplexityErrorPurchase {
  id: number;
  innerId: string | null;
  purchaseRequestInnerId: string | null;
  name: string | null;
  cfo: string | null;
  creationDate: string | null;
  status: string | null;
  link: string;
  /** Закупка уже была в отправленном письме за этот год */
  alreadySent: boolean;
}

/** Закупщик и его закупки без сложности. */
export interface ComplexityErrorPurchaser {
  /** Ключ для отправки; пустая строка — закупщик не указан */
  purchaserKey: string;
  purchaserName: string;
  email: string | null;
  purchaseCount: number;
  notSentCount: number;
  purchases: ComplexityErrorPurchase[];
  lastSentAt: string | null;
  lastSentTo: string | null;
  lastSentBy: string | null;
}

/** Предпросмотр «Ошибки сложности» за текущий год. */
export interface ComplexityErrorPreview {
  year: number;
  purchaseCount: number;
  purchaserCount: number;
  withoutEmailCount: number;
  cc: string[];
  supportRequestUrl: string;
  subject: string;
  purchasers: ComplexityErrorPurchaser[];
}

/** Итог отправки уведомлений «Ошибка сложности». */
export interface ComplexityErrorSendResult {
  sentCount: number;
  purchaseCount: number;
  sentTo: string[];
  skippedWithoutEmail: string[];
  errors: string[];
}

/** Закупки текущего года без сложности по закупщикам. */
export async function fetchComplexityErrors(signal?: AbortSignal): Promise<ComplexityErrorPreview> {
  const url = `${getBackendUrl()}/api/sending-center/purchases/complexity-errors`;
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error('Не удалось загрузить закупки без сложности');
  }
  return response.json();
}

/**
 * Отправить уведомления «Ошибка сложности».
 * purchaserKey — одному закупщику; без ключа — всем закупщикам с адресом.
 */
export async function sendComplexityErrors(purchaserKey?: string): Promise<ComplexityErrorSendResult> {
  const url = `${getBackendUrl()}/api/sending-center/purchases/complexity-errors/send`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(purchaserKey !== undefined ? { purchaserKey } : {}),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || data.message || 'Не удалось отправить уведомления');
  }
  return response.json();
}
