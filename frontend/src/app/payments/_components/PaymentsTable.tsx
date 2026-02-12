'use client';

import Link from 'next/link';
import { ArrowUp, ArrowDown, ArrowUpDown, Search } from 'lucide-react';
import { usePaymentsTable } from './hooks/usePaymentsTable';

export default function PaymentsTable() {
  const {
    data,
    allItems,
    loading,
    loadingMore,
    error,
    setCurrentPage,
    sortField,
    sortDirection,
    handleSort,
    handleResetFilters,
    filters,
    loadMoreRef,
    paymentsTab,
    setPaymentsTab,
  } = usePaymentsTable();

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <p className="text-red-500">Ошибка: {error}</p>
      </div>
    );
  }

  /** Сумма сокращённо: тыс., млн, млрд */
  const formatAmount = (amount: number | null) => {
    if (amount == null) return '-';
    const abs = Math.abs(amount);
    const sign = amount < 0 ? '−' : '';
    if (abs >= 1_000_000_000) {
      const v = amount / 1_000_000_000;
      return `${sign}${v % 1 === 0 ? v : v.toFixed(1)} млрд`;
    }
    if (abs >= 1_000_000) {
      const v = amount / 1_000_000;
      return `${sign}${v % 1 === 0 ? v : v.toFixed(1)} млн`;
    }
    if (abs >= 1_000) {
      const v = amount / 1_000;
      return `${sign}${v % 1 === 0 ? v : v.toFixed(1)} тыс.`;
    }
    return new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col flex-1 min-h-0">
      {/* Заголовок: Сбросить фильтры и счётчик — как на странице заявок */}
      <div className="px-3 py-1 border-b border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleResetFilters}
            className="px-3 py-1 text-xs font-medium bg-red-50 text-red-700 rounded-lg border border-red-300 hover:bg-red-100 hover:border-red-400 transition-colors whitespace-nowrap"
          >
            Сбросить фильтры
          </button>
        </div>
        <div className="text-xs text-gray-700 flex-shrink-0">
          Показано {allItems.length} из {data?.totalElements ?? 0} записей
        </div>
      </div>

      {/* Вкладки — стиль как на странице заявок, «Оплата по заявкам» слева и по умолчанию */}
      <div className="sticky top-0 left-0 right-0 z-30 flex gap-1 pt-2 pb-2 bg-white shadow-sm" style={{ minHeight: '44px', width: '100%' }}>
        <button
          type="button"
          onClick={() => setPaymentsTab('by-request')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors shadow-sm ${
            paymentsTab === 'by-request'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          Оплата по заявкам
        </button>
        <button
          type="button"
          onClick={() => setPaymentsTab('all')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors shadow-sm ${
            paymentsTab === 'all'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          Все оплаты
        </button>
      </div>

      {loading ? (
        <div className="px-6 py-8 text-center text-gray-500">Загрузка...</div>
      ) : (
        <div className="flex-1 min-w-0 overflow-auto relative">
          <table className="w-full max-w-full border-collapse table-fixed">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative" style={{ width: '10%' }}>
                  <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%' }}>
                    <div className="h-[24px] flex items-center flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px' }} />
                    <div className="flex items-center gap-1 min-h-[20px]">
                      <span className="text-xs font-medium text-gray-500 tracking-wider">Номер заявки</span>
                    </div>
                  </div>
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative" style={{ width: '12%' }}>
                  <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%' }}>
                    <div className="h-[24px] flex items-center flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px' }} />
                    <div className="flex items-center gap-1 min-h-[20px]">
                      <button
                        onClick={() => handleSort('amount')}
                        className="flex items-center justify-center hover:text-gray-700 transition-colors flex-shrink-0"
                        style={{ width: '20px', height: '20px', minWidth: '20px', maxWidth: '20px', minHeight: '20px', maxHeight: '20px', padding: 0 }}
                      >
                        {sortField === 'amount' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                      </button>
                      <span className="text-xs font-medium text-gray-500 tracking-wider">Сумма</span>
                    </div>
                  </div>
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative" style={{ width: '18%' }}>
                  <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%' }}>
                    <div className="h-[24px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px', minWidth: 0, width: '100%' }}>
                      <div ref={filters.cfoFilterContainerRef} className="relative w-full h-full">
                        <button
                          ref={filters.cfoFilterButtonRef}
                          type="button"
                          onClick={() => filters.setIsCfoFilterOpen(!filters.isCfoFilterOpen)}
                          className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded bg-white text-left focus:ring-1 focus:ring-blue-500 flex items-center gap-1 hover:bg-gray-50 text-gray-900"
                          style={{ height: '24px', minHeight: '24px', maxHeight: '24px', boxSizing: 'border-box' }}
                        >
                          <span className="text-gray-600 truncate flex-1 min-w-0 text-left">
                            {filters.cfoFilter.size === 0 ? 'Все' : filters.cfoFilter.size === 1 ? Array.from(filters.cfoFilter)[0] : `${filters.cfoFilter.size} выбрано`}
                          </span>
                          <svg className={`w-3 h-3 transition-transform flex-shrink-0 ${filters.isCfoFilterOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {filters.isCfoFilterOpen && filters.cfoFilterPosition && (
                          <div
                            className="fixed z-50 w-64 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden"
                            style={{ top: `${filters.cfoFilterPosition.top}px`, left: `${filters.cfoFilterPosition.left}px` }}
                          >
                            <div className="p-2 border-b border-gray-200">
                              <div className="relative">
                                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                                <input
                                  type="text"
                                  value={filters.cfoSearchQuery}
                                  onChange={(e) => { e.stopPropagation(); filters.setCfoSearchQuery(e.target.value); }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-full pl-7 pr-2 py-1 text-xs border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  placeholder="Поиск..."
                                />
                              </div>
                            </div>
                            <div className="p-2 border-b border-gray-200 flex gap-2">
                              <button onClick={() => filters.handleCfoSelectAll()} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Все</button>
                              <button onClick={() => filters.handleCfoDeselectAll()} className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300">Снять</button>
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                              {filters.getFilteredCfoOptions.length === 0 ? (
                                <div className="text-xs text-gray-500 p-2 text-center">Нет данных</div>
                              ) : (
                                filters.getFilteredCfoOptions.map((cfo) => (
                                  <label key={cfo} className="flex items-center p-2 hover:bg-gray-50 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={filters.cfoFilter.has(cfo)}
                                      onChange={() => filters.handleCfoToggle(cfo)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="mr-2"
                                    />
                                    <span className="text-xs text-gray-700">{cfo}</span>
                                  </label>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 min-h-[20px]">
                      <button
                        onClick={() => handleSort('cfo')}
                        className="flex items-center justify-center hover:text-gray-700 transition-colors flex-shrink-0"
                        style={{ width: '20px', height: '20px', minWidth: '20px', maxWidth: '20px', minHeight: '20px', maxHeight: '20px', padding: 0 }}
                      >
                        {sortField === 'cfo' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                      </button>
                      <span className="text-xs font-medium text-gray-500 tracking-wider uppercase">ЦФО</span>
                    </div>
                  </div>
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative" style={{ width: '60%' }}>
                  <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%' }}>
                    <div className="h-[24px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px', minWidth: 0, width: '100%' }}>
                      <input
                        type="text"
                        data-filter-field="comment"
                        value={filters.localFilters.comment ?? ''}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          const cursorPos = e.target.selectionStart ?? 0;
                          filters.setLocalFilters((prev) => ({ ...prev, comment: newValue }));
                          requestAnimationFrame(() => {
                            const input = e.target as HTMLInputElement;
                            if (input && document.activeElement === input) {
                              input.setSelectionRange(Math.min(cursorPos, newValue.length), Math.min(cursorPos, newValue.length));
                            }
                          });
                        }}
                        onFocus={(e) => { e.stopPropagation(); filters.setFocusedField('comment'); }}
                        onBlur={(e) => {
                          setTimeout(() => {
                            const active = document.activeElement as HTMLElement;
                            if (active && active !== e.target && !active.closest('input[data-filter-field]') && !active.closest('select')) {
                              filters.setFocusedField(null);
                            }
                          }, 200);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Фильтр"
                        style={{ height: '24px', minHeight: '24px', maxHeight: '24px', minWidth: 0, boxSizing: 'border-box' }}
                      />
                    </div>
                    <div className="flex items-center gap-1 min-h-[20px]">
                      <button
                        onClick={() => handleSort('comment')}
                        className="flex items-center justify-center hover:text-gray-700 transition-colors flex-shrink-0"
                        style={{ width: '20px', height: '20px', minWidth: '20px', maxWidth: '20px', minHeight: '20px', maxHeight: '20px', padding: 0 }}
                      >
                        {sortField === 'comment' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                      </button>
                      <span className="text-xs font-medium text-gray-500 tracking-wider">Комментарий (Основание)</span>
                    </div>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allItems.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300 whitespace-nowrap">
                    {payment.purchaseRequestId != null ? (
                      <Link
                        href={`/purchase-request/${payment.purchaseRequestId}`}
                        className="text-blue-600 hover:underline"
                      >
                        {payment.purchaseRequestNumber != null ? String(payment.purchaseRequestNumber) : '-'}
                      </Link>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300 whitespace-nowrap" title={payment.amount != null ? new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(payment.amount) : undefined}>
                    {formatAmount(payment.amount)}
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300 whitespace-nowrap" title={payment.cfo ?? undefined}>
                    {payment.cfo ?? '-'}
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300" title={payment.comment ?? undefined}>
                    <span className="line-clamp-2">{payment.comment ?? '-'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loadingMore && (
            <div className="px-4 py-2 text-center text-xs text-gray-500 bg-gray-50 border-t border-gray-200">
              Загрузка следующих...
            </div>
          )}
          <div ref={loadMoreRef} className="h-4 flex items-center justify-center py-1" />
        </div>
      )}
    </div>
  );
}
