// Определение всех возможных колонок
export const ALL_COLUMNS = [
  { key: 'excludeFromInWork', label: 'Скрыть из вкладки' },
  { key: 'idPurchaseRequest', label: 'Номер' },
  { key: 'guid', label: 'GUID' },
  { key: 'purchaseRequestPlanYear', label: 'Год плана' },
  { key: 'company', label: 'Компания' },
  { key: 'cfo', label: 'ЦФО' },
  { key: 'mcc', label: 'МЦК' },
  { key: 'purchaseRequestInitiator', label: 'Инициатор' },
  { key: 'purchaser', label: 'Закупщик' },
  { key: 'name', label: 'Название' },
  { key: 'purchaseRequestCreationDate', label: 'Дата создания' },
  { key: 'budgetAmount', label: 'Бюджет' },
  { key: 'currency', label: 'Валюта' },
  { key: 'costType', label: 'Тип затрат' },
  { key: 'contractType', label: 'Тип договора' },
  { key: 'contractDurationMonths', label: 'Длительность (мес)' },
  { key: 'isPlanned', label: 'Плановость' },
  { key: 'requiresPurchase', label: 'Закупка' },
  { key: 'hasLinkedPlanItem', label: 'План' },
  { key: 'status', label: 'Статус' },
  { key: 'daysSinceCreation', label: 'Срок с даты создания' },
  { key: 'createdAt', label: 'Дата создания (системная)' },
  { key: 'updatedAt', label: 'Дата обновления' },
  { key: 'track', label: 'Трэк' },
  { key: 'rating', label: 'Оценка' },
] as const;

// Колонки, которые отображаются по умолчанию
export const DEFAULT_VISIBLE_COLUMNS = [
  'excludeFromInWork',
  'idPurchaseRequest',
  'cfo',
  'purchaser',
  'name',
  'budgetAmount',
  'hasLinkedPlanItem',
  'status',
  'daysSinceCreation',
  'track',
  'rating',
];

// Ключ для сохранения видимости колонок в localStorage
export const COLUMNS_VISIBILITY_STORAGE_KEY = 'purchaseRequests_columnsVisibility';
