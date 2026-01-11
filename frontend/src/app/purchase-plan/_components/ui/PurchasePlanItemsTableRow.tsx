'use client';

import React from 'react';
import { PurchasePlanItem } from '../types/purchase-plan-items.types';
import { getCompanyLogoPath, getPurchaseRequestStatusColor } from '../utils/purchase-plan-items.utils';
import GanttChart from '../GanttChart';
import { calculateNewContractDate } from '../utils/date.utils';

interface PurchasePlanItemsTableRowProps {
  item: PurchasePlanItem;
  visibleColumns: Set<string>;
  columnOrder: string[];
  getColumnWidth: (columnKey: string) => number;
  formatBudget: (amount: number | null) => string;
  onRowClick?: (item: PurchasePlanItem) => void;
  // Пропсы для редактирования
  editingDate: { itemId: number; field: 'requestDate' } | null;
  editingStatus: number | null;
  editingHolding: number | null;
  editingCompany: number | null;
  editingPurchaserCompany: number | null;
  editingCfo: number | null;
  editingPurchaseRequestId: number | null;
  editingPurchaseSubject: number | null;
  editingPurchaser: number | null;
  onDateUpdate?: (itemId: number, field: 'requestDate', newDate: string) => void;
  onStatusUpdate?: (itemId: number, newStatus: string) => void;
  // Пропсы для GanttChart
  tempDates?: Record<number, { requestDate: string | null; newContractDate: string | null }>;
  animatingDates?: Record<number, boolean>;
  performGanttDateUpdate?: (itemId: number, requestDate: string | null, newContractDate: string | null) => Promise<void>;
  setTempDates?: (updater: (prev: Record<number, { requestDate: string | null; newContractDate: string | null }>) => Record<number, { requestDate: string | null; newContractDate: string | null }>) => void;
  setAnimatingDates?: (updater: (prev: Record<number, boolean>) => Record<number, boolean>) => void;
  setEditingDate?: (date: { itemId: number; field: 'requestDate' } | null) => void;
  canEdit?: boolean;
  isViewingArchiveVersion?: boolean;
  // ... другие обработчики редактирования
}

/**
 * Компонент строки таблицы плана закупок
 * Отображает одну строку с данными и поддерживает inline редактирование
 */
