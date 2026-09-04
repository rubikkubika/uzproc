import { getBackendUrl } from '@/utils/api';
import { fetchSpecificationFeedbackDashboard } from '@/utils/specification-feedback.api';
import { COMPANY_TITLE, CSI_FETCH_MAX_PAGES, CSI_FETCH_PAGE_SIZE } from '../constants/mr-presentation.constants';
import { dataPeriodLabel, slideFooterLabel } from './mrPresentationFormat';
import type { MrCsiFeedback, MrCsiStats, MrPresentationData, MrSlaInput } from '../types/mr-presentation.types';
import type { SavingsData } from '../../hooks/useOverviewSavingsData';
import type { ContractDocumentsByPersonMonthResponse } from '../../hooks/useContractDocumentsByPersonMonth';
import type { ContractApprovalDurationByMonthMarketResponse } from '../../hooks/useContractApprovalDurationByMonthMarket';

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T | null> {
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Экономия за год. */
export function fetchSavings(year: number, signal?: AbortSignal): Promise<SavingsData | null> {
  return getJson<SavingsData>(`${getBackendUrl()}/api/overview/savings?year=${year}`, signal);
}

/** Сводная статистика CSI за год. */
export async function fetchCsiStats(year: number, signal?: AbortSignal): Promise<MrCsiStats | null> {
  const json = await getJson<Record<string, unknown>>(`${getBackendUrl()}/api/csi-feedback/stats?year=${year}`, signal);
  if (!json) return null;
  return {
    year: (json.year as number) ?? year,
    count: (json.count as number) ?? 0,
    avgSpeed: (json.avgSpeed as number) ?? null,
    avgQuality: (json.avgQuality as number) ?? null,
    avgSatisfaction: (json.avgSatisfaction as number) ?? null,
    avgUzproc: (json.avgUzproc as number) ?? null,
    avgOverall: (json.avgOverall as number) ?? null,
  };
}

/** Все оценки инициаторов за год (свежие сверху). */
export async function fetchAllCsiFeedbacks(year: number, signal?: AbortSignal): Promise<MrCsiFeedback[]> {
  const pageUrl = (page: number) => {
    const params = new URLSearchParams({
      page: String(page),
      size: String(CSI_FETCH_PAGE_SIZE),
      sortBy: 'createdAt',
      sortDir: 'desc',
      year: String(year),
    });
    return `${getBackendUrl()}/api/csi-feedback?${params}`;
  };

  const first = await getJson<{ content?: MrCsiFeedback[]; totalPages?: number }>(pageUrl(0), signal);
  if (!first) return [];

  // Остальные страницы тянем параллельно: последовательная выгрузка заметно тормозит старт экспорта.
  const totalPages = Math.min(first.totalPages ?? 1, CSI_FETCH_MAX_PAGES);
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, totalPages - 1) }, (_, i) =>
      getJson<{ content?: MrCsiFeedback[] }>(pageUrl(i + 1), signal)
    )
  );

  return [...(first.content ?? []), ...rest.flatMap((page) => page?.content ?? [])];
}

/** Кол-во договорных документов по договорникам и месяцам. */
export function fetchContractDocuments(
  year: number,
  signal?: AbortSignal
): Promise<ContractDocumentsByPersonMonthResponse | null> {
  return getJson<ContractDocumentsByPersonMonthResponse>(
    `${getBackendUrl()}/api/overview/contract-documents-by-person-month?year=${year}`,
    signal
  );
}

/** Средний срок согласования по месяцам (сегмент Маркет). */
export function fetchContractDurations(
  year: number,
  signal?: AbortSignal
): Promise<ContractApprovalDurationByMonthMarketResponse | null> {
  return getJson<ContractApprovalDurationByMonthMarketResponse>(
    `${getBackendUrl()}/api/overview/contract-approvals-duration-by-month-market?year=${year}`,
    signal
  );
}

/** Оценки работы закупок по спецификациям. */
export async function fetchSpecificationFeedbackSafe(signal?: AbortSignal) {
  try {
    return await fetchSpecificationFeedbackDashboard(signal);
  } catch {
    return null;
  }
}

/** Первый и последний месяц с фактическими данными по SLA. */
function dataMonthRange(sla: MrSlaInput): { from: number | null; to: number | null } {
  const months = sla.completedByMonth
    .map((count, index) => (count > 0 ? index + 1 : null))
    .filter((m): m is number => m != null);
  if (months.length === 0) return { from: null, to: null };
  return { from: months[0], to: months[months.length - 1] };
}

/** Загрузка всех данных презентации за отчётный период. */
export async function loadMrPresentationData(
  params: { periodYear: number; periodMonth: number; dataYear: number; sla: MrSlaInput },
  signal?: AbortSignal
): Promise<MrPresentationData> {
  const { dataYear, periodYear, periodMonth, sla } = params;
  const [savings, csiStats, csiFeedbacks, contractDocuments, contractDurations, specificationFeedback] =
    await Promise.all([
      fetchSavings(dataYear, signal),
      fetchCsiStats(dataYear, signal),
      fetchAllCsiFeedbacks(dataYear, signal),
      fetchContractDocuments(dataYear, signal),
      fetchContractDurations(dataYear, signal),
      fetchSpecificationFeedbackSafe(signal),
    ]);

  const range = dataMonthRange(sla);

  return {
    periodYear,
    periodMonth,
    dataYear,
    periodLabel: dataPeriodLabel(dataYear, range.from, range.to),
    footerLabel: slideFooterLabel(COMPANY_TITLE, periodMonth, periodYear),
    savings,
    csiStats,
    csiFeedbacks,
    sla,
    contractDocuments,
    contractDurations: contractDurations?.months ?? [],
    specificationFeedback,
  };
}
