/** Путь публичного драфта плана закупок (только просмотр, доступен всем, как публичный план закупок) */
export const PUBLIC_PLAN_DRAFT_PATH = '/public-plan-draft';

/** Позиции без ЦФО: в сводной по ЦФО они называются «Не указан», в фильтре публичного плана — «Не выбрано» */
const SUMMARY_NO_CFO = 'Не указан';
const PUBLIC_PLAN_NO_CFO = 'Не выбрано';

/**
 * Абсолютная ссылка на публичный драфт плана закупок с фильтром по ЦФО и году:
 * /public-plan-draft?year=2027&cfo=<ЦФО>
 */
export function buildPublicPlanDraftCfoLink(cfo: string, year: number | null): string {
  const url = new URL(PUBLIC_PLAN_DRAFT_PATH, window.location.origin);
  if (year) url.searchParams.set('year', String(year));
  url.searchParams.append('cfo', cfo === SUMMARY_NO_CFO ? PUBLIC_PLAN_NO_CFO : cfo);
  return url.toString();
}

/** Начальные фильтры публичного плана из параметров ссылки (?year=&cfo=&cfo=) */
export function parsePublicPlanSearchParams(params: { year?: string | string[]; cfo?: string | string[] }): {
  year: number | null;
  cfos: string[];
} {
  const year = Number(Array.isArray(params.year) ? params.year[0] : params.year);
  const cfos = params.cfo === undefined ? [] : Array.isArray(params.cfo) ? params.cfo : [params.cfo];
  return {
    year: Number.isInteger(year) && year > 0 ? year : null,
    cfos: cfos.filter(cfo => cfo.trim() !== ''),
  };
}
