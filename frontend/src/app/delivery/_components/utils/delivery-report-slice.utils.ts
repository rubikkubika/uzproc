import type { ReportSliceFilter, ReportSliceKind } from '../types/delivery-query.types';
import { REPORT_SLICE_URL_PARAMS } from '../constants/delivery.constants';

const KINDS: ReportSliceKind[] = ['overdue', 'no-esf'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Срез недельного отчёта из адреса (ссылка «Открыть список» из письма):
 * `/?tab=delivery&reportSlice=overdue&reportFrom=2026-01-01&reportTo=2026-09-30`.
 */
export function readReportSliceFromUrl(): ReportSliceFilter | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const kind = params.get(REPORT_SLICE_URL_PARAMS.kind) as ReportSliceKind | null;
  const from = params.get(REPORT_SLICE_URL_PARAMS.from) ?? '';
  const to = params.get(REPORT_SLICE_URL_PARAMS.to) ?? '';
  if (!kind || !KINDS.includes(kind) || !ISO_DATE.test(from) || !ISO_DATE.test(to)) return null;
  return { kind, from, to };
}

/** Убирает параметры среза из адреса — дальше срез живёт в состоянии таблицы, как остальные фильтры. */
export function clearReportSliceUrl(): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  if (!params.has(REPORT_SLICE_URL_PARAMS.kind)) return;
  Object.values(REPORT_SLICE_URL_PARAMS).forEach(name => params.delete(name));
  const query = params.toString();
  window.history.replaceState(null, '', query ? `${window.location.pathname}?${query}` : window.location.pathname);
}
