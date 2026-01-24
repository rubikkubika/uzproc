// Ключи для localStorage
export const COLUMNS_WIDTHS_STORAGE_KEY = 'purchasesTableColumnWidths';
export const COLUMNS_ORDER_STORAGE_KEY = 'purchasesTableColumnOrder';

// Статусы
export const ALL_STATUSES = ['Проект', 'Не согласовано'];
export const DEFAULT_STATUSES: string[] = [];

// Дефолтные ширины колонок
export const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  purchaseRequestId: 100, // Заявка
  innerId: 128, // w-32 = 8rem = 128px
  cfo: 80, // w-20 = 5rem = 80px
  budgetAmount: 150, // Бюджет
  status: 120, // Статус
  purchaser: 150, // Закупщик
  purchaseMethod: 140, // Способ закупки
  purchaseRequestCreatedAt: 140, // Дата создания заявки
  purchaseCreationDate: 140, // Дата создания закупки
  approvalDate: 140, // Дата утверждения
  purchaseRequestSubject: 200, // Предмет заявки
};

// Дефолтный порядок колонок
export const DEFAULT_COLUMN_ORDER = [
  'purchaseRequestId',
  'innerId',
  'cfo',
  'purchaser',
  'budgetAmount',
  'purchaseMethod',
  'purchaseRequestSubject',
  'purchaseRequestCreatedAt',
  'purchaseCreationDate',
  'approvalDate',
  'status',
];

// Размер страницы
export const PAGE_SIZE = 25;
