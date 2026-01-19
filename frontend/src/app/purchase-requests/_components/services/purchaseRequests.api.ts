import { getBackendUrl } from '@/utils/api';
import type { PageResponse } from '../types/purchase-request.types';

/**
 * API сервис для работы с заявками на закупку
 */

/**
 * Загружает заявки на закупку с указанными параметрами
 */
export async function fetchPurchaseRequests(
  params: URLSearchParams,
  signal?: AbortSignal
): Promise<PageResponse> {
  const fetchUrl = `${getBackendUrl()}/api/purchase-requests?${params.toString()}`;
  const response = await fetch(fetchUrl, { signal });

  if (!response.ok) {
    throw new Error('Ошибка загрузки данных');
  }

  return await response.json();
}

/**
 * Загружает количество записей по вкладкам
 */
export async function fetchTabCounts(
  params: URLSearchParams
): Promise<Record<string, number>> {
  const fetchUrl = `${getBackendUrl()}/api/purchase-requests/tab-counts?${params.toString()}`;
  const response = await fetch(fetchUrl);

  if (!response.ok) {
    throw new Error('Ошибка загрузки количества по вкладкам');
  }

  return await response.json();
}

/**
 * Загружает количество скрытых заявок
 */
export async function fetchHiddenCount(
  params: URLSearchParams
): Promise<number> {
  const hiddenParams = new URLSearchParams(params);
  hiddenParams.append('excludeFromInWork', 'true');
  hiddenParams.append('size', '1');
  hiddenParams.append('page', '0');
  
  const fetchUrl = `${getBackendUrl()}/api/purchase-requests?${hiddenParams.toString()}`;
  const response = await fetch(fetchUrl);

  if (!response.ok) {
    return 0;
  }

  const result = await response.json();
  return result.totalElements || 0;
}

/**
 * Загружает общее количество записей
 */
export async function fetchTotalRecords(): Promise<number> {
  const response = await fetch(`${getBackendUrl()}/api/purchase-requests?page=0&size=1`);

  if (!response.ok) {
    throw new Error('Ошибка загрузки общего количества записей');
  }

  const result = await response.json();
  return result.totalElements || 0;
}

/**
 * Загружает заявки для метаданных (uniqueValues)
 * Используется для получения всех уникальных значений полей
 */
export async function fetchMetadata(
  params: URLSearchParams
): Promise<PageResponse> {
  const fetchUrl = `${getBackendUrl()}/api/purchase-requests?${params.toString()}`;
  const response = await fetch(fetchUrl);

  if (!response.ok) {
    throw new Error('Ошибка загрузки метаданных');
  }

  return await response.json();
}
