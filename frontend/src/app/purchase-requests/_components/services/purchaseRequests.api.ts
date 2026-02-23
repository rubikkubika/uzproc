import { getBackendUrl, fetchDeduped } from '@/utils/api';
import type { PageResponse, PurchaseRequest } from '../types/purchase-request.types';

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
  const response = await (signal ? fetch(fetchUrl, { signal }) : fetchDeduped(fetchUrl));

  if (!response.ok) {
    throw new Error('Ошибка загрузки данных');
  }

  return await response.json();
}

/** Элемент сводки по закупщику (заявки «в работе») */
export interface PurchaserSummaryItemDto {
  purchaser: string;
  ordersCount: number;
  purchasesCount: number;
  ordersBudget: number;
  purchasesBudget: number;
}

/**
 * Загружает сводку по закупщикам для заявок «в работе» (без загрузки полных записей).
 */
export async function fetchInWorkPurchaserSummary(
  params: URLSearchParams
): Promise<PurchaserSummaryItemDto[]> {
  const url = `${getBackendUrl()}/api/purchase-requests/in-work-summary?${params.toString()}`;
  const response = await fetchDeduped(url);
  if (!response.ok) {
    throw new Error('Ошибка загрузки сводки по закупщикам');
  }
  return response.json();
}

/**
 * Уникальные группы статусов только для закупок (requiresPurchase=true) или только для заказов (requiresPurchase=false).
 * Используется фильтром «Группа статуса» при вкладке «Закупки»/«Заказы».
 */
export async function fetchStatusGroupsByRequiresPurchase(requiresPurchase: boolean): Promise<string[]> {
  const url = `${getBackendUrl()}/api/purchase-requests/status-groups?requiresPurchase=${requiresPurchase}`;
  const response = await fetchDeduped(url);
  if (!response.ok) {
    throw new Error('Ошибка загрузки групп статусов по типу заявки');
  }
  return response.json();
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
  const url = `${getBackendUrl()}/api/purchase-requests?page=0&size=1`;
  const response = await fetchDeduped(url);

  if (!response.ok) {
    throw new Error('Ошибка загрузки общего количества записей');
  }

  const result = await response.json();
  return result.totalElements || 0;
}

/**
 * Загружает список годов по дате создания заявки (только те, что есть в БД).
 * Используется для фильтра «Дата создания».
 */
export async function fetchCreationDateYears(): Promise<number[]> {
  const fetchUrl = `${getBackendUrl()}/api/purchase-requests/creation-date-years`;
  const response = await fetch(fetchUrl);

  if (!response.ok) {
    const text = await response.text();
    console.error('fetchCreationDateYears failed:', response.status, response.statusText, text);
    throw new Error(`Ошибка загрузки списка годов (${response.status})`);
  }

  return await response.json();
}

/**
 * Загружает список годов по дате назначения на утверждение (assignment_date в этапе «Утверждение заявки на ЗП»).
 * Используется для фильтра «Дата назначения на закупщика».
 */
export async function fetchApprovalAssignmentDateYears(): Promise<number[]> {
  const fetchUrl = `${getBackendUrl()}/api/purchase-requests/approval-assignment-date-years`;
  const response = await fetchDeduped(fetchUrl);

  if (!response.ok) {
    const text = await response.text();
    console.error('fetchApprovalAssignmentDateYears failed:', response.status, response.statusText, text);
    throw new Error(`Ошибка загрузки списка годов назначения (${response.status})`);
  }

  return await response.json();
}

/**
 * Уникальные значения полей заявок для фильтров (лёгкий эндпоинт без загрузки полных записей).
 * ЦФО загружаются отдельно из /api/cfos/names.
 */
export interface PurchaseRequestUniqueValuesDto {
  purchaseRequestInitiator: string[];
  purchaser: string[];
  status: string[];
  statusGroup: string[];
  costType: string[];
  contractType: string[];
}

