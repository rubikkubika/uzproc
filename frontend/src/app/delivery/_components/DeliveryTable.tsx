'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUp, ArrowDown, ArrowUpDown, Plus, MessageCircle, Check, X } from 'lucide-react';
import { useDeliveryTable } from './hooks/useDeliveryTable';
import { useReportStatusOptions } from './hooks/useReportStatusOptions';
import { useResponsibleOptions } from './hooks/useResponsibleOptions';
import type { Delivery, SortField } from './types/delivery.types';
import {
  STATUS_BADGE_CLASSES,
  SHIPMENT_STATUS_OPTIONS,
  PAYMENTS_STATUS_OPTIONS,
  DELIVERY_STATUS_OPTIONS,
  getPaymentSchemeLabel,
  getPaymentsStatus,
} from './types/delivery.types';
import type { PaymentSchemeFilterValue, ShipmentStatusFilterValue } from './hooks/useDeliveryFilters';
import { useUndistributedCounts } from './hooks/useUndistributedCounts';
import { formatAmountShort, formatAmountFull } from './utils/amount.utils';
import CreateDeliveryModal from './ui/CreateDeliveryModal';
import DeliveryTableTabs from './ui/DeliveryTableTabs';
import DeliveryDetailsModal from './ui/DeliveryDetailsModal';
import DeliveryDeadlineChart from './ui/DeliveryDeadlineChart';
import DeliveryDatesCell from './ui/DeliveryDatesCell';
import DeliveryResponsibleSummaryTable from './ui/summary/DeliveryResponsibleSummaryTable';
import { useDeliveryResponsibleSummary } from './hooks/useDeliveryResponsibleSummary';
import { useDeliverySummarySelection } from './hooks/useDeliverySummarySelection';
import { useDeliveryDeadlineChart } from './hooks/useDeliveryDeadlineChart';
import Tour from '@/app/_components/tour/ui/Tour';
import TourButton from '@/app/_components/tour/ui/TourButton';
import { useTour } from '@/app/_components/tour/hooks/useTour';
import { DELIVERY_TOUR_STEPS } from './constants/delivery-tour.constants';

