import type { ColumnDef } from '../types/delivery-columns.types';

/**
 * Колонки таблицы поставок (порядок совпадает с DELIVERY_GRID_CLASS).
 * «Отгрузка» объединяет статус поставки, ЭСФ и статус отчёта; «Деньги» — схему, распределение оплат и статус оплаты.
 */
export const DELIVERY_COLUMNS: ColumnDef[] = [
  { key: 'signal', label: '№', sub: '· внимание', sortField: 'innerId', filterGridClass: 'grid-cols-2' },
  { key: 'dates', label: 'Даты поставки', sortField: 'plannedDeliveryDate', filterGridClass: 'grid-cols-1' },
  { key: 'shipment', label: 'Отгрузка', sortField: 'shipmentStatus', filterGridClass: 'grid-cols-2' },
  { key: 'money', label: 'Деньги', sortField: 'status', filterGridClass: 'grid-cols-2' },
  { key: 'contract', label: 'Договор · Заявка', sortField: 'contractPurchaseRequestId', filterGridClass: 'grid-cols-1' },
  { key: 'supplier', label: 'Поставщик', sortField: 'supplierName', filterGridClass: 'grid-cols-1' },
  { key: 'amount', label: 'Сумма', sortField: 'amount', filterGridClass: 'grid-cols-1' },
  { key: 'comment', label: 'Комментарий', sortField: null, filterGridClass: 'grid-cols-1' },
  { key: 'responsible', label: 'Ответств.', sortField: 'responsibleName', filterGridClass: 'grid-cols-1' },
];

/** Схема оплаты в фильтре колонки «Деньги» */
export const PAYMENT_SCHEME_FILTER_OPTIONS = [
  { value: 'PREPAYMENT', label: 'Аванс' },
  { value: 'POSTPAYMENT', label: 'По факту' },
];
