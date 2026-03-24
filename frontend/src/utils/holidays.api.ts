import { getBackendUrl, fetchDeduped } from '@/utils/api';

export interface HolidayDto {
  calendarDate: string;
  name: string | null;
}

export async function fetchHolidays(from: string, to: string, signal?: AbortSignal): Promise<HolidayDto[]> {
  const url = `${getBackendUrl()}/api/holidays?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const response = await (signal ? fetch(url, { signal }) : fetchDeduped(url));
  if (!response.ok) {
    throw new Error('Не удалось загрузить праздники');
  }
  return response.json();
}
