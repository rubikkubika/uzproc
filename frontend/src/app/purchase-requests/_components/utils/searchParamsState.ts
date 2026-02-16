/**
 * Сериализация состояния списка заявок в URL query params.
 * Источник истины — URL; пустые значения не записываются.
 */
import type { SortField, SortDirection, TabType } from '../types/purchase-request.types';

const PREFIX = 'pr_';

export interface ListStateFromUrl {
  filters: Record<string, string>;
  sort: { field: SortField; direction: SortDirection };
  page: number;
  pageSize: number;
  prTab: TabType;
  year: number | null;
  month: number | null;
  cfo: string[];
  statusGroup: string[];
  purchaser: string[];
}

const VALID_TAB_TYPES: TabType[] = ['all', 'in-work', 'completed', 'project-rejected', 'hidden'];
function isValidTabType(value: string): value is TabType {
  return VALID_TAB_TYPES.includes(value as TabType);
}

const DEFAULT_FILTERS: Record<string, string> = {
  idPurchaseRequest: '',
  guid: '',
  purchaseRequestPlanYear: '',
  company: '',
  mcc: '',
  cfo: '',
  purchaseRequestInitiator: '',
  purchaser: '',
  name: '',
  purchaseRequestCreationDate: '',
  createdAt: '',
  updatedAt: '',
  budgetAmount: '',
  budgetAmountOperator: 'gte',
  currency: '',
  costType: '',
  contractType: '',
  contractDurationMonths: '',
  isPlanned: '',
  hasLinkedPlanItem: '',
  complexity: '',
  requiresPurchase: '',
  status: '',
};

const FILTER_KEYS = Object.keys(DEFAULT_FILTERS);

/** pr_purchaser в URL используется только для массива выбранных закупщиков (state.purchaser), не для текстового фильтра */
const FILTER_KEYS_SERIALIZED_TO_URL = FILTER_KEYS.filter((k) => k !== 'purchaser');

/**
 * Парсит searchParams в состояние списка. Используется при mount и при back/forward.
 */
export function parseSearchParamsToState(
  searchParams: Readonly<URLSearchParams>
): ListStateFromUrl {
  const filters: Record<string, string> = { ...DEFAULT_FILTERS };
  FILTER_KEYS_SERIALIZED_TO_URL.forEach((key) => {
    const v = searchParams.get(PREFIX + key);
    if (v !== null && v !== '') {
      filters[key] = v;
    }
  });

  const pageRaw = searchParams.get(PREFIX + 'page');
  const page = pageRaw !== null ? Math.max(0, parseInt(pageRaw, 10) || 0) : 0;

  const pageSizeRaw = searchParams.get(PREFIX + 'pageSize');
  const pageSize = pageSizeRaw !== null ? Math.max(1, parseInt(pageSizeRaw, 10) || 100) : 100;

  const sortBy = searchParams.get(PREFIX + 'sortBy');
  const sortDir = searchParams.get(PREFIX + 'sortDir');
  const field: SortField =
    sortBy && sortBy.trim() !== '' ? (sortBy as SortField) : 'idPurchaseRequest';
  const direction: SortDirection =
    sortDir === 'asc' || sortDir === 'desc' ? sortDir : 'desc';

  const prTabRaw = searchParams.get(PREFIX + 'tab');
  const prTab: TabType = prTabRaw && isValidTabType(prTabRaw) ? prTabRaw : 'in-work';

  const yearRaw = searchParams.get(PREFIX + 'year');
  const year =
    yearRaw !== null && yearRaw !== ''
      ? parseInt(yearRaw, 10) || null
      : null;
  const monthRaw = searchParams.get(PREFIX + 'month');
  const month =
    monthRaw !== null && monthRaw !== ''
      ? Math.min(12, Math.max(1, parseInt(monthRaw, 10) || 0)) || null
      : null;

  const cfo: string[] = searchParams.getAll(PREFIX + 'cfo').filter(Boolean);
  const statusGroup: string[] = searchParams.getAll(PREFIX + 'statusGroup').filter(Boolean);
  const purchaser: string[] = searchParams.getAll(PREFIX + 'purchaser').filter(Boolean);

  return {
    filters,
    sort: { field, direction },
    page,
    pageSize,
    prTab,
    year,
    month,
    cfo,
    statusGroup,
    purchaser,
  };
}

/**
 * Сериализует состояние в URLSearchParams. Пустые значения не записываются (replace: true для частых обновлений).
 */
export function serializeStateToSearchParams(state: ListStateFromUrl): URLSearchParams {
  const params = new URLSearchParams();

  // Текстовый фильтр purchaser не пишем в pr_purchaser — этот ключ только для массива выбранных закупщиков (state.purchaser)
  FILTER_KEYS_SERIALIZED_TO_URL.forEach((key) => {
    const v = state.filters[key];
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      params.set(PREFIX + key, String(v).trim());
    }
  });

  if (state.page > 0) {
    params.set(PREFIX + 'page', String(state.page));
  }
  if (state.pageSize !== 100) {
    params.set(PREFIX + 'pageSize', String(state.pageSize));
  }
  if (state.sort.field && state.sort.direction) {
    params.set(PREFIX + 'sortBy', state.sort.field);
    params.set(PREFIX + 'sortDir', state.sort.direction);
  }
  if (state.prTab && state.prTab !== 'in-work') {
    params.set(PREFIX + 'tab', state.prTab);
  }
  if (state.year !== null && state.year !== undefined) {
    params.set(PREFIX + 'year', String(state.year));
  }
  if (state.month !== null && state.month !== undefined && state.month >= 1 && state.month <= 12) {
    params.set(PREFIX + 'month', String(state.month));
  }
  state.cfo.forEach((v) => params.append(PREFIX + 'cfo', v));
  state.statusGroup.forEach((v) => params.append(PREFIX + 'statusGroup', v));
  state.purchaser.forEach((v) => params.append(PREFIX + 'purchaser', v));

  return params;
}

/**
 * Строит строку query для списка заявок (без ведущего ?).
 * @param explicitTab — если задан, всегда подставляется в URL (чтобы при синхронизации из таблицы заявок не перезаписать tab=contracts и т.п.)
 */
export function buildListQueryString(
  state: ListStateFromUrl,
  existingSearchParams: Readonly<URLSearchParams>,
  explicitTab?: string
): string {
  const tab = explicitTab ?? existingSearchParams.get('tab') ?? 'purchase-requests';
  const pr = serializeStateToSearchParams(state);
  pr.set('tab', tab);
  return pr.toString();
}
