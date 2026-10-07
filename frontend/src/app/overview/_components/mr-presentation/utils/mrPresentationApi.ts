import { getBackendUrl } from '@/utils/api';

/**
 * Презентация управленческой отчётности за отчётный период (PDF 16:9).
 * Собирается на бэкенде — та же, что уходит письмом из центра отправки.
 */
export async function fetchPresentation(year: number, month: number, signal?: AbortSignal): Promise<Blob> {
  const url = `${getBackendUrl()}/api/overview/management-reporting/presentation?year=${year}&month=${month}`;
  const response = await fetch(url, { signal });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Не удалось сформировать презентацию');
  }
  return response.blob();
}
