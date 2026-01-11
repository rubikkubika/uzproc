'use client';

import React from 'react';
import { PurchasePlanItem, PageResponse } from '../types/purchase-plan-items.types';
import PurchasePlanItemsTableRow from './PurchasePlanItemsTableRow';

interface PurchasePlanItemsTableBodyProps {
  data: PageResponse | null;
  visibleColumns: string[];
  columnOrder: string[];
  getColumnWidth: (columnKey: string) => number;
  // Пропсы для редактирования (передаются в Row)
  editingStates: any;
  editingHandlers: any;
  // Пропсы для форматирования
  formatBudget: (amount: number | null) => string;
  getCompanyLogoPath: (company: string | null) => string | null;
  getPurchaseRequestStatusColor: (status: string | null) => string;
  // Обработчики
  onRowClick?: (item: PurchasePlanItem) => void;
  onCellClick?: (item: PurchasePlanItem, field: string) => void;
  // Пропсы для GanttChart
  tempDates?: Record<number, { requestDate: string | null; newContractDate: string | null }>;
  animatingDates?: Record<number, boolean>;
  performGanttDateUpdate?: (itemId: number, requestDate: string | null, newContractDate: string | null) => Promise<void>;
  setTempDates?: (updater: (prev: Record<number, { requestDate: string | null; newContractDate: string | null }>) => Record<number, { requestDate: string | null; newContractDate: string | null }>) => void;
  setAnimatingDates?: (updater: (prev: Record<number, boolean>) => Record<number, boolean>) => void;
  setEditingDate?: (date: { itemId: number; field: 'requestDate' } | null) => void;
  canEdit?: boolean;
  isViewingArchiveVersion?: boolean;
}

/**
 * Компонент тела таблицы плана закупок
 * Отображает строки таблицы с данными
 */
export default function PurchasePlanItemsTableBody({
  data,
  visibleColumns,
  columnOrder,
  getColumnWidth,
  editingStates,
  editingHandlers,
  formatBudget,
  getCompanyLogoPath,
  getPurchaseRequestStatusColor,
  onRowClick,
  onCellClick,
  tempDates,
  animatingDates,
  performGanttDateUpdate,
  setTempDates,
  setAnimatingDates,
  setEditingDate,
  canEdit,
  isViewingArchiveVersion,
}: PurchasePlanItemsTableBodyProps) {
  if (!data || !data.content || data.content.length === 0) {
    return (
      <tbody className="bg-white divide-y divide-gray-200">
        <tr>
          <td colSpan={visibleColumns.length} className="px-4 py-8 text-center text-sm text-gray-500">
            Нет данных для отображения
          </td>
        </tr>
      </tbody>
    );
  }

  // Преобразуем массив visibleColumns в Set для Row
  const visibleColumnsSet = new Set(visibleColumns);

  return (
    <tbody className="bg-white divide-y divide-gray-200">
      {data.content.map((item, index) => (
        <PurchasePlanItemsTableRow
          key={`${item.id}-${index}`}
          item={item}
          visibleColumns={visibleColumnsSet}
          columnOrder={columnOrder}
          getColumnWidth={getColumnWidth}
          editingDate={editingStates.editingDate}
          editingStatus={editingStates.editingStatus}
          editingHolding={editingStates.editingHolding}
          editingCompany={editingStates.editingCompany}
          editingPurchaserCompany={editingStates.editingPurchaserCompany}
          editingCfo={editingStates.editingCfo}
          editingPurchaseRequestId={editingStates.editingPurchaseRequestId}
          editingPurchaseSubject={editingStates.editingPurchaseSubject}
          editingPurchaser={editingStates.editingPurchaser}
          onDateUpdate={editingHandlers.onDateUpdate}
          onStatusUpdate={editingHandlers.onStatusUpdate}
          formatBudget={formatBudget}
          onRowClick={onRowClick}
          tempDates={tempDates}
          animatingDates={animatingDates}
          performGanttDateUpdate={performGanttDateUpdate}
          setTempDates={setTempDates}
          setAnimatingDates={setAnimatingDates}
          setEditingDate={setEditingDate}
          canEdit={canEdit}
          isViewingArchiveVersion={isViewingArchiveVersion}
        />
      ))}
    </tbody>
  );
}
