// Ключ для сохранения фильтров в localStorage
export const FILTERS_STORAGE_KEY = 'purchasePlanItems_filters';
export const COLUMNS_VISIBILITY_STORAGE_KEY = 'purchasePlanItems_columnsVisibility';

// Константы для статусов
export const ALL_STATUSES = ['Проект', 'В плане', 'Исключена', 'Заявка', 'Пусто'];
export const DEFAULT_STATUSES = ALL_STATUSES.filter(s => s !== 'Исключена');

// Определение всех возможных колонок (все поля сущности PurchasePlanItem)
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

// Колонки, которые отображаются по умолчанию
export const DEFAULT_VISIBLE_COLUMNS = [
  'id',
  'company',
  'purchaserCompany',
  'purchaseRequestId',
  'cfo',
  'purchaseSubject',
  'purchaser',
  'budgetAmount',
  'newContractDate',
  'status',
  'details',
  'requestDate',
];

// Курс валюты
export const USD_TO_UZS_RATE = 12000; // Курс: 1 USD = 12 000 UZS

// Размер страницы
export const PAGE_SIZE = 100; // Фиксированный размер страницы

// Дефолтные значения для новых элементов
export const DEFAULT_NEW_ITEM = {
  status: 'Проект',
};

// Дефолтные ширины колонок
export const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  id: 80,
  company: 179, // 128px * 1.4 = 179.2px (увеличено на 40%)
  guid: 256,
  year: 64, // w-16 = 4rem = 64px
  cfo: 128, // w-32 = 8rem = 128px
  purchaseSubject: 96, // w-24 = 6rem = 96px (уменьшено на 50%)
  budgetAmount: 112, // w-28 = 7rem = 112px
  contractEndDate: 128, // w-32 = 8rem = 128px
  requestDate: 112, // w-28 = 7rem = 112px
  newContractDate: 128, // w-32 = 8rem = 128px
  purchaser: 128, // w-32 = 8rem = 128px
  product: 192, // w-48 = 12rem = 192px
  hasContract: 112, // w-28 = 7rem = 112px
  currentKa: 128, // w-32 = 8rem = 128px
  currentAmount: 128, // w-32 = 8rem = 128px
  currentContractAmount: 160, // w-40 = 10rem = 160px
  currentContractBalance: 160, // w-40 = 10rem = 160px
  currentContractEndDate: 160, // w-40 = 10rem = 160px
  autoRenewal: 128, // w-32 = 8rem = 128px
  complexity: 112, // w-28 = 7rem = 112px
  holding: 128, // w-32 = 8rem = 128px
  category: 128, // w-32 = 8rem = 128px
  purchaserCompany: 179, // 128px * 1.4 = 179.2px (увеличено на 40%)
  status: 200, // Увеличено для длинных статусов заявки (например, "Заявка на согласовании")
  purchaseRequestId: 160, // w-40 = 10rem = 160px
  purchaseRequestStatus: 200, // Ширина для статуса заявки
  comment: 192, // w-48 = 12rem = 192px
  details: 100, // Ширина для колонки с кнопкой деталей
  createdAt: 128, // w-32 = 8rem = 128px
  updatedAt: 128, // w-32 = 8rem = 128px
};