export async function fetchUniqueFilterValues(): Promise<PurchaseRequestUniqueValuesDto> {
  const url = `${getBackendUrl()}/api/purchase-requests/unique-values`;
  const response = await fetchDeduped(url);

  if (!response.ok) {
    throw new Error('Ошибка загрузки уникальных значений для фильтров');
  }

  return response.json();
}

/**
 * Загружает заявки для метаданных (uniqueValues).
 * @deprecated Используйте fetchUniqueFilterValues() + /api/cfos/names для фильтров.
 */
export async function fetchMetadata(
  params: URLSearchParams
): Promise<PageResponse> {
  const fetchUrl = `${getBackendUrl()}/api/purchase-requests?${params.toString()}`;
  const response = await fetchDeduped(fetchUrl);

  if (!response.ok) {
    throw new Error('Ошибка загрузки метаданных');
  }

  return await response.json();
}

/** Комментарий заявки на закупку */
export interface PurchaseRequestCommentDto {
  id: number;
  purchaseRequestId: number;
  type: string;
  text: string;
  createdByUserName: string | null;
  createdAt: string;
}

/**
 * Загружает комментарии заявки (все типы). Без type — все комментарии.
 */
export async function fetchPurchaseRequestComments(
  purchaseRequestId: number,
  signal?: AbortSignal
): Promise<PurchaseRequestCommentDto[]> {
  const url = `${getBackendUrl()}/api/purchase-requests/${purchaseRequestId}/comments`;
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error('Ошибка загрузки комментариев');
  }
  return response.json();
}

/**
 * Создаёт комментарий к заявке. type: "MAIN" | "Комментарий SLA" и т.д.
 */
export async function createPurchaseRequestComment(
  purchaseRequestId: number,
  type: string,
  text: string,
  createdByUserId?: number | null
): Promise<PurchaseRequestCommentDto> {
  const url = `${getBackendUrl()}/api/purchase-requests/${purchaseRequestId}/comments`;
  const body: { type: string; text: string; createdByUserId?: number } = { type, text };
  if (createdByUserId != null) {
    body.createdByUserId = createdByUserId;
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error('Ошибка добавления комментария');
  }
  return response.json();
}

/**
 * Загружает количество комментариев по списку id заявок.
 * Возвращает объект: { [purchaseRequestId]: count }
 */
export async function fetchCommentCounts(
  purchaseRequestIds: number[],
  signal?: AbortSignal
): Promise<Record<number, number>> {
  if (purchaseRequestIds.length === 0) {
    return {};
  }
  const params = new URLSearchParams();
  purchaseRequestIds.forEach((id) => params.append('ids', String(id)));
  const url = `${getBackendUrl()}/api/purchase-requests/comment-counts?${params.toString()}`;
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error('Ошибка загрузки количества комментариев');
  }
  const raw = await response.json();
  const result: Record<number, number> = {};
  Object.keys(raw).forEach((key) => {
    const id = Number(key);
    if (!Number.isNaN(id)) {
      result[id] = Number(raw[key]) || 0;
    }
  });
  return result;
}

function getAuthEmailFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/user-email=([^;]*)/);
  return match ? decodeURIComponent(match[1].trim()) || null : null;
}

/**
 * Обновляет плановый СЛА для заявки (только для сложности 4).
 * @param idPurchaseRequest бизнес-ID заявки (idPurchaseRequest)
 * @param plannedSlaDays плановый СЛА в рабочих днях
 */
export async function updatePlannedSla(
  idPurchaseRequest: number,
  plannedSlaDays: number
): Promise<PurchaseRequest> {
  const url = `${getBackendUrl()}/api/purchase-requests/${idPurchaseRequest}/planned-sla`;
  const userName = getAuthEmailFromCookie();
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(userName ? { 'X-User-Name': userName } : {}),
    },
    body: JSON.stringify({ plannedSlaDays }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const msg = (data as { message?: string }).message ?? response.statusText;
    throw new Error(msg);
  }
  return response.json();
}
