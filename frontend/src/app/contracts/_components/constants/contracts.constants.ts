export const PAGE_SIZE = 100;

export const TEXT_FIELDS = [
  'innerId',
  'name',
  'documentForm',
  'costType',
  'contractType',
  'paymentTerms',
  'purchaseRequestInnerId',
];

/**
 * Точные ширины колонок таблицы договоров (px).
 *
 * Раньше ширины задавались процентами, в сумме дававшими больше 100%: при `table-fixed`
 * браузер пропорционально ужимал ВСЕ колонки, включая фиксированные, и трэк обрезался.
 * Теперь все колонки — в px, кроме «Наименования»: оно не указано в colgroup и забирает
 * весь остаток ширины, растягивая таблицу на широких экранах.
 */
export const CONTRACTS_COLUMN_WIDTHS = {
  eye: 46,
  remarks: 62,
  innerId: 118,
  organization: 104,
  purchaseRequestInnerId: 56,
  preparedBy: 130,
  cfo: 140,
  supplier: 150,
  documentForm: 110,
  contractCreationDate: 96,
  plannedDeliveryEndDate: 130,
  status: 104,
  registrationDate: 96,
  isTypicalForm: 74,
  /** Трэк: три блока этапов (по ~70px) + блок «Срок». */
  track: 268,
} as const;

/** Минимальная ширина «Наименования» — ниже неё включается горизонтальная прокрутка. */
export const CONTRACTS_NAME_MIN_WIDTH = 280;

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
