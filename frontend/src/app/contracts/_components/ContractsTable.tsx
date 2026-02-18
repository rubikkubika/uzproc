'use client';

import { ArrowUp, ArrowDown, ArrowUpDown, Search, Settings } from 'lucide-react';
import { useContractsTable } from './hooks/useContractsTable';
import ContractsTableTabs from './ui/ContractsTableTabs';

export default function ContractsTable() {
  const {
    data,
    allItems,
    loading,
    loadingMore,
    error,
    currentPage,
    setCurrentPage,
    pageSize,
    selectedYear,
    setSelectedYear,
    currentYear,
    allYears,
    sortField,
    sortDirection,
    handleSort,
    handleResetFilters,
    filters,
    loadMoreRef,
  } = useContractsTable();

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <p className="text-red-500">Ошибка: {error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col flex-1 min-h-0">
      {/* Header с кнопкой Сбросить фильтры и фильтром по году — как на странице заявок */}
      <div className="px-3 py-1 border-b border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Кнопка - Сбросить фильтры */}
          <button
            onClick={handleResetFilters}
            className="px-3 py-1 text-xs font-medium bg-red-50 text-red-700 rounded-lg border border-red-300 hover:bg-red-100 hover:border-red-400 transition-colors whitespace-nowrap"
          >
            Сбросить фильтры
          </button>
          <button
            type="button"
            disabled
            title="Настройка колонок (для этой таблицы пока недоступна)"
            className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded-lg border border-gray-300 cursor-not-allowed flex items-center gap-1 opacity-70"
          >
            <Settings className="w-3 h-3" />
            Колонки
          </button>

          {/* Фильтр по году */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-700 font-medium whitespace-nowrap">Год:</span>
            <button
              onClick={() => setSelectedYear(null)}
              className={`px-2 py-1 text-xs rounded border transition-colors ${
                selectedYear === null
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Все
            </button>
            {allYears.map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-2 py-1 text-xs rounded border transition-colors ${
                  selectedYear === year
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        {/* Показано X из Y записей — как на странице заявок */}
        <div className="text-xs text-gray-700 flex-shrink-0">
          Показано {allItems.length} из {data?.totalElements ?? 0} записей
        </div>
      </div>

      {/* Вкладки — под кнопкой Сбросить фильтры */}
      <ContractsTableTabs
        activeTab={filters.activeTab}
        onTabChange={(tab) => {
          filters.setActiveTab(tab);
          setCurrentPage(0);
        }}
      />

      <div className="flex-1 min-w-0 overflow-auto relative custom-scrollbar">
        <table className="w-full max-w-full border-collapse table-fixed">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative" style={{ width: (filters.activeTab === 'in-work' || filters.activeTab === 'signed') ? '8%' : '9%' }}>
                  <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%' }}>
                    <div className="h-[24px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px', minWidth: 0, width: '100%' }}>
                      <input
                        key="filter-innerId"
                        type="text"
                        data-filter-field="innerId"
                        value={filters.localFilters.innerId ?? ''}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          const cursorPos = e.target.selectionStart ?? 0;
                          filters.handleFilterChange('innerId', newValue);
                          requestAnimationFrame(() => {
                            const input = e.target as HTMLInputElement;
                            if (input && document.activeElement === input) {
                              const newPos = Math.min(cursorPos, newValue.length);
                              input.setSelectionRange(newPos, newPos);
                            }
                          });
                        }}
                        onFocus={(e) => { e.stopPropagation(); filters.setFocusedField('innerId'); }}
                        onBlur={(e) => {
                          setTimeout(() => {
                            const activeElement = document.activeElement as HTMLElement;
                            if (activeElement &&
                                activeElement !== e.target &&
                                !activeElement.closest('input[data-filter-field]') &&
                                !activeElement.closest('select')) {
                              filters.setFocusedField(null);
                            }
                          }, 200);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.stopPropagation(); }}
                        className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Фильтр"
                        style={{ height: '24px', minHeight: '24px', maxHeight: '24px', minWidth: 0, boxSizing: 'border-box' }}
                      />
                    </div>
                    <div className="flex items-center gap-1 min-h-[20px]">
                      <button
                        onClick={() => handleSort('innerId')}
                        className="flex items-center justify-center hover:text-gray-700 transition-colors flex-shrink-0"
                        style={{ width: '20px', height: '20px', minWidth: '20px', maxWidth: '20px', minHeight: '20px', maxHeight: '20px', padding: 0 }}
                      >
                        {sortField === 'innerId' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3 h-3 flex-shrink-0" />
                          ) : (
                            <ArrowDown className="w-3 h-3 flex-shrink-0" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30 flex-shrink-0" />
                        )}
                      </button>
                      <span className="text-xs font-medium text-gray-500 tracking-wider">Внутренний номер</span>
                    </div>
                </div>
              </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative" style={{ width: (filters.activeTab === 'in-work' || filters.activeTab === 'signed') ? '10%' : '11%' }}>
                  <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%' }}>
                    <div className="h-[24px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px', minWidth: 0, width: '100%' }}>
                      <div ref={filters.cfoFilterContainerRef} className="relative cfo-filter-container w-full h-full">
                        <button
                          ref={filters.cfoFilterButtonRef}
                          type="button"
                          onClick={() => filters.setIsCfoFilterOpen(!filters.isCfoFilterOpen)}
                          className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded bg-white text-left focus:ring-1 focus:ring-blue-500 focus:border-blue-500 flex items-center gap-1 hover:bg-gray-50"
                          style={{ height: '24px', minHeight: '24px', maxHeight: '24px', boxSizing: 'border-box' }}
                        >
                          <span className="text-gray-600 truncate flex-1 min-w-0 text-left">
                            {filters.cfoFilter.size === 0
                              ? 'Все'
                              : filters.cfoFilter.size === 1
                              ? (Array.from(filters.cfoFilter)[0] || 'Все')
                              : `${filters.cfoFilter.size} выбрано`}
                          </span>
                          <svg className={`w-3 h-3 transition-transform flex-shrink-0 ${filters.isCfoFilterOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {filters.isCfoFilterOpen && filters.cfoFilterPosition && (
                          <div
                            className="fixed z-50 w-64 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden"
                            style={{
                              top: `${filters.cfoFilterPosition.top}px`,
                              left: `${filters.cfoFilterPosition.left}px`,
                            }}
                          >
                            <div className="p-2 border-b border-gray-200">
                              <div className="relative">
                                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                                <input
                                  type="text"
                                  value={filters.cfoSearchQuery}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    filters.setCfoSearchQuery(e.target.value);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  onFocus={(e) => e.stopPropagation()}
                                  className="w-full pl-7 pr-2 py-1 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  placeholder="Поиск..."
                                />
                              </div>
                            </div>
                            <div className="p-2 border-b border-gray-200 flex gap-2">
                              <button
                                onClick={() => filters.handleCfoSelectAll()}
                                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                              >
                                Все
                              </button>
                              <button
                                onClick={() => filters.handleCfoDeselectAll()}
                                className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                              >
                                Снять
                              </button>
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                              {filters.getFilteredCfoOptions.length === 0 ? (
                                <div className="text-xs text-gray-500 p-2 text-center">Нет данных</div>
                              ) : (
                                filters.getFilteredCfoOptions.map((cfo) => (
                                  <label
                                    key={cfo}
                                    className="flex items-center p-2 hover:bg-gray-50 cursor-pointer"
                                  >
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
                        {sortField === 'cfo' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3 h-3 flex-shrink-0" />
                          ) : (
                            <ArrowDown className="w-3 h-3 flex-shrink-0" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30 flex-shrink-0" />
                        )}
                      </button>
                      <span className="text-xs font-medium text-gray-500 tracking-wider uppercase">ЦФО</span>
                    </div>
                </div>
              </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative" style={{ width: (filters.activeTab === 'in-work' || filters.activeTab === 'signed') ? '24%' : '27%' }}>
                  <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%' }}>
                    <div className="h-[24px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px', minWidth: 0, width: '100%' }}>
                      <input
                        key="filter-name"
                        type="text"
                        data-filter-field="name"
                        value={filters.localFilters.name ?? ''}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          const cursorPos = e.target.selectionStart ?? 0;
                          filters.handleFilterChange('name', newValue);
                          requestAnimationFrame(() => {
                            const input = e.target as HTMLInputElement;
                            if (input && document.activeElement === input) {
                              const newPos = Math.min(cursorPos, newValue.length);
                              input.setSelectionRange(newPos, newPos);
                            }
                          });
                        }}
                        onFocus={(e) => { e.stopPropagation(); filters.setFocusedField('name'); }}
                        onBlur={(e) => {
                          setTimeout(() => {
                            const activeElement = document.activeElement as HTMLElement;
                            if (activeElement &&
                                activeElement !== e.target &&
                                !activeElement.closest('input[data-filter-field]') &&
                                !activeElement.closest('select')) {
                              filters.setFocusedField(null);
                            }
                          }, 200);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.stopPropagation(); }}
                        className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Фильтр"
                        style={{ height: '24px', minHeight: '24px', maxHeight: '24px', minWidth: 0, boxSizing: 'border-box' }}
                      />
                    </div>
                    <div className="flex items-center gap-1 min-h-[20px]">
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center justify-center hover:text-gray-700 transition-colors flex-shrink-0"
                        style={{ width: '20px', height: '20px', minWidth: '20px', maxWidth: '20px', minHeight: '20px', maxHeight: '20px', padding: 0 }}
                      >
                        {sortField === 'name' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3 h-3 flex-shrink-0" />
                          ) : (
                            <ArrowDown className="w-3 h-3 flex-shrink-0" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30 flex-shrink-0" />
                        )}
                      </button>
                      <span className="text-xs font-medium text-gray-500 tracking-wider">Наименование</span>
                    </div>
                </div>
              </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative" style={{ width: '12%' }}>
                  <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%' }}>
                    <div className="h-[24px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px', minWidth: 0, width: '100%' }}>
                      <input
                        key="filter-documentForm"
                        type="text"
                        data-filter-field="documentForm"
                        value={filters.localFilters.documentForm ?? ''}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          const cursorPos = e.target.selectionStart ?? 0;
                          filters.handleFilterChange('documentForm', newValue);
                          requestAnimationFrame(() => {
                            const input = e.target as HTMLInputElement;
                            if (input && document.activeElement === input) {
                              const newPos = Math.min(cursorPos, newValue.length);
                              input.setSelectionRange(newPos, newPos);
                            }
                          });
                        }}
                        onFocus={(e) => { e.stopPropagation(); filters.setFocusedField('documentForm'); }}
                        onBlur={(e) => {
                          setTimeout(() => {
                            const activeElement = document.activeElement as HTMLElement;
                            if (activeElement &&
                                activeElement !== e.target &&
                                !activeElement.closest('input[data-filter-field]') &&
                                !activeElement.closest('select')) {
                              filters.setFocusedField(null);
                            }
                          }, 200);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.stopPropagation(); }}
                        className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Фильтр"
                        style={{ height: '24px', minHeight: '24px', maxHeight: '24px', minWidth: 0, boxSizing: 'border-box' }}
                      />
                    </div>
                    <div className="flex items-center gap-1 min-h-[20px]">
                      <button
                        onClick={() => handleSort('documentForm')}
                        className="flex items-center justify-center hover:text-gray-700 transition-colors flex-shrink-0"
                        style={{ width: '20px', height: '20px', minWidth: '20px', maxWidth: '20px', minHeight: '20px', maxHeight: '20px', padding: 0 }}
                      >
                        {sortField === 'documentForm' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3 h-3 flex-shrink-0" />
                          ) : (
                            <ArrowDown className="w-3 h-3 flex-shrink-0" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30 flex-shrink-0" />
                        )}
                      </button>
                      <span className="text-xs font-medium text-gray-500 tracking-wider">Форма документа</span>
                    </div>
                </div>
              </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative" style={{ width: '10%' }}>
                  <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%' }}>
                    <div className="h-[24px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px', minWidth: 0, width: '100%' }}>
                      <div className="flex-1" style={{ height: '24px', minHeight: '24px', maxHeight: '24px', minWidth: 0 }}></div>
                    </div>
                    <div className="flex items-center gap-1 min-h-[20px]">
                      <button
                        onClick={() => handleSort('contractCreationDate')}
                        className="flex items-center justify-center hover:text-gray-700 transition-colors flex-shrink-0"
                        style={{ width: '20px', height: '20px', minWidth: '20px', maxWidth: '20px', minHeight: '20px', maxHeight: '20px', padding: 0 }}
                      >
                        {sortField === 'contractCreationDate' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3 h-3 flex-shrink-0" />
                          ) : (
                            <ArrowDown className="w-3 h-3 flex-shrink-0" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30 flex-shrink-0" />
                        )}
                      </button>
                      <span className="text-xs font-medium text-gray-500 tracking-wider">Дата создания</span>
                    </div>
                </div>
              </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative" style={{ width: '12%' }}>
                  <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%' }}>
                    <div className="h-[24px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px', minWidth: 0, width: '100%' }}>
                      <div className="flex-1" style={{ height: '24px', minHeight: '24px', maxHeight: '24px', minWidth: 0 }}></div>
                    </div>
                    <div className="flex items-center gap-1 min-h-[20px]">
                      <button
                        onClick={() => handleSort('status')}
                        className="flex items-center justify-center hover:text-gray-700 transition-colors flex-shrink-0"
                        style={{ width: '20px', height: '20px', minWidth: '20px', maxWidth: '20px', minHeight: '20px', maxHeight: '20px', padding: 0 }}
                      >
                        {sortField === 'status' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3 h-3 flex-shrink-0" />
                          ) : (
                            <ArrowDown className="w-3 h-3 flex-shrink-0" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30 flex-shrink-0" />
                        )}
                      </button>
                      <span className="text-xs font-medium text-gray-500 tracking-wider">Статус</span>
                    </div>
                </div>
              </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative" style={{ width: (filters.activeTab === 'in-work' || filters.activeTab === 'signed') ? '11%' : '12%' }}>
                  <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%' }}>
                    <div className="h-[24px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px', minWidth: 0, width: '100%' }}>
                      <div className="flex-1" style={{ height: '24px', minHeight: '24px', maxHeight: '24px', minWidth: 0 }}></div>
                    </div>
                    <div className="flex items-center gap-1 min-h-[20px]">
                      <button
                        onClick={() => handleSort('state')}
                        className="flex items-center justify-center hover:text-gray-700 transition-colors flex-shrink-0"
                        style={{ width: '20px', height: '20px', minWidth: '20px', maxWidth: '20px', minHeight: '20px', maxHeight: '20px', padding: 0 }}
                      >
                        {sortField === 'state' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3 h-3 flex-shrink-0" />
                          ) : (
                            <ArrowDown className="w-3 h-3 flex-shrink-0" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30 flex-shrink-0" />
                        )}
                      </button>
                      <span className="text-xs font-medium text-gray-500 tracking-wider">Состояние</span>
                    </div>
                </div>
              </th>
                {(filters.activeTab === 'in-work' || filters.activeTab === 'signed') && (
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative" style={{ width: '12%' }}>
                  <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%' }}>
                    <div className="h-[24px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px', minWidth: 0, width: '100%' }}>
                      <div className="flex-1" style={{ height: '24px', minHeight: '24px', maxHeight: '24px', minWidth: 0 }}></div>
                    </div>
                    <div className="flex items-center gap-1 min-h-[20px]">
                      <span className="text-xs font-medium text-gray-500 tracking-wider">Подготовил</span>
                    </div>
                </div>
              </th>
                )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={(filters.activeTab === 'in-work' || filters.activeTab === 'signed') ? 9 : 8} className="px-6 py-8 text-center text-gray-500">
                    Загрузка...
                  </td>
                </tr>
              ) : allItems.length > 0 ? (
                allItems.map((contract) => (
                  <tr key={contract.id}>
                    <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-300 overflow-hidden">
                      <span className="block truncate" title={contract.innerId || undefined}>{contract.innerId || '-'}</span>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-300 overflow-hidden">
                      <span className="block truncate" title={contract.cfo || undefined}>{contract.cfo || '-'}</span>
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300 align-top break-words">
                      <span className="block" title={contract.name || contract.title || undefined}>
                        {contract.name || contract.title || '-'}
                      </span>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-300 overflow-hidden">
                      <span className="block truncate" title={contract.documentForm || undefined}>{contract.documentForm || '-'}</span>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-300">
                      {contract.contractCreationDate
                        ? new Date(contract.contractCreationDate).toLocaleDateString('ru-RU')
                        : '-'}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-xs border-r border-gray-300 overflow-hidden">
                      {contract.status ? (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          contract.status === 'Подписан'
                            ? 'bg-green-100 text-green-800'
                            : contract.status === 'На согласовании'
                            ? 'bg-yellow-100 text-yellow-800'
                            : contract.status === 'Не согласован'
                            ? 'bg-red-100 text-red-800'
                            : contract.status === 'Проект'
                            ? 'bg-gray-200 text-gray-700'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {contract.status}
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-gray-50 text-gray-500 rounded-full">
                          -
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-300 overflow-hidden">
                      <span className="block truncate" title={contract.state || undefined}>{contract.state || '-'}</span>
                    </td>
                    {(filters.activeTab === 'in-work' || filters.activeTab === 'signed') && (
                    <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-300 overflow-hidden">
                      <span className="block truncate" title={contract.preparedBy || undefined}>{contract.preparedBy || '-'}</span>
                    </td>
                    )}
                  </tr>
                ))
              ) : (
            <tr>
              <td colSpan={(filters.activeTab === 'in-work' || filters.activeTab === 'signed') ? 9 : 8} className="px-6 py-8 text-center text-gray-500">
                Нет данных для отображения
              </td>
            </tr>
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
    </div>
  );
}
