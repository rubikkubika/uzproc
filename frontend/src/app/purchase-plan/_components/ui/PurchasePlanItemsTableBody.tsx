'use client';

import React from 'react';
import { PurchasePlanItem, PageResponse } from '../types/purchase-plan-items.types';
import PurchasePlanItemsTableRow from './PurchasePlanItemsTableRow';

interface PurchasePlanItemsTableBodyProps {
  allItems: PurchasePlanItem[];
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
  allItems,
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
  if (!allItems || allItems.length === 0) {
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
      {allItems.map((item, index) => (
        <PurchasePlanItemsTableRow
          key={`${item.id}-${index}`}
          item={item}
          visibleColumns={visibleColumnsSet}
          columnOrder={columnOrder}
          getColumnWidth={getColumnWidth}
          editingDate={editingStates.editingDate}
          editingStatus={editingStates.editingStatus}
          editingHolding={editingStates.editingHolding}
          editingPurchaserCompany={editingStates.editingPurchaserCompany}
          editingCfo={editingStates.editingCfo}
          editingPurchaseRequestId={editingStates.editingPurchaseRequestId}
          editingPurchaseSubject={editingStates.editingPurchaseSubject}
          editingPurchaser={editingStates.editingPurchaser}
          creatingNewCfo={editingStates.creatingNewCfo}
          cfoInputValue={editingStates.cfoInputValue}
          onDateUpdate={editingHandlers.onDateUpdate}
          onStatusUpdate={editingHandlers.onStatusUpdate}
          onHoldingUpdate={editingHandlers.onHoldingUpdate}
          onPurchaserCompanyUpdate={editingHandlers.onPurchaserCompanyUpdate}
          onCfoUpdate={editingHandlers.onCfoUpdate}
          onPurchaseRequestIdUpdate={editingHandlers.onPurchaseRequestIdUpdate}
          onPurchaseSubjectUpdate={editingHandlers.onPurchaseSubjectUpdate}
          onPurchaserUpdate={editingHandlers.onPurchaserUpdate}
          setEditingDate={editingHandlers.setEditingDate}
          setEditingStatus={editingHandlers.setEditingStatus}
          setEditingHolding={editingHandlers.setEditingHolding}
          setEditingPurchaserCompany={editingHandlers.setEditingPurchaserCompany}
          setEditingCfo={editingHandlers.setEditingCfo}
          setEditingPurchaseRequestId={editingHandlers.setEditingPurchaseRequestId}
          setEditingPurchaseSubject={editingHandlers.setEditingPurchaseSubject}
          setEditingPurchaser={editingHandlers.setEditingPurchaser}
          setCreatingNewCfo={editingHandlers.setCreatingNewCfo}
          setCfoInputValue={editingHandlers.setCfoInputValue}
          availablePurchasers={editingStates.availablePurchasers}
          availableCfo={editingStates.availableCfo}
          availableHoldings={editingStates.availableHoldings}
          formatBudget={formatBudget}
          onRowClick={onRowClick}
          tempDates={tempDates}
          animatingDates={animatingDates}
          performGanttDateUpdate={performGanttDateUpdate}
          setTempDates={setTempDates}
          setAnimatingDates={setAnimatingDates}
          canEdit={canEdit}
          isViewingArchiveVersion={isViewingArchiveVersion}
        />
      ))}
    </tbody>
  );
}
