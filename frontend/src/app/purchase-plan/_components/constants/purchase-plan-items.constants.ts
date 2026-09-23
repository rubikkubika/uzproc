// Ключи для localStorage
export const FILTERS_STORAGE_KEY = 'purchasePlanItems_filters';
// Фильтры драфта плана закупок хранятся отдельно от фильтров действующего плана
export const DRAFT_FILTERS_STORAGE_KEY = 'purchasePlanItemsDraft_filters';
export const COLUMNS_VISIBILITY_STORAGE_KEY = 'purchasePlanItems_columnsVisibility';
export const COLUMN_ORDER_STORAGE_KEY = 'purchasePlanItemsTableColumnOrder';
export const COLUMN_WIDTHS_STORAGE_KEY = 'purchasePlanItemsTableColumnWidths';
// Настройки колонок драфта хранятся отдельно, чтобы не влиять на действующий план
export const DRAFT_COLUMNS_VISIBILITY_STORAGE_KEY = 'purchasePlanItemsDraft_columnsVisibility';
export const DRAFT_COLUMN_ORDER_STORAGE_KEY = 'purchasePlanItemsDraftTableColumnOrder';
export const DRAFT_COLUMN_WIDTHS_STORAGE_KEY = 'purchasePlanItemsDraftTableColumnWidths';

// Статусы плана закупок (без "Заявка" — у позиций с заявкой статус берётся из связанной заявки)
export const ALL_STATUSES = [
  'Проект',
  'В плане',
  'Исключена',
  'Заявка у закупщика',
  'Договор в работе',
  'Договор подписан',
  'Спецификация подписана',
  'Пусто', // null статусы
];
// Статус позиции, исключённой из планирования (в драфте — «глазиком»)
export const EXCLUDED_STATUS = 'Исключена';
// Статус позиции, включённой в план (быстрый фильтр «Только в Плане»)
export const IN_PLAN_STATUS = 'В плане';
// Дефолтные статусы (все кроме "Исключена")
export const DEFAULT_STATUSES = ALL_STATUSES.filter(s => s !== EXCLUDED_STATUS);

// Все колонки
export const ALL_COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'company', label: 'Заказчик' },
  { key: 'guid', label: 'GUID' },
  { key: 'year', label: 'Год' },
  { key: 'purchaserCompany', label: 'Исполнитель' },
  { key: 'cfo', label: 'ЦФО' },
  { key: 'purchaseSubject', label: 'Предмет закупки' },
  { key: 'currentContractName', label: 'Текущий договор' },
  { key: 'budgetAmount', label: 'Бюджет' },
  { key: 'contractEndDate', label: 'Дата окончания договора' },
  { key: 'requestDate', label: 'Дата заявки' },
  { key: 'ganttChart', label: 'Диаграмма Ганта' },
  { key: 'newContractDate', label: 'Дата завершения закупки' },
  { key: 'purchaser', label: 'Закупщик' },
  { key: 'product', label: 'Продукция' },
  { key: 'hasContract', label: 'Есть договор' },
  { key: 'currentKa', label: 'КА действующего' },
  { key: 'currentAmount', label: 'Сумма текущего' },
  { key: 'currentContractAmount', label: 'Сумма текущего договора' },
  { key: 'currentContractBalance', label: 'Остаток текущего договора' },
  { key: 'currentContractEndDate', label: 'Дата окончания действующего' },
  { key: 'autoRenewal', label: 'Автопролонгация' },
  { key: 'complexity', label: 'Сложность' },
  { key: 'holding', label: 'Холдинг' },
  { key: 'category', label: 'Категория' },
  { key: 'status', label: 'Статус' },
  { key: 'purchaseRequestId', label: 'Заявка на закупку' },
  { key: 'purchaseRequestStatus', label: 'Статус заявки' },
  { key: 'comment', label: 'Комментарий' },
  { key: 'details', label: 'Комментарии' },
  { key: 'suppliers', label: 'Контрагенты' },
  { key: 'createdAt', label: 'Дата создания' },
  { key: 'updatedAt', label: 'Дата обновления' },
] as const;

// Дефолтные видимые колонки
export const DEFAULT_VISIBLE_COLUMNS = [
  'id',
  'company',
  'purchaseRequestId',
  'cfo',
  'purchaseSubject',
  'purchaser',
  'budgetAmount',
  'requestDate',
  'newContractDate',
  'status',
  'details',
  'suppliers',
  'ganttChart',
];

// Колонки, скрытые в плане закупок: не показываются и отсутствуют в меню выбора колонок
// (в том числе у пользователей, у которых они были в сохранённых настройках)
export const PLAN_HIDDEN_COLUMNS: string[] = [
  'purchaserCompany', // «Исполнитель»
];

