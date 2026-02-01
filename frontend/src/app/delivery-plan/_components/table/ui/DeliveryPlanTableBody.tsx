'use client';

import React from 'react';
import type { DeliveryPlanItem, DeliveryPlanTableFilters } from '../types/delivery-plan-table.types';
import { formatDate, formatAmount, getStatusColor, getStatusShort } from '../utils/delivery-plan-table.utils';

interface DeliveryPlanTableBodyProps {
  items: DeliveryPlanItem[];
  localFilters: DeliveryPlanTableFilters;
  focusedField: string | null;
  onFilterChange: (field: string, value: string) => void;
  onFocusForHeader: (field: string) => void;
  onBlurForHeader: () => void;
  onResetFilters: () => void;
}

/**
 * Компонент тела таблицы плана поставок
 * Включает заголовки колонок с фильтрами и строки с данными
 */
export default function DeliveryPlanTableBody({
  items,
  localFilters,
  focusedField,
  onFilterChange,
  onFocusForHeader,
  onBlurForHeader,
  onResetFilters,
}: DeliveryPlanTableBodyProps) {
  return (
    <div className="flex flex-col flex-1">
      {/* Кнопка сброса фильтров слева */}
      <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 flex justify-start">
        <button
          onClick={onResetFilters}
          className="px-3 py-1 text-xs font-medium bg-red-50 text-red-700 rounded-lg border border-red-300 hover:bg-red-100 hover:border-red-400 transition-colors"
        >
          Сбросить фильтры
        </button>
      </div>

      <div className="overflow-auto flex-1">
        <table className="w-full border-collapse">
        <thead className="sticky top-0 bg-gray-50 z-10">
          <tr>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 border-r border-b border-gray-300">
              <div className="flex flex-col gap-1">
                <div className="h-[24px] flex items-center gap-1">
                  <input
                    type="text"
                    data-filter-field="innerId"
                    value={localFilters.innerId}
                    onChange={(e) => {
                      const value = e.target.value;
                      const cursorPos = e.target.selectionStart || 0;
                      onFilterChange('innerId', value);
                      requestAnimationFrame(() => {
                        e.target.setSelectionRange(cursorPos, cursorPos);
                      });
                    }}
                    onFocus={() => onFocusForHeader('innerId')}
                    onBlur={onBlurForHeader}
                    placeholder="Фильтр..."
                    className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5 text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center min-h-[20px]">
                  <span>ID</span>
                </div>
              </div>
            </th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 border-r border-b border-gray-300" style={{ maxWidth: '200px' }}>
              <div className="flex flex-col gap-1">
                <div className="h-[24px] flex items-center gap-1">
                  <input
                    type="text"
                    data-filter-field="name"
                    value={localFilters.name}
                    onChange={(e) => {
                      const value = e.target.value;
                      const cursorPos = e.target.selectionStart || 0;
                      onFilterChange('name', value);
                      requestAnimationFrame(() => {
                        e.target.setSelectionRange(cursorPos, cursorPos);
                      });
                    }}
                    onFocus={() => onFocusForHeader('name')}
                    onBlur={onBlurForHeader}
                    placeholder="Фильтр..."
                    className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5 text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center min-h-[20px]">
                  <span>Название</span>
                </div>
              </div>
            </th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 border-r border-b border-gray-300">
              <div className="flex flex-col gap-1">
                <div className="h-[24px] flex items-center gap-1">
                  <input
                    type="text"
                    data-filter-field="cfo"
                    value={localFilters.cfo}
                    onChange={(e) => {
                      const value = e.target.value;
                      const cursorPos = e.target.selectionStart || 0;
                      onFilterChange('cfo', value);
                      requestAnimationFrame(() => {
                        e.target.setSelectionRange(cursorPos, cursorPos);
                      });
                    }}
                    onFocus={() => onFocusForHeader('cfo')}
                    onBlur={onBlurForHeader}
                    placeholder="Фильтр..."
                    className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5 text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center min-h-[20px]">
                  <span>ЦФО</span>
                </div>
              </div>
            </th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 border-r border-b border-gray-300">
              <div className="flex items-center min-h-[44px]">
                <span>Сумма</span>
              </div>
            </th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 border-r border-b border-gray-300">
              <div className="flex items-center min-h-[44px]">
                <span>Дата начала</span>
              </div>
            </th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 border-r border-b border-gray-300">
              <div className="flex items-center min-h-[44px]">
                <span>Дата окончания</span>
              </div>
            </th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 border-r border-b border-gray-300">
              <div className="flex flex-col gap-1">
                <div className="h-[24px] flex items-center gap-1">
                  <input
                    type="text"
                    data-filter-field="purchaseRequestId"
                    value={localFilters.purchaseRequestId}
                    onChange={(e) => {
                      const value = e.target.value;
                      const cursorPos = e.target.selectionStart || 0;
                      onFilterChange('purchaseRequestId', value);
                      requestAnimationFrame(() => {
                        e.target.setSelectionRange(cursorPos, cursorPos);
                      });
                    }}
                    onFocus={() => onFocusForHeader('purchaseRequestId')}
                    onBlur={onBlurForHeader}
                    placeholder="Фильтр..."
                    className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5 text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center min-h-[20px]">
                  <span>ID заявки</span>
                </div>
              </div>
            </th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 border-b border-gray-300">
              <div className="flex items-center min-h-[44px]">
                <span>Статус</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-2 py-4 text-center text-sm text-gray-500">
                Нет данных для отображения
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-gray-50 border-b border-gray-200"
              >
                <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300">
                  {item.innerId || '-'}
                </td>
                <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300 truncate" style={{ maxWidth: '200px' }}>
                  {item.name || '-'}
                </td>
                <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300">
                  {item.cfo || '-'}
                </td>
                <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300">
                  {formatAmount(item.budgetAmount)}
                </td>
                <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300">
                  {formatDate(item.plannedDeliveryStartDate)}
                </td>
                <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300">
                  {formatDate(item.plannedDeliveryEndDate)}
                </td>
                <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300">
                  {item.purchaseRequestId || '-'}
                </td>
                <td className="px-2 py-2 text-xs">
                  {item.status && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(item.status)}`}>
                      {getStatusShort(item.status)}
                    </span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
