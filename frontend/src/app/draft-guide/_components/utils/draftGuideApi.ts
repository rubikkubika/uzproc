import { getBackendUrl } from '@/utils/api';
import type { DraftSlaTable, PurchasePlanItem } from '@/app/purchase-plan/_components/types/purchase-plan-items.types';
import type { GuidePurchaserRow } from '../types/draft-guide.types';
import { GUIDE_ITEMS_SAMPLE_SIZE } from '../constants/draft-guide.constants';

/** Строка сводки по закупщикам, как её отдаёт бэкенд */
interface PurchaserSummaryResponse {
  purchaser: string | null;
  count: number | null;
}

/** Таблица SLA драфта на год: сроки процедуры по сложности 1–4 */
export async function fetchDraftSlaTable(year: number): Promise<DraftSlaTable | null> {
  const response = await fetch(`${getBackendUrl()}/api/purchase-plan-items/draft/sla?year=${year}`);
  return response.ok ? ((await response.json()) as DraftSlaTable) : null;
}

/** Сводка по закупщикам драфта за год: сколько у кого позиций */
export async function fetchDraftPurchasers(year: number): Promise<GuidePurchaserRow[]> {
  const response = await fetch(
    `${getBackendUrl()}/api/purchase-plan-items/purchaser-summary?draft=true&year=${year}`
  );
  if (!response.ok) return [];

  const list = (await response.json()) as PurchaserSummaryResponse[];
  return list.map(row => ({
    purchaser: row.purchaser || 'Не назначен',
    count: row.count || 0,
  }));
}

/** Позиции драфта за год — источник примеров формулировок и отметок «Проверено закупщиком» */
export async function fetchDraftItems(year: number): Promise<PurchasePlanItem[]> {
  const response = await fetch(
    `${getBackendUrl()}/api/purchase-plan-items?draft=true&year=${year}&page=0&size=${GUIDE_ITEMS_SAMPLE_SIZE}`
  );
  if (!response.ok) return [];

  const page = await response.json();
  return Array.isArray(page?.content) ? (page.content as PurchasePlanItem[]) : [];
}
