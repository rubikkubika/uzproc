export const PAGE_SIZE = 100;

export const TEXT_FIELDS = [
  'mainId',
  'comment',
  'purchaseRequestNumber',
  'contractTitle',
  'amount',
  'amountOperator',
  'executor',
  'responsible',
];

/** Месяцы для фильтров по датам (значение — номер месяца 1..12) */
export const MONTH_OPTIONS: { value: string; label: string }[] = [
  { value: '1', label: 'Январь' },
  { value: '2', label: 'Февраль' },
  { value: '3', label: 'Март' },
  { value: '4', label: 'Апрель' },
  { value: '5', label: 'Май' },
  { value: '6', label: 'Июнь' },
  { value: '7', label: 'Июль' },
  { value: '8', label: 'Август' },
  { value: '9', label: 'Сентябрь' },
  { value: '10', label: 'Октябрь' },
  { value: '11', label: 'Ноябрь' },
  { value: '12', label: 'Декабрь' },
];
