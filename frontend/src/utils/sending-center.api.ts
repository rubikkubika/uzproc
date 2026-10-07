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

/** Закупка, связанная с заявкой без сложности. */
export interface ComplexityErrorLinkedPurchase {
  id: number;
  innerId: string | null;
  link: string;
}

/** Заявка без сложности (Центр отправки → Закупки → «Ошибка сложности»). */
export interface ComplexityErrorRequest {
  /** ID заявки в системе — маршрут /purchase-request/{id} */
  id: number;
  innerId: string | null;
  /** Короткий номер заявки (id_purchase_request) */
  requestNumber: number | null;
  name: string | null;
  cfo: string | null;
  status: string | null;
  creationDate: string | null;
  link: string;
  /** Связанные закупки (может быть пусто) */
  purchases: ComplexityErrorLinkedPurchase[];
  /** Заявка уже была в отправленном письме за этот год */
  alreadySent: boolean;
}

/** Закупщик и его заявки без сложности. */
export interface ComplexityErrorPurchaser {
  /** Ключ для отправки; пустая строка — закупщик не указан */
  purchaserKey: string;
  purchaserName: string;
  email: string | null;
  requestCount: number;
  notSentCount: number;
  requests: ComplexityErrorRequest[];
  lastSentAt: string | null;
  lastSentTo: string | null;
  lastSentBy: string | null;
}

/** Предпросмотр «Ошибки сложности» за текущий год. */
export interface ComplexityErrorPreview {
  year: number;
  requestCount: number;
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
  requestCount: number;
  sentTo: string[];
  skippedWithoutEmail: string[];
  errors: string[];
}

/** Заявки текущего года без сложности по закупщикам. */
export async function fetchComplexityErrors(signal?: AbortSignal): Promise<ComplexityErrorPreview> {
  const url = `${getBackendUrl()}/api/sending-center/purchases/complexity-errors`;
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error('Не удалось загрузить заявки без сложности');
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

/** Итог тестовой отправки «Ошибки сложности»: чей список взят и куда ушло письмо. */
export interface ComplexityErrorTestSendResult {
  recipient: string;
  purchaserName: string;
  purchaserEmail: string | null;
  requestCount: number;
  subject: string;
}

/** Тестовое письмо: список случайного закупщика, отправка только на тестовый адрес (без копии и без отметки). */
export async function sendComplexityErrorsTest(): Promise<ComplexityErrorTestSendResult> {
  const url = `${getBackendUrl()}/api/sending-center/purchases/complexity-errors/send-test`;
  const response = await fetch(url, { method: 'POST' });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || data.message || 'Не удалось отправить тестовое письмо');
  }
  return response.json();
}

/** Сведения о рассылке презентации управленческой отчётности (Центр отправки → «Управленческая отчётность»). */
export interface ManagementReportSendingInfo {
  periodYear: number;
  periodMonth: number;
  /** Подпись периода: «сентябрь 2026» */
  periodLabel: string;
  subject: string;
  /** Адресат регулярной рассылки */
  recipient: string;
  recipientFullName: string;
  cc: string[];
  /** Адрес тестовой отправки */
  testRecipient: string;
  /** Включена ли рассылка по расписанию на этом окружении */
  scheduleEnabled: boolean;
  workingDayNumber: number;
  sendTime: string;
  zone: string;
  nextSendDate: string | null;
  /** Когда отчёт за период ушёл по расписанию; null — ещё не уходил */
  autoSentAt: string | null;
  autoSendSummary: string | null;
}

/** Результат отправки презентации управленческой отчётности. */
export interface ManagementReportSendResult {
  sent: boolean;
  recipient: string;
  cc: string[];
  subject: string;
  periodYear: number;
  periodMonth: number;
  fileName: string;
  slideCount: number;
  fileSizeBytes: number;
}

/** Период, получатели и расписание рассылки управленческой отчётности. */
export async function fetchManagementReportSending(signal?: AbortSignal): Promise<ManagementReportSendingInfo> {
  const url = `${getBackendUrl()}/api/sending-center/management-report`;
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error('Не удалось загрузить сведения о рассылке управленческой отчётности');
  }
  return response.json();
}

/** Тестовое письмо: презентация за прошлый месяц уходит только на тестовый адрес, без копии. */
export async function sendManagementReportTest(): Promise<ManagementReportSendResult> {
  const url = `${getBackendUrl()}/api/sending-center/management-report/send-test`;
  const response = await fetch(url, { method: 'POST' });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || data.message || 'Не удалось отправить тестовое письмо');
  }
  return response.json();
}

/** Предпросмотр письма «Оценка закупки» (Центр отправки → Закупки → «Оценка закупки»). */
export interface CsiInvitationPreview {
  /** Номер заявки, взятой для примера; null — подходящей заявки нет */
  sampleRequestNumber: number | null;
  subject: string | null;
  text: string | null;
  contractCount: number;
  /** Адреса, которые по умолчанию ставятся в копию (помимо закупщика) */
  defaultCc: string[];
  testRecipient: string;
}

/** Текст письма «Оценка закупки» по заявке. */
export interface CsiInvitationText {
  purchaseRequestId: number;
  subject: string;
  text: string;
  contractCount: number;
}

/** Итог тестовой отправки письма «Оценка закупки». */
export interface CsiInvitationTestSendResult {
  recipient: string;
  requestNumber: number;
  contractCount: number;
  subject: string;
}

/** Пример письма «Оценка закупки», копия по умолчанию и тестовый адрес. */
export async function fetchCsiInvitation(signal?: AbortSignal): Promise<CsiInvitationPreview> {
  const url = `${getBackendUrl()}/api/sending-center/purchases/csi-invitation`;
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error('Не удалось загрузить письмо «Оценка закупки»');
  }
  return response.json();
}

/** Текст письма «Оценка закупки» по заявке: со списком подписанных договоров и датами регистрации. */
export async function fetchCsiInvitationText(
  purchaseRequestId: number,
  signal?: AbortSignal
): Promise<CsiInvitationText> {
  const url = `${getBackendUrl()}/api/sending-center/purchases/csi-invitation/text?purchaseRequestId=${purchaseRequestId}`;
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error('Не удалось сформировать текст письма');
  }
  return response.json();
}

/** Тестовое письмо «Оценка закупки»: только на тестовый адрес, без копии и без создания приглашения. */
export async function sendCsiInvitationTest(): Promise<CsiInvitationTestSendResult> {
  const url = `${getBackendUrl()}/api/sending-center/purchases/csi-invitation/send-test`;
  const response = await fetch(url, { method: 'POST' });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || data.message || 'Не удалось отправить тестовое письмо');
  }
  return response.json();
}
