'use client';

import { useMemo } from 'react';
import type { ColumnKey, FilterOption, HeaderColumn, HeaderFilter } from '../types/delivery-columns.types';
import {
  DELIVERY_STATUS_OPTIONS,
  DISCREPANCY_OPTIONS,
  ESF_OPTIONS,
  PAYMENTS_STATUS_OPTIONS,
  SHIPMENT_STATUS_OPTIONS,
  SIGNAL_OPTIONS,
} from '../types/delivery.types';
import { DELIVERY_COLUMNS, PAYMENT_SCHEME_FILTER_OPTIONS } from '../constants/delivery-columns.constants';
import type { DeliveryFiltersHook, PaymentSchemeFilterValue, ShipmentStatusFilterValue } from './useDeliveryFilters';
import { useReportStatusOptions } from './useReportStatusOptions';
import { useResponsibleOptions } from './useResponsibleOptions';
import { useUndistributedCounts } from './useUndistributedCounts';

const toOptions = (values: string[]): FilterOption[] => values.map((v) => ({ value: v, label: v }));

/** Колонки таблицы с фильтрами шапки: значения, варианты и обработчики. */
export function useDeliveryColumns(filters: DeliveryFiltersHook): HeaderColumn[] {
  const reportStatusOptions = useReportStatusOptions();
  const responsibleOptions = useResponsibleOptions();
  const undistributedCounts = useUndistributedCounts();

  const {
    filters: applied,
    paymentSchemeFilter,
    shipmentStatusFilter,
    setSelectFilter,
    setPaymentSchemeFilter,
    setShipmentStatusFilter,
    setPlannedRange,
  } = filters;

  return useMemo(() => {
    const select = (key: string, placeholder: string, options: FilterOption[], wide = false): HeaderFilter => ({
      kind: 'select',
      key,
      placeholder,
      value: applied[key] ?? '',
      options,
      onChange: (value) => setSelectFilter(key, value),
      wide,
    });

    const byColumn: Record<ColumnKey, HeaderFilter[]> = {
      signal: [
        { kind: 'text', field: 'innerId', placeholder: 'Фильтр' },
        select('signal', 'Сигнал', SIGNAL_OPTIONS),
      ],
      dates: [
        { kind: 'range', from: applied.plannedFrom ?? '', to: applied.plannedTo ?? '', onChange: setPlannedRange },
      ],
      shipment: [
        {
          kind: 'select',
          key: 'shipmentStatus',
          placeholder: 'Статус',
          value: shipmentStatusFilter,
          options: SHIPMENT_STATUS_OPTIONS,
          onChange: (value) => setShipmentStatusFilter(value as ShipmentStatusFilterValue),
        },
        select('esf', 'ЭСФ', ESF_OPTIONS),
        select('reportStatus', 'Отчёт', toOptions(reportStatusOptions)),
        select('discrepancy', 'Расхожд.', DISCREPANCY_OPTIONS),
      ],
      money: [
        {
          kind: 'select',
          key: 'paymentScheme',
          placeholder: 'Схема',
          value: paymentSchemeFilter,
          options: PAYMENT_SCHEME_FILTER_OPTIONS,
          onChange: (value) => setPaymentSchemeFilter(value as PaymentSchemeFilterValue),
        },
        select('paymentsStatus', 'Оплаты', [
          ...PAYMENTS_STATUS_OPTIONS,
          ...undistributedCounts.map((n) => ({ value: `undistributed:${n}`, label: `Не распределены: ${n}` })),
        ]),
        select('status', 'Статус оплаты', DELIVERY_STATUS_OPTIONS, true),
      ],
      contract: [
        { kind: 'text', field: 'contractInnerId', placeholder: 'Договор' },
        { kind: 'text', field: 'contractPurchaseRequestId', placeholder: 'Заявка' },
      ],
      subject: [{ kind: 'text', field: 'contractSubject', placeholder: 'Фильтр' }],
      supplier: [{ kind: 'text', field: 'supplierName', placeholder: 'Фильтр' }],
      // Сумма объединена с валютой — фильтр колонки ищет по валюте
      amount: [{ kind: 'text', field: 'currency', placeholder: 'Валюта' }],
      comment: [{ kind: 'text', field: 'comment', placeholder: '…', compact: true }],
      responsible: [select('responsibleName', 'Все', toOptions(responsibleOptions))],
    };

    return DELIVERY_COLUMNS.map((col) => ({ ...col, filters: byColumn[col.key] }));
  }, [applied, paymentSchemeFilter, shipmentStatusFilter, setSelectFilter, setPaymentSchemeFilter, setShipmentStatusFilter,
    setPlannedRange, reportStatusOptions, responsibleOptions, undistributedCounts]);
}
