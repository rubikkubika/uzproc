'use client';

import { useState } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, Plus } from 'lucide-react';
import { useDeliveryTable } from './hooks/useDeliveryTable';
import type { SortField } from './types/delivery.types';
import { PAYMENT_SCHEME_LABELS, STATUS_BADGE_CLASSES } from './types/delivery.types';
import type { PaymentSchemeFilterValue } from './hooks/useDeliveryFilters';
import CreateDeliveryModal from './ui/CreateDeliveryModal';

export default function DeliveryTable() {
  const [createOpen, setCreateOpen] = useState(false);
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
    handleYearChange,
    handleShowNoDate,
    handleShowAll,
    reload,
    updateDeliveryDeadline,
  } = useDeliveryTable();

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
    label: string;
    width: string;
    hasFilter: boolean;
    hasSort: boolean;
    filterKind?: 'text' | 'paymentScheme';
  }> = [
    { field: 'innerId', label: '№', width: '5%', hasFilter: true, hasSort: true, filterKind: 'text' },
    { field: 'deliveryDeadline', label: 'Срок поставки', width: '9%', hasFilter: false, hasSort: true },
    { field: 'contractInnerId', label: 'Договор', width: '10%', hasFilter: true, hasSort: false, filterKind: 'text' },
    { field: 'supplierName', label: 'Поставщик', width: '13%', hasFilter: true, hasSort: false, filterKind: 'text' },
    { field: 'amount', label: 'Сумма', width: '9%', hasFilter: false, hasSort: true },
    { field: 'currency', label: 'Валюта', width: '5%', hasFilter: true, hasSort: false, filterKind: 'text' },
    { field: 'paymentScheme', label: 'Схема оплаты', width: '9%', hasFilter: true, hasSort: false, filterKind: 'paymentScheme' },
    { field: 'status', label: 'Статус', width: '9%', hasFilter: true, hasSort: false, filterKind: 'text' },
    { field: 'comment', label: 'Комментарий', width: '13%', hasFilter: true, hasSort: false, filterKind: 'text' },
    { field: 'responsibleName', label: 'Ответственный', width: '9%', hasFilter: true, hasSort: false, filterKind: 'text' },
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

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col flex-1 min-h-0">
      <div className="px-3 py-1 border-b border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded-lg border border-blue-600 hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Создать поставку
          </button>
          <button
            onClick={handleResetFilters}
            className="px-3 py-1 text-xs font-medium bg-red-50 text-red-700 rounded-lg border border-red-300 hover:bg-red-100 hover:border-red-400 transition-colors whitespace-nowrap"
          >
            Сбросить фильтры
          </button>

          <div className="flex items-center gap-1">
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
        <div className="text-xs text-gray-700 flex-shrink-0">
          Показано {allItems.length} из {data?.totalElements ?? 0} записей
        </div>
      </div>

      <div className="flex-1 min-w-0 overflow-auto relative">
        <table className="w-full max-w-full border-collapse table-fixed">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.field}
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative"
                  style={{ width: col.width }}
                >
                  <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%' }}>
                    <div className="h-[24px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px', minWidth: 0, width: '100%' }}>
                      {col.hasFilter
                        ? col.filterKind === 'paymentScheme'
                          ? renderPaymentSchemeFilter()
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
                <tr key={`${item.id}-${index}`} className="hover:bg-gray-50">
                  <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300 overflow-hidden min-w-0">
                    <span className="truncate block" title={item.innerId ?? undefined}>{item.innerId ?? '-'}</span>
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300 overflow-hidden min-w-0">
                    <input
                      type="date"
                      value={item.deliveryDeadline ?? ''}
                      onChange={(e) => updateDeliveryDeadline(item.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full text-xs border border-gray-300 rounded px-1 py-0.5 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300 overflow-hidden min-w-0">
                    <span className="truncate block" title={item.contractInnerId ?? undefined}>
                      {item.contractInnerId ?? '-'}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300 overflow-hidden min-w-0">
                    <span className="truncate block" title={item.supplierName ?? undefined}>{item.supplierName ?? '-'}</span>
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300 overflow-hidden min-w-0">
                    <span className="truncate block" title={item.amount != null ? String(item.amount) : undefined}>
                      {item.amount != null ? Number(item.amount).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300 overflow-hidden min-w-0">
                    <span className="truncate block">{item.currency ?? '-'}</span>
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300 overflow-hidden min-w-0">
                    <span className="truncate block">
                      {item.paymentScheme ? PAYMENT_SCHEME_LABELS[item.paymentScheme] : '-'}
                    </span>
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
    </div>
  );
}
