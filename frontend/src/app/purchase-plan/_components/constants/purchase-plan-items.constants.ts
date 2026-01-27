// Ключи для localStorage
export const FILTERS_STORAGE_KEY = 'purchasePlanItems_filters';
export const COLUMNS_VISIBILITY_STORAGE_KEY = 'purchasePlanItems_columnsVisibility';

// Статусы (все возможные статусы плана закупок)
export const ALL_STATUSES = [
  'Проект',
  'В плане',
  'Исключена',
  'Заявка',
  'Заявка у закупщика',
  'Договор в работе',
  'Договор подписан',
  'Спецификация подписана',
  'Пусто', // null статусы
];
// Дефолтные статусы (все кроме "Исключена")
export const DEFAULT_STATUSES = ALL_STATUSES.filter(s => s !== 'Исключена');

// Все колонки
export const ALL_COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'company', label: 'Заказчик' },
  { key: 'guid', label: 'GUID' },
  { key: 'year', label: 'Год' },
  { key: 'purchaserCompany', label: 'Исполнитель' },
  { key: 'cfo', label: 'ЦФО' },
  { key: 'purchaseSubject', label: 'Предмет закупки' },
  { key: 'budgetAmount', label: 'Бюджет (UZS)' },
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
  { key: 'details', label: 'Детали' },
  { key: 'createdAt', label: 'Дата создания' },
  { key: 'updatedAt', label: 'Дата обновления' },
] as const;

// Дефолтные видимые колонки
export const DEFAULT_VISIBLE_COLUMNS = [
  'id',
  'company',
  'purchaserCompany',
  'purchaseRequestId',
  'cfo',
  'purchaseSubject',
  'purchaser',
  'budgetAmount',
  'requestDate',
  'newContractDate',
  'status',
  'details',
  'ganttChart',
];

// Дефолтные ширины колонок
export const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  id: 80,
  company: 179,
  guid: 256,
  year: 64,
  cfo: 128,
  purchaseSubject: 38,
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
  details: 100,
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
