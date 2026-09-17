export const PAGE_SIZE = 100;

export const TEXT_FIELDS = [
  'innerId',
  'contractInnerId',
  'contractPurchaseRequestId',
  'contractSubject',
  'supplierName',
  'currency',
  'comment',
];

/** Все фильтры колонок: текстовые (TEXT_FIELDS, через debounce) и выпадающие (применяются сразу) */
export const INITIAL_FILTERS: Record<string, string> = {
  innerId: '',
  contractInnerId: '',
  contractPurchaseRequestId: '',
  contractSubject: '',
  supplierName: '',
  status: '',
  currency: '',
  comment: '',
  responsibleName: '',
  reportStatus: '',
  paymentsStatus: '',
  signal: '',
  esf: '',
  discrepancy: '',
  plannedFrom: '',
  plannedTo: '',
};

/** Сетка колонок таблицы: шапка, строки и скелетон используют одну и ту же */
export const DELIVERY_GRID_CLASS =
  'grid grid-cols-[178px_170px_195px_205px_150px_minmax(140px,1.4fr)_minmax(110px,1fr)_100px_56px_110px]';

/** Минимальная ширина таблицы — уже неё появляется горизонтальная прокрутка */
export const DELIVERY_TABLE_MIN_WIDTH_CLASS = 'min-w-[1406px]';


/** Ключ sessionStorage для состояния таблицы при возврате со страниц договора и заявки */
export const DELIVERY_VIEW_STATE_KEY = 'delivery.viewState';

/** Адрес раздела «Поставки» — если текущий URL недоступен */
export const DELIVERY_SECTION_URL = '/?tab=delivery';

/** Сколько чипов дней показывать в карточке горизонта */
export const HORIZON_CHIPS_LIMIT = 6;

/** Количество скелетон-строк при загрузке */
export const SKELETON_ROWS = 8;