export default function DeliveryTable() {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const {
    data,
    allItems,
    loading,
    loadingMore,
    error,
    sortField,
    sortDirection,
    handleSort,
    handleResetFilters,
    filters,
    loadMoreRef,
    selectedYear,
    showNoDate,
    availableYears,
    activeTab,
    setActiveTab,
    tabCounts,
    handleYearChange,
    handleShowNoDate,
    handleShowAll,
    currentYear,
    reload,
    setPlannedDate,
    updatePlannedDeliveryDate,
    updateActualDeliveryDate,
    updateEsfDate,
  } = useDeliveryTable();

  // Диаграмма распределения поставок по дням месяца — по плановой дате поставки
  const deadlineChart = useDeliveryDeadlineChart({
    filters: filters.filters,
    paymentSchemeFilter: filters.paymentSchemeFilter,
    shipmentStatusFilter: filters.shipmentStatusFilter,
    dateYear: showNoDate ? null : selectedYear,
    showNoDate,
    tab: activeTab,
    onSelectedDateChange: setPlannedDate,
  });

  // Сводка по ответственным — не зависит от фильтров таблицы (как в заявках и договорах),
  // в том числе от фильтра дат: колонка «Поставлено» всегда за текущий год и подписана им.
  const summaryYear = currentYear;
  const { summary, loading: summaryLoading } = useDeliveryResponsibleSummary(summaryYear);

  // Клики по ячейкам сводки: ставят таблице ровно те фильтры, по которым посчитана ячейка
  const summarySelection = useDeliverySummarySelection({
    setActiveTab,
    showAllDates: handleShowAll,
    summaryYear,
    filters,
  });

  const tour = useTour(DELIVERY_TOUR_STEPS);

  const reportStatusOptions = useReportStatusOptions();
  const responsibleOptions = useResponsibleOptions();
  const undistributedCounts = useUndistributedCounts();

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <p className="text-red-500">Ошибка: {error}</p>
      </div>
    );
  }

  const renderFilterInput = (field: string, placeholder: string = 'Фильтр') => (
    <input
      key={`filter-${field}`}
      type="text"
      data-filter-field={field}
      value={filters.localFilters[field] ?? ''}
      onChange={(e) => {
        const newValue = e.target.value;
        const cursorPos = e.target.selectionStart ?? 0;
        filters.handleFilterChange(field, newValue);
        requestAnimationFrame(() => {
          const input = e.target as HTMLInputElement;
          if (input && document.activeElement === input) {
            input.setSelectionRange(Math.min(cursorPos, newValue.length), Math.min(cursorPos, newValue.length));
          }
        });
      }}
      onFocus={(e) => { e.stopPropagation(); filters.setFocusedField(field); }}
      onBlur={(e) => {
        setTimeout(() => {
          const active = document.activeElement as HTMLElement;
          if (active && active !== e.target && !active.closest('input[data-filter-field]') && !active.closest('select')) {
            filters.setFocusedField(null);
          }
        }, 200);
      }}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.stopPropagation(); }}
      className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
      placeholder={placeholder}
      style={{ height: '24px', minHeight: '24px', maxHeight: '24px', minWidth: 0, boxSizing: 'border-box' }}
    />
  );

  const renderSortButton = (field: string) => (
    <button
      onClick={() => handleSort(field as SortField)}
      className="flex items-center justify-center hover:text-gray-700 transition-colors flex-shrink-0"
      style={{ width: '20px', height: '20px', minWidth: '20px', maxWidth: '20px', minHeight: '20px', maxHeight: '20px', padding: 0 }}
    >
      {sortField === field ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
    </button>
  );

  const columns: Array<{
    field: string;
    label: React.ReactNode;
    width: string;
    hasFilter: boolean;
    hasSort: boolean;
    filterKind?: 'text' | 'currency' | 'paymentScheme' | 'shipmentStatus' | 'reportStatus' | 'paymentsStatus' | 'deliveryStatus' | 'responsible';
  }> = [
    { field: 'innerId', label: '№', width: '5%', hasFilter: true, hasSort: true, filterKind: 'text' },
    { field: 'plannedDeliveryDate', label: 'Даты поставки', width: '13%', hasFilter: false, hasSort: true },
    { field: 'shipmentStatus', label: 'Статус поставки', width: '8%', hasFilter: true, hasSort: false, filterKind: 'shipmentStatus' },
    { field: 'reportStatus', label: 'Статус (отчёт)', width: '7%', hasFilter: true, hasSort: false, filterKind: 'reportStatus' },
    { field: 'paymentScheme', label: 'Схема оплаты', width: '8%', hasFilter: true, hasSort: false, filterKind: 'paymentScheme' },
    { field: 'payments', label: 'Оплаты', width: '9%', hasFilter: true, hasSort: false, filterKind: 'paymentsStatus' },
    { field: 'status', label: 'Статус оплаты', width: '8%', hasFilter: true, hasSort: false, filterKind: 'deliveryStatus' },
    { field: 'contractInnerId', label: 'Договор', width: '9%', hasFilter: true, hasSort: false, filterKind: 'text' },
    { field: 'contractPurchaseRequestId', label: 'Заявка', width: '6%', hasFilter: true, hasSort: true, filterKind: 'text' },
    { field: 'supplierName', label: 'Поставщик', width: '12%', hasFilter: true, hasSort: false, filterKind: 'text' },
    // Сумма и валюта объединены в одну колонку (как «Бюджет» в заявках): валюта показывается
    // символом рядом с суммой, а фильтр колонки ищет по валюте
    { field: 'amount', label: 'Сумма', width: '9%', hasFilter: true, hasSort: true, filterKind: 'currency' },
    {
      field: 'comment',
      label: (
        <span className="inline-flex items-center justify-center" title="Комментарий">
          <MessageCircle className="w-4 h-4 text-gray-500" aria-hidden />
        </span>
      ),
      width: '9%',
      hasFilter: true,
      hasSort: false,
      filterKind: 'text',
    },
    { field: 'responsibleName', label: 'Ответственный', width: '7%', hasFilter: true, hasSort: false, filterKind: 'responsible' },
  ];

  const renderPaymentSchemeFilter = () => (
    <select
      value={filters.paymentSchemeFilter}
      onChange={(e) => filters.setPaymentSchemeFilter(e.target.value as PaymentSchemeFilterValue)}
      onClick={(e) => e.stopPropagation()}
      className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
      style={{ height: '24px', minHeight: '24px', maxHeight: '24px', minWidth: 0, boxSizing: 'border-box' }}
    >
      <option value="">Все</option>
      <option value="PREPAYMENT">Аванс</option>
      <option value="POSTPAYMENT">По факту</option>
    </select>
  );

  const renderShipmentStatusFilter = () => (
    <select
      value={filters.shipmentStatusFilter}
      onChange={(e) => filters.setShipmentStatusFilter(e.target.value as ShipmentStatusFilterValue)}
      onClick={(e) => e.stopPropagation()}
      className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
      style={{ height: '24px', minHeight: '24px', maxHeight: '24px', minWidth: 0, boxSizing: 'border-box' }}
    >
      <option value="">Все</option>
      {SHIPMENT_STATUS_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );

  const renderPaymentsStatusFilter = () => (
    <select
      value={filters.filters.paymentsStatus ?? ''}
      onChange={(e) => filters.setPaymentsStatusFilter(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
      style={{ height: '24px', minHeight: '24px', maxHeight: '24px', minWidth: 0, boxSizing: 'border-box' }}
    >
      <option value="">Все</option>
      {PAYMENTS_STATUS_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
      {undistributedCounts.map((n) => (
        <option key={`undistributed:${n}`} value={`undistributed:${n}`}>Не распределены: {n}</option>
      ))}
    </select>
  );

  const renderDeliveryStatusFilter = () => (
    <select
      value={filters.filters.status ?? ''}
      onChange={(e) => filters.setStatusFilter(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
      style={{ height: '24px', minHeight: '24px', maxHeight: '24px', minWidth: 0, boxSizing: 'border-box' }}
    >
      <option value="">Все</option>
      {DELIVERY_STATUS_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );

  const renderReportStatusFilter = () => (
    <select
      value={filters.filters.reportStatus ?? ''}
      onChange={(e) => filters.setReportStatusFilter(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
      style={{ height: '24px', minHeight: '24px', maxHeight: '24px', minWidth: 0, boxSizing: 'border-box' }}
    >
      <option value="">Все</option>
      {reportStatusOptions.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );

  const renderResponsibleFilter = () => (
    <select
      value={filters.filters.responsibleName ?? ''}
      onChange={(e) => filters.setResponsibleNameFilter(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
      style={{ height: '24px', minHeight: '24px', maxHeight: '24px', minWidth: 0, boxSizing: 'border-box' }}
    >
      <option value="">Все</option>
      {responsibleOptions.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col flex-1 min-h-0">
      {/* Вкладки: «В работе» / «Закрыто» (Закрыто = Поставлено + Оплачено) */}
      <DeliveryTableTabs
        activeTab={activeTab}
        tabCounts={tabCounts}
        onTabChange={setActiveTab}
        actions={<TourButton onClick={tour.start} />}
      />
      {/* Сводка по ответственным — над панелью управления, как сводки в заявках и договорах */}
      <div data-tour="responsible-summary" className="px-3 py-2 border-b border-gray-200 bg-white flex-shrink-0">
        <DeliveryResponsibleSummaryTable
          summary={summary}
          loading={summaryLoading}
          selectedResponsible={filters.localFilters.responsibleName ?? ''}
          onResponsibleClick={summarySelection.onResponsibleClick}
          onShipmentStatusClick={summarySelection.onShipmentStatusClick}
          onPaymentStatusClick={summarySelection.onPaymentStatusClick}
          onOverdueClick={summarySelection.onOverdueClick}
          onDeliveredClick={summarySelection.onDeliveredClick}
        />
      </div>

      <div className="px-3 py-1 border-b border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            data-tour="create-delivery"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded-lg border border-blue-600 hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Создать поставку
          </button>
          <button
            data-tour="reset-filters"
            onClick={handleResetFilters}
            className="px-3 py-1 text-xs font-medium bg-red-50 text-red-700 rounded-lg border border-red-300 hover:bg-red-100 hover:border-red-400 transition-colors whitespace-nowrap"
          >
            Сбросить фильтры
          </button>

          <div data-tour="date-filter" className="flex items-center gap-1">
            <span className="text-xs text-gray-500 mr-1">Дата:</span>
            <button
              onClick={handleShowAll}
              className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                selectedYear === null && !showNoDate
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
              }`}
            >
              Все
            </button>
            {availableYears.map(year => (
              <button
                key={year}
                onClick={() => handleYearChange(year)}
                className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                  selectedYear === year && !showNoDate
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                }`}
              >
                {year}
              </button>
            ))}
            <button
              onClick={handleShowNoDate}
              className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                showNoDate
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
              }`}
            >
              Без даты
            </button>
          </div>

        </div>
        <div data-tour="records-counter" className="text-xs text-gray-700 flex-shrink-0">
          Показано {allItems.length} из {data?.totalElements ?? 0} записей
        </div>
      </div>

      <DeliveryDeadlineChart
        year={deadlineChart.year}
        month={deadlineChart.month}
        histogram={deadlineChart.histogram}
        maxCount={deadlineChart.maxCount}
        loading={deadlineChart.loading}
        selectedDay={deadlineChart.selectedDay}
        onToggleDay={deadlineChart.toggleDay}
        onPrevMonth={deadlineChart.goToPrevMonth}
        onNextMonth={deadlineChart.goToNextMonth}
        onSelectMonth={deadlineChart.selectMonth}
      />

      <div className="flex-1 min-w-0 overflow-auto relative">
        <table className="w-full max-w-full border-collapse table-fixed">
          <thead data-tour="table-head" className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.field}
                  data-tour={`col-${col.field}`}
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative"
                  style={{ width: col.width }}
                >
                  <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%' }}>
                    <div className="h-[24px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px', minWidth: 0, width: '100%' }}>
                      {col.hasFilter
                        ? col.filterKind === 'paymentScheme'
                          ? renderPaymentSchemeFilter()
                          : col.filterKind === 'shipmentStatus'
                            ? renderShipmentStatusFilter()
                            : col.filterKind === 'reportStatus'
                              ? renderReportStatusFilter()
                              : col.filterKind === 'paymentsStatus'
                                ? renderPaymentsStatusFilter()
                                : col.filterKind === 'deliveryStatus'
                                  ? renderDeliveryStatusFilter()
                                  : col.filterKind === 'responsible'
                                    ? renderResponsibleFilter()
                                    // Колонка «Сумма» объединена с валютой — фильтр ищет по валюте
                                    : col.filterKind === 'currency'
                                      ? renderFilterInput('currency', 'Валюта')
                                      : renderFilterInput(col.field)
                        : null}
                    </div>
                    <div className="flex items-center gap-1 min-h-[20px]">
                      {col.hasSort && renderSortButton(col.field)}
                      <span className="text-xs font-medium text-gray-500 tracking-wider">{col.label}</span>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8 text-center text-gray-500">
                  Загрузка...
                </td>
              </tr>
            ) : allItems.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8 text-center text-gray-500">
                  Нет данных
                </td>
              </tr>
            ) : (
              allItems.map((item, index) => (
                <tr
                  key={`${item.id}-${index}`}
                  data-tour={index === 0 ? 'first-row' : undefined}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedDelivery(item)}
                >
                  <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300 overflow-hidden min-w-0">
                    <span className="truncate block" title={item.innerId ?? undefined}>{item.innerId ?? '-'}</span>
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300 overflow-hidden min-w-0">
                    <DeliveryDatesCell
                      delivery={item}
                      onChangePlannedDate={updatePlannedDeliveryDate}
                      onChangeActualDate={updateActualDeliveryDate}
                      onChangeEsfDate={updateEsfDate}
                    />
                  </td>
                  <td className="px-2 py-2 text-xs border-r border-gray-300 overflow-hidden min-w-0">
                    <div className="flex flex-col items-start gap-1">
                      {item.shipmentStatus ? (
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_BADGE_CLASSES[item.shipmentStatusColor ?? 'gray'] ?? STATUS_BADGE_CLASSES.gray}`}
                          title={item.shipmentStatus}
                        >
                          {item.shipmentStatus}
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                      {item.esfDate ? (
                        <span
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap bg-green-100 text-green-800"
                          title={`ЭСФ: ${new Date(item.esfDate).toLocaleDateString('ru-RU')}`}
                        >
                          ЭСФ <Check className="w-3 h-3" />
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap bg-red-100 text-red-800"
                          title="ЭСФ отсутствует"
                        >
                          ЭСФ <X className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300 overflow-hidden min-w-0">
                    <span className="truncate block" title={item.reportStatus ?? undefined}>{item.reportStatus ?? '-'}</span>
                  </td>
                  <td className="px-2 py-2 text-xs border-r border-gray-300 overflow-hidden min-w-0">
                    <span
                      className={`truncate block ${item.paymentSchemeLabel || item.paymentScheme ? 'text-gray-900' : 'text-gray-400'}`}
                      title={item.paymentSchemeLabel ?? getPaymentSchemeLabel(item.paymentScheme)}
                    >
                      {item.paymentSchemeLabel ?? getPaymentSchemeLabel(item.paymentScheme)}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-xs border-r border-gray-300 overflow-hidden min-w-0">
                    {(() => {
                      const ps = getPaymentsStatus(item.paymentsCount, item.paymentsDistributed);
                      return (
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${ps.badgeClass}`}
                          title={ps.label}
                        >
                          {ps.label}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-2 py-2 text-xs border-r border-gray-300 overflow-hidden min-w-0">
                    {item.status ? (
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_BADGE_CLASSES[item.statusColor ?? 'gray'] ?? STATUS_BADGE_CLASSES.gray}`}
                        title={item.status}
                      >
                        {item.status}
                      </span>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300 overflow-hidden min-w-0">
                    {item.contractId != null && item.contractInnerId ? (
                      <Link
                        href={`/contract/${item.contractId}?from=${encodeURIComponent('/delivery')}`}
                        onClick={(e) => e.stopPropagation()}
                        className="truncate block text-blue-600 hover:text-blue-800 hover:underline"
                        title={item.contractInnerId}
                      >
                        {item.contractInnerId}
                      </Link>
                    ) : (
                      <span className="truncate block" title={item.contractInnerId ?? undefined}>
                        {item.contractInnerId ?? '-'}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300 overflow-hidden min-w-0">
                    {item.contractPurchaseRequestSystemId != null ? (
                      <Link
                        href={`/purchase-request/${item.contractPurchaseRequestSystemId}?from=${encodeURIComponent('/delivery')}`}
                        onClick={(e) => e.stopPropagation()}
                        className="truncate block text-blue-600 hover:text-blue-800 hover:underline"
                        title={item.contractPurchaseRequestId != null ? String(item.contractPurchaseRequestId) : undefined}
                      >
                        {item.contractPurchaseRequestId ?? item.contractPurchaseRequestSystemId}
                      </Link>
                    ) : (
                      <span className="truncate block" title={item.contractPurchaseRequestId != null ? String(item.contractPurchaseRequestId) : undefined}>
                        {item.contractPurchaseRequestId ?? '-'}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300 overflow-hidden min-w-0">
                    <span className="truncate block" title={item.supplierName ?? undefined}>{item.supplierName ?? '-'}</span>
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300 overflow-hidden min-w-0">
                    <span className="truncate block" title={formatAmountFull(item.amount, item.currency)}>
                      {item.amount != null ? formatAmountShort(item.amount, item.currency) : '-'}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300 overflow-hidden min-w-0">
                    <span className="line-clamp-2 block min-w-0" title={item.comment ?? undefined}>{item.comment ?? '-'}</span>
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300 overflow-hidden min-w-0">
                    <span className="truncate block" title={item.responsibleDisplayName ?? undefined}>{item.responsibleDisplayName ?? '-'}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {loadingMore && (
          <div className="px-4 py-2 text-center text-xs text-gray-500 bg-gray-50 border-t border-gray-200">
            Загрузка следующих...
          </div>
        )}
        <div ref={loadMoreRef} className="h-4 flex items-center justify-center py-1" />
      </div>

      <CreateDeliveryModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={reload}
      />

      <DeliveryDetailsModal
        delivery={selectedDelivery}
        onClose={() => setSelectedDelivery(null)}
        onSaved={reload}
      />

      <Tour tour={tour} title="Тур по разделу «Поставки»" />
    </div>
  );
}
