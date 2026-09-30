import type { ComplexityErrorSendResult, ComplexityErrorTestSendResult } from '@/utils/sending-center.api';
import { formatIsoDate } from './delivery-sending.utils';

/** ISO дата-время → dd.MM.yyyy. */
export function formatSentDate(value: string | null): string {
  if (!value) return '';
  return formatIsoDate(value.slice(0, 10));
}

/** Текст итога отправки для SendingStatusMessage. */
export function buildSendResultText(result: ComplexityErrorSendResult): string {
  const parts: string[] = [];
  parts.push(result.sentCount > 0
    ? `Отправлено писем: ${result.sentCount} (заявок: ${result.requestCount}).`
    : 'Письма не отправлены.');
  if (result.skippedWithoutEmail.length > 0) {
    parts.push(`Без адреса: ${result.skippedWithoutEmail.join(', ')}.`);
  }
  if (result.errors.length > 0) {
    parts.push(`Ошибки: ${result.errors.join('; ')}.`);
  }
  return parts.join(' ');
}

/** Текст итога тестовой отправки. */
export function buildTestSendResultText(result: ComplexityErrorTestSendResult): string {
  const purchaser = result.purchaserEmail ? `${result.purchaserName} <${result.purchaserEmail}>` : result.purchaserName;
  return `Тестовое письмо отправлено на ${result.recipient}. Список закупщика: ${purchaser} (заявок: ${result.requestCount}).`;
}
