import { PurchaseSendingSubTab } from '../types/purchase-sending.types';

/** Подразделы вкладки «Закупки» */
export const PURCHASE_SENDING_SUB_TABS: PurchaseSendingSubTab[] = [
  { id: 'complexity-errors', label: 'Ошибка сложности' },
];

/** Сколько номеров закупок показывать в свёрнутой строке закупщика */
export const COMPLEXITY_ERROR_COLLAPSED_LIMIT = 3;
