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