export default function PurchasePlanItemsTableRow({
  item,
  visibleColumns,
  columnOrder,
  getColumnWidth,
  formatBudget,
  onRowClick,
  editingDate,
  editingStatus,
  editingHolding,
  editingCompany,
  editingPurchaserCompany,
  editingCfo,
  editingPurchaseRequestId,
  editingPurchaseSubject,
  editingPurchaser,
  onDateUpdate,
  onStatusUpdate,
  tempDates,
  animatingDates,
  performGanttDateUpdate,
  setTempDates,
  setAnimatingDates,
  setEditingDate,
  canEdit = false,
  isViewingArchiveVersion = false,
}: PurchasePlanItemsTableRowProps) {
  const renderCell = (columnKey: string) => {
    const width = getColumnWidth(columnKey);
    
    switch (columnKey) {
      case 'id':
        return (
          <td
            key={columnKey}
            className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300 whitespace-nowrap"
            style={{ width: `${width}px` }}
          >
            {item.id}
          </td>
        );
      
      case 'company':
        const companyLogo = getCompanyLogoPath(item.company);
        return (
          <td
            key={columnKey}
            className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300 whitespace-nowrap"
            style={{ width: `${width}px` }}
          >
            <div className="flex items-center gap-2">
              {companyLogo && (
                <img src={companyLogo} alt={item.company || ''} className="w-4 h-4" />
              )}
              <span>{item.company || '-'}</span>
            </div>
          </td>
        );
      
      case 'purchaseSubject':
        return (
          <td
            key={columnKey}
            className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300"
            style={{ width: `${width}px` }}
          >
            {item.purchaseSubject || '-'}
          </td>
        );
      
      case 'budgetAmount':
        return (
          <td
            key={columnKey}
            className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300 whitespace-nowrap text-right"
            style={{ width: `${width}px` }}
          >
            {formatBudget(item.budgetAmount)}
          </td>
        );
      
      case 'requestDate':
        // Отображаем GanttChart для колонки requestDate
        const isInactive = item.status === 'Исключена';
        const tempDate = tempDates?.[item.id];
        const requestDate = tempDate?.requestDate ?? item.requestDate;
        const newContractDate = tempDate?.newContractDate ?? item.newContractDate;
        
        return (
          <td
            key={columnKey}
            className="px-2 py-2 text-xs border-r border-gray-300"
            style={{ width: '350px', minWidth: '350px', contain: 'layout style paint' }}
            data-gantt-chart="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full overflow-hidden" style={{ contain: 'layout style paint' }}>
              <GanttChart
                itemId={item.id}
                year={item.year}
                requestDate={requestDate}
                newContractDate={newContractDate}
                contractEndDate={item.contractEndDate}
                currentContractEndDate={item.currentContractEndDate}
                disabled={isInactive || isViewingArchiveVersion || !canEdit}
                onDragStart={() => {
                  // Закрываем режим редактирования даты при начале перетаскивания Ганта
                  if (editingDate?.itemId === item.id) {
                    setEditingDate?.(null);
                  }
                }}
                onDatesChange={(requestDate, newContractDate) => {
                  // Обновляем временные даты при перетаскивании
                  if (setTempDates) {
                    setTempDates(prev => ({
                      ...prev,
                      [item.id]: { requestDate, newContractDate }
                    }));
                  }
                  // Запускаем анимацию
                  if (setAnimatingDates) {
                    setAnimatingDates(prev => ({
                      ...prev,
                      [item.id]: true
                    }));
                  }
                }}
                onDatesUpdate={(requestDate, newContractDate) => {
                  // Пересчитываем newContractDate на основе requestDate и сложности
                  let finalNewContractDate = newContractDate;
                  if (item.complexity && requestDate) {
                    const calculatedDate = calculateNewContractDate(requestDate, item.complexity);
                    if (calculatedDate) {
                      finalNewContractDate = calculatedDate;
                    }
                  }
                  
                  // Сохраняем изменения
                  if (performGanttDateUpdate) {
                    performGanttDateUpdate(item.id, requestDate, finalNewContractDate);
                  }
                }}
              />
            </div>
          </td>
        );
      
      case 'newContractDate':
        // Для newContractDate показываем обычную дату
        return (
          <td
            key={columnKey}
            className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300 whitespace-nowrap"
            style={{ width: `${width}px` }}
          >
            {item.newContractDate 
              ? new Date(item.newContractDate).toLocaleDateString('ru-RU')
              : '-'}
          </td>
        );
      
      case 'status':
        const statusColor = getPurchaseRequestStatusColor(item.status);
        return (
          <td
            key={columnKey}
            className="px-2 py-2 text-xs border-r border-gray-300 whitespace-nowrap"
            style={{ width: `${width}px` }}
          >
            <span className={`px-2 py-1 rounded text-xs font-medium ${statusColor}`}>
              {item.status || 'Пусто'}
            </span>
          </td>
        );
      
      case 'purchaseRequestId':
        const requestStatusColor = getPurchaseRequestStatusColor(item.purchaseRequestStatus);
        return (
          <td
            key={columnKey}
            className="px-2 py-2 text-xs border-r border-gray-300 whitespace-nowrap"
            style={{ width: `${width}px` }}
          >
            {item.purchaseRequestId ? (
              <div className="flex flex-col gap-1">
                <span className="text-gray-900">{item.purchaseRequestId}</span>
                {item.purchaseRequestStatus && (
                  <span className={`px-1 py-0.5 rounded text-xs ${requestStatusColor}`}>
                    {item.purchaseRequestStatus}
                  </span>
                )}
              </div>
            ) : '-'}
          </td>
        );
      
      default:
        // Для остальных колонок просто отображаем значение
        const value = item[columnKey as keyof PurchasePlanItem];
        return (
          <td
            key={columnKey}
            className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300 whitespace-nowrap"
            style={{ width: `${width}px` }}
          >
            {value !== null && value !== undefined ? String(value) : '-'}
          </td>
        );
    }
  };

  return (
    <tr
      className="hover:bg-gray-50 cursor-pointer"
      onClick={() => onRowClick?.(item)}
    >
      {columnOrder
        .filter(col => visibleColumns.has(col))
        .map(col => renderCell(col))}
    </tr>
  );
}
