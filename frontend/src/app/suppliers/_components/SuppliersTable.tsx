'use client';

import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { useSuppliersTable } from './hooks/useSuppliersTable';
import { useInfiniteScroll } from './hooks/useInfiniteScroll';
import type { SortField } from './types/suppliers.types';

function FilterInput({
  field,
  value,
  onFocus,
  onChange,
  onBlur,
  onKeyDown,
  onClick,
}: {
  field: string;
  value: string;
  onFocus: () => void;
  onChange: (v: string) => void;
  onBlur: (e: React.FocusEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <input
      type="text"
      data-filter-field={field}
      value={value}
      onChange={(e) => {
        const v = e.target.value;
        const cursorPos = e.target.selectionStart ?? 0;
        onChange(v);
        requestAnimationFrame(() => {
          const input = e.target as HTMLInputElement;
          if (input && document.activeElement === input) {
            input.setSelectionRange(Math.min(cursorPos, v.length), Math.min(cursorPos, v.length));
          }
        });
      }}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      onClick={onClick}
      placeholder="Фильтр"
      className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
      style={{ height: '24px', minHeight: '24px', maxHeight: '24px', minWidth: 0, boxSizing: 'border-box' }}
    />
  );
}

function SortableHeader({
  field,
  label,
  sortField,
  sortDirection,
  onSort,
  filters,
}: {
  field: SortField;
  label: string;
  sortField: SortField;
  sortDirection: 'asc' | 'desc' | null;
  onSort: (f: SortField) => void;
  filters: ReturnType<typeof useSuppliersTable>['filters'];
}) {
  if (!field) return null;
  const localValue = filters.localFilters[field] ?? '';
  return (
    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative" style={{ width: '18%' }}>
      <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%' }}>
        <div className="h-[24px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px', minWidth: 0, width: '100%' }}>
          <FilterInput
            field={field}
            value={localValue}
            onFocus={() => filters.setFocusedField(field)}
            onChange={(v) => filters.handleFilterChange(field, v)}
            onBlur={(e) => {
              setTimeout(() => {
                const active = document.activeElement as HTMLElement;
                if (active && active !== e.target && !active.closest('input[data-filter-field]') && !active.closest('select')) {
                  filters.setFocusedField(null);
                }
              }, 200);
            }}
            onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.stopPropagation(); }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        <div className="flex items-center gap-1 min-h-[20px]">
          <button
            type="button"
            onClick={() => onSort(field)}
            className="flex items-center justify-center hover:text-gray-700 transition-colors flex-shrink-0"
            style={{ width: '20px', height: '20px', minWidth: '20px', maxWidth: '20px', minHeight: '20px', maxHeight: '20px', padding: 0 }}
          >
            {sortField === field ? (
              sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 flex-shrink-0" /> : <ArrowDown className="w-3 h-3 flex-shrink-0" />
            ) : (
              <ArrowUpDown className="w-3 h-3 opacity-30 flex-shrink-0" />
            )}
          </button>
          <span className="text-xs font-medium text-gray-500 tracking-wider">{label}</span>
        </div>
      </div>
    </th>
  );
}

export default function SuppliersTable() {
  const {
    data,
    allItems,
    loading,
    loadingMore,
    error,
    currentPage,
    pageSize,
    sortField,
    sortDirection,
    handleSort,
    handleResetFilters,
    filters,
    hasMore,
    loadMoreRef,
    fetchData,
  } = useSuppliersTable();

  const totalElements = data?.totalElements ?? 0;

  useInfiniteScroll(loadMoreRef, {
    enabled: !loading && !loadingMore && hasMore && allItems.length > 0,
    onLoadMore: () => {
      if (hasMore && !loadingMore && allItems.length > 0) {
        fetchData(currentPage + 1, pageSize, sortField, sortDirection, filters.filters, true);
      }
    },
  });

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <p className="text-red-500">Ошибка: {error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col flex-1 min-h-0">
      <div className="px-3 py-1 border-b border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-3 py-1 text-xs font-medium bg-red-50 text-red-700 rounded-lg border border-red-300 hover:bg-red-100 hover:border-red-400 transition-colors whitespace-nowrap"
          >
            Сбросить фильтры
          </button>
        </div>
        <div className="text-xs text-gray-700 flex-shrink-0">
          Показано {allItems.length} из {totalElements} записей
        </div>
      </div>

      <div className="flex-1 min-w-0 overflow-auto relative custom-scrollbar">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <SortableHeader field="type" label="Вид" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} filters={filters} />
              <SortableHeader field="kpp" label="КПП" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} filters={filters} />
              <SortableHeader field="inn" label="ИНН" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} filters={filters} />
              <SortableHeader field="code" label="Код" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} filters={filters} />
              <SortableHeader field="name" label="Наименование" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} filters={filters} />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  Загрузка...
                </td>
              </tr>
            ) : allItems.length > 0 ? (
              allItems.map((row) => (
                <tr key={row.id}>
                  <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-300">
                    {row.type ?? '-'}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-300">
                    {row.kpp ?? '-'}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-300">
                    {row.inn ?? '-'}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-300">
                    {row.code ?? '-'}
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300">
                    {row.name ?? '-'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
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