// Колонки, доступные в плане закупок
export const PLAN_ALL_COLUMNS = ALL_COLUMNS.filter(col => !PLAN_HIDDEN_COLUMNS.includes(col.key));

// Колонки, недоступные в драфте плана: скрытые в плане и заявка на закупку (заявок в драфте ещё нет) —
// эти колонки не показываются и отсутствуют в меню выбора колонок
export const DRAFT_HIDDEN_COLUMNS: string[] = [
  ...PLAN_HIDDEN_COLUMNS,
  'purchaseRequestId',
];

// Колонка только драфта: «глазик» исключения позиции (и её договора) из планирования, слева от ID
export const EXCLUDE_FROM_PLANNING_COLUMN = { key: 'excludeFromPlanning', label: 'Исключение из планирования' } as const;

// Колонка только драфта: галочка «Проверено закупщиком», справа от «глазика»
export const PURCHASER_CHECKED_COLUMN = { key: 'purchaserChecked', label: 'Проверено закупщиком' } as const;

// Фильтр колонки «Проверено закупщиком» переключается по кругу: все → проверенные → непроверенные → все.
// Значение уходит на бэкенд параметром purchaserChecked ('' — без фильтра)
export const PURCHASER_CHECKED_FILTER_CYCLE = ['', 'true', 'false'] as const;
export type PurchaserCheckedFilterValue = typeof PURCHASER_CHECKED_FILTER_CYCLE[number];

// Колонки, доступные в драфте плана закупок
export const DRAFT_ALL_COLUMNS = [
  EXCLUDE_FROM_PLANNING_COLUMN,
  PURCHASER_CHECKED_COLUMN,
  ...ALL_COLUMNS.filter(col => !DRAFT_HIDDEN_COLUMNS.includes(col.key)),
];

// Дефолтные видимые колонки драфта: первыми — «глазик» исключения из планирования и галочка «Проверено закупщиком»,
// после предмета закупки дополнительно показываем наименование действующего договора и сложность,
// колонки из DRAFT_HIDDEN_COLUMNS исключаются
export const DRAFT_DEFAULT_VISIBLE_COLUMNS = [
  EXCLUDE_FROM_PLANNING_COLUMN.key,
  PURCHASER_CHECKED_COLUMN.key,
  ...DEFAULT_VISIBLE_COLUMNS
    .flatMap(col => (col === 'purchaseSubject' ? [col, 'currentContractName', 'complexity'] : [col]))
    .filter(col => !DRAFT_HIDDEN_COLUMNS.includes(col)),
];

// Дефолтные ширины колонок
export const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  excludeFromPlanning: 28,
  purchaserChecked: 28,
  id: 80,
  company: 179,
  guid: 256,
  year: 64,
  cfo: 128,
  purchaseSubject: 38,
  currentContractName: 77,
  budgetAmount: 112,
  contractEndDate: 128,
  requestDate: 112,
  ganttChart: 350,
  newContractDate: 128,
  purchaser: 128,
  product: 192,
  hasContract: 112,
  currentKa: 128,
  currentAmount: 128,
  currentContractAmount: 160,
  currentContractBalance: 160,
  currentContractEndDate: 160,
  autoRenewal: 128,
  complexity: 112,
  holding: 128,
  category: 128,
  purchaserCompany: 179,
  status: 200,
  purchaseRequestId: 160,
  purchaseRequestStatus: 200,
  comment: 192,
  details: 56, // облачко с числом комментариев
  suppliers: 100,
  createdAt: 128,
  updatedAt: 128,
};

// Курс валюты
export const USD_TO_UZS_RATE = 12000;

// Размер страницы
export const PAGE_SIZE = 100;

// Дефолтный элемент
export const DEFAULT_NEW_ITEM = {
  status: 'Проект',
};

// Максимальная ширина любой колонки (в пикселях)
export const MAX_COLUMN_WIDTH = 100;

/**
 * Уровни сложности закупки и срок процедуры в рабочих днях — соответствуют
 * ProcurementLeadTimeService на бэкенде (от сложности зависит дата завершения закупки).
 */
export const COMPLEXITY_OPTIONS = [
  { value: '1', label: '1 — 7 р.д.' },
  { value: '2', label: '2 — 14 р.д.' },
  { value: '3', label: '3 — 22 р.д.' },
  { value: '4', label: '4 — 50 р.д.' },
];

/** Подсказка у недоступных действий драфта для пользователей без прав */
export const DRAFT_MANAGE_FORBIDDEN_TITLE = 'Доступно только закупщикам и администраторам';

/** Верхняя граница срока этапа в таблице SLA драфта, рабочих дней (как на бэкенде) */
export const DRAFT_SLA_MAX_DAYS = 365;
