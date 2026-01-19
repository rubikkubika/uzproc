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
  // Пропсы для редактирования - состояния
  editingDate: { itemId: number; field: 'requestDate' } | null;
  editingStatus: number | null;
  editingHolding: number | null;
  editingPurchaserCompany: number | null;
  editingCfo: number | null;
  editingPurchaseRequestId: number | null;
  editingPurchaseSubject: number | null;
  editingPurchaser: number | null;
  creatingNewCfo?: number | null;
  cfoInputValue?: Record<number, string>;
  // Пропсы для редактирования - обработчики обновления
  onDateUpdate?: (itemId: number, field: 'requestDate', newDate: string) => void;
  onStatusUpdate?: (itemId: number, newStatus: string) => void;
  onHoldingUpdate?: (itemId: number, newHolding: string | null) => void;
  onPurchaserCompanyUpdate?: (itemId: number, newPurchaserCompany: string | null) => void;
  onCfoUpdate?: (itemId: number, newCfo: string | null) => void;
  onPurchaseRequestIdUpdate?: (itemId: number, newPurchaseRequestId: string | null) => void;
  onPurchaseSubjectUpdate?: (itemId: number, newPurchaseSubject: string) => void;
  onPurchaserUpdate?: (itemId: number, newPurchaserId: number | null) => void;
  // Пропсы для редактирования - установка состояний редактирования
  setEditingDate?: (date: { itemId: number; field: 'requestDate' } | null) => void;
  setEditingStatus?: (itemId: number | null) => void;
  setEditingHolding?: (itemId: number | null) => void;
  setEditingPurchaserCompany?: (itemId: number | null) => void;
  setEditingCfo?: (itemId: number | null) => void;
  setEditingPurchaseRequestId?: (itemId: number | null) => void;
  setEditingPurchaseSubject?: (itemId: number | null) => void;
  setEditingPurchaser?: (itemId: number | null) => void;
  setCreatingNewCfo?: (itemId: number | null) => void;
  setCfoInputValue?: (updater: (prev: Record<number, string>) => Record<number, string>) => void;
  // Пропсы для доступных значений
  availablePurchasers?: Array<{ id: number; name: string }>;
  availableCfo?: string[];
  availableHoldings?: string[];
  // Пропсы для GanttChart
  tempDates?: Record<number, { requestDate: string | null; newContractDate: string | null }>;
  animatingDates?: Record<number, boolean>;
  performGanttDateUpdate?: (itemId: number, requestDate: string | null, newContractDate: string | null) => Promise<void>;
  setTempDates?: (updater: (prev: Record<number, { requestDate: string | null; newContractDate: string | null }>) => Record<number, { requestDate: string | null; newContractDate: string | null }>) => void;
  setAnimatingDates?: (updater: (prev: Record<number, boolean>) => Record<number, boolean>) => void;
  canEdit?: boolean;
  isViewingArchiveVersion?: boolean;
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
  editingPurchaserCompany,
  editingCfo,
  editingPurchaseRequestId,
  editingPurchaseSubject,
  editingPurchaser,
  creatingNewCfo,
  cfoInputValue,
  onDateUpdate,
  onStatusUpdate,
  onHoldingUpdate,
  onPurchaserCompanyUpdate,
  onCfoUpdate,
  onPurchaseRequestIdUpdate,
  onPurchaseSubjectUpdate,
  onPurchaserUpdate,
  setEditingDate,
  setEditingStatus,
  setEditingHolding,
  setEditingPurchaserCompany,
  setEditingCfo,
  setEditingPurchaseRequestId,
  setEditingPurchaseSubject,
  setEditingPurchaser,
  setCreatingNewCfo,
  setCfoInputValue,
  availablePurchasers = [],
  availableCfo = [],
  availableHoldings = [],
  tempDates,
  animatingDates,
  performGanttDateUpdate,
  setTempDates,
  setAnimatingDates,
  canEdit = false,
  isViewingArchiveVersion = false,
}: PurchasePlanItemsTableRowProps) {
  const isInactive = item.status === 'Исключена';
  const hasPurchaseRequest = item.purchaseRequestId !== null && item.purchaseRequestId !== undefined;
  // Если позиция связана с заявкой, все поля неактивны, кроме purchaseRequestId
  // purchaseRequestId всегда можно редактировать
  const isReadOnly = hasPurchaseRequest;
  
  const renderCell = (columnKey: string) => {
    const width = getColumnWidth(columnKey);
    
    switch (columnKey) {
      case 'id':
        return (
          <td
            key={columnKey}
            className="px-2 py-2 text-gray-900 border-r border-gray-300 whitespace-nowrap"
            style={{ width: `${width}px`, fontSize: '13.44px' }}
          >
            {item.id}
          </td>
        );
      
      case 'company':
        const companyLogo = getCompanyLogoPath(item.company);
        return (
          <td
            key={columnKey}
            className={`px-2 py-2 border-r border-gray-300 whitespace-nowrap relative ${isInactive ? 'text-gray-500' : 'text-gray-900'}`}
            style={{ width: `${width}px`, fontSize: '16.8px' }}
          >
            <div className="flex items-center gap-1.5">
              {companyLogo && (
                <img src={companyLogo} alt={item.company || ''} style={{ width: '22.4px', height: '22.4px' }} />
              )}
              <span className={`rounded px-2 py-0.5 font-medium ${
                isInactive
                  ? 'bg-gray-100 text-gray-500'
                  : 'bg-gray-100 text-gray-800'
              }`} style={{ fontSize: '16.8px' }}>
                {item.company || '-'}
              </span>
            </div>
          </td>
        );
      
      case 'purchaseSubject':
        return (
          <td
            key={columnKey}
            className={`px-2 py-2 border-r border-gray-300 relative ${isInactive ? 'text-gray-500' : 'text-gray-900'}`}
            style={{ 
              width: `${width}px`, 
              fontSize: '13.44px',
              whiteSpace: 'normal',
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              wordBreak: 'break-word'
            }}
          >
            {editingPurchaseSubject === item.id ? (
              <textarea
                defaultValue={item.purchaseSubject || ''}
                onBlur={(e) => {
                  const newValue = e.target.value.trim();
                  if (canEdit && newValue !== (item.purchaseSubject || '')) {
                    onPurchaseSubjectUpdate?.(item.id, newValue);
                  } else {
                    setEditingPurchaseSubject?.(null);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    if (canEdit) {
                      const newValue = e.currentTarget.value.trim();
                      if (newValue !== (item.purchaseSubject || '')) {
                        onPurchaseSubjectUpdate?.(item.id, newValue);
                      } else {
                        setEditingPurchaseSubject?.(null);
                      }
                    }
                  } else if (e.key === 'Escape') {
                    setEditingPurchaseSubject?.(null);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                onFocus={(e) => {
                  e.stopPropagation();
                  if (canEdit) {
                    setEditingPurchaseSubject?.(item.id);
                    const textarea = e.target as HTMLTextAreaElement;
                    textarea.style.height = 'auto';
                    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
                  }
                }}
                onChange={(e) => {
                  const textarea = e.target as HTMLTextAreaElement;
                  textarea.style.height = 'auto';
                  textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
                }}
                className="w-full text-gray-900 bg-white border border-blue-500 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none overflow-hidden"
                disabled={isInactive || !canEdit || isReadOnly}
                autoFocus
                rows={1}
                style={{ minHeight: '20px', maxHeight: '200px', fontSize: '13.44px' }}
              />
            ) : (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isInactive && !isViewingArchiveVersion && canEdit && !isReadOnly) {
                    setEditingPurchaseSubject?.(item.id);
                  }
                }}
                className={isInactive || !canEdit || isReadOnly ? 'break-words' : 'cursor-pointer hover:bg-blue-50 rounded px-1 py-0.5 transition-colors break-words'}
                style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}
                title={isInactive || !canEdit || isReadOnly ? '' : 'Нажмите для редактирования'}
              >
                {item.purchaseSubject || '-'}
              </div>
            )}
          </td>
        );
      
      case 'budgetAmount':
        return (
          <td
            key={columnKey}
            className="px-2 py-2 text-gray-900 border-r border-gray-300 whitespace-nowrap text-right"
            style={{ width: `${width}px`, fontSize: '13.44px' }}
          >
            {formatBudget(item.budgetAmount)}
          </td>
        );
      
      case 'requestDate':
        // Отображаем GanttChart для колонки requestDate
        const tempDate = tempDates?.[item.id];
        const requestDate = tempDate?.requestDate ?? item.requestDate;
        const newContractDate = tempDate?.newContractDate ?? item.newContractDate;
        
        return (
          <td
            key={columnKey}
            className="px-2 py-2 border-r border-gray-300"
            style={{ width: '350px', minWidth: '350px', fontSize: '13.44px', contain: 'layout style paint' }}
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
                disabled={isInactive || isViewingArchiveVersion || !canEdit || isReadOnly}
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
            className="px-2 py-2 text-gray-900 border-r border-gray-300 whitespace-nowrap"
            style={{ width: `${width}px`, fontSize: '13.44px' }}
          >
            {item.newContractDate 
              ? new Date(item.newContractDate).toLocaleDateString('ru-RU')
              : '-'}
          </td>
        );
      
      case 'contractEndDate':
        // Для contractEndDate показываем обычную дату
        return (
          <td
            key={columnKey}
            className="px-2 py-2 text-gray-900 border-r border-gray-300 whitespace-nowrap"
            style={{ width: `${width}px`, fontSize: '13.44px' }}
          >
            {item.contractEndDate 
              ? new Date(item.contractEndDate).toLocaleDateString('ru-RU')
              : '-'}
          </td>
        );
      
      case 'purchaseRequestStatus':
        // Для purchaseRequestStatus показываем статус заявки с цветом
        const requestStatusColor = item.purchaseRequestStatus 
          ? getPurchaseRequestStatusColor(item.purchaseRequestStatus)
          : 'bg-gray-100 text-gray-800';
        return (
          <td
            key={columnKey}
            className="px-2 py-2 border-r border-gray-300 whitespace-nowrap"
            style={{ width: `${width}px`, fontSize: '13.44px' }}
          >
            {item.purchaseRequestStatus ? (
              <span className={`rounded px-2 py-0.5 font-medium ${requestStatusColor}`} style={{ fontSize: '13.44px' }}>
                {item.purchaseRequestStatus}
              </span>
            ) : '-'}
          </td>
        );
      
      case 'comment':
        // Для comment показываем текст с возможностью переноса
        return (
          <td
            key={columnKey}
            className="px-2 py-2 text-gray-900 border-r border-gray-300"
            style={{ 
              width: `${width}px`, 
              fontSize: '13.44px',
              whiteSpace: 'normal',
              wordWrap: 'break-word',
              overflowWrap: 'break-word'
            }}
          >
            {item.comment || '-'}
          </td>
        );
      
      case 'purchaserCompany':
        const purchaserCompanyLogo = getCompanyLogoPath(item.purchaserCompany);
        return (
          <td
            key={columnKey}
            className={`px-2 py-2 border-r border-gray-300 whitespace-nowrap relative ${isInactive ? 'text-gray-500' : 'text-gray-900'}`}
            style={{ width: `${width}px`, fontSize: '16.8px' }}
          >
            {editingPurchaserCompany === item.id ? (
              <select
                value={item.purchaserCompany || ''}
                disabled={isInactive || isViewingArchiveVersion || !canEdit || isReadOnly}
                onChange={(e) => {
                  if (canEdit && !isReadOnly && e.target.value !== item.purchaserCompany) {
                    onPurchaserCompanyUpdate?.(item.id, e.target.value || null);
                  }
                }}
                onFocus={(e) => {
                  e.stopPropagation();
                  if (canEdit) {
                    setEditingPurchaserCompany?.(item.id);
                  }
                }}
                onBlur={() => {
                  setTimeout(() => {
                    setEditingPurchaserCompany?.(null);
                  }, 200);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setEditingPurchaserCompany?.(null);
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (canEdit) {
                    setEditingPurchaserCompany?.(item.id);
                  }
                }}
                className={`rounded px-2 py-0.5 font-medium cursor-pointer transition-all w-full ${
                  isInactive
                    ? 'bg-gray-100 text-gray-500 border-0 cursor-not-allowed'
                    : 'border border-blue-500 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500'
                }`}
                style={{ fontSize: '16.8px' }}
                autoFocus
              >
                <option value="">Не выбрано</option>
                <option value="Market">Market</option>
                <option value="Holding">Holding</option>
                <option value="Tezkor">Tezkor</option>
              </select>
            ) : (
              <div 
                className={`flex items-center gap-1.5 ${isInactive || !canEdit ? '' : 'cursor-pointer hover:bg-blue-50 rounded px-1 py-0.5 transition-colors'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isInactive && !isViewingArchiveVersion && canEdit && !isReadOnly) {
                    setEditingPurchaserCompany?.(item.id);
                  }
                }}
                title={isInactive || !canEdit || isReadOnly ? '' : 'Нажмите для редактирования'}
              >
                {purchaserCompanyLogo && (
                  <img src={purchaserCompanyLogo} alt={item.purchaserCompany || ''} style={{ width: '22.4px', height: '22.4px' }} />
                )}
                <span className={`rounded px-2 py-0.5 font-medium ${
                  isInactive
                    ? 'bg-gray-100 text-gray-500'
                    : 'bg-gray-100 text-gray-800'
                }`} style={{ fontSize: '16.8px' }}>
                  {item.purchaserCompany || '-'}
                </span>
              </div>
            )}
          </td>
        );
      
      case 'purchaser':
        return (
          <td
            key={columnKey}
            className={`px-2 py-2 border-r border-gray-300 whitespace-nowrap ${isInactive ? 'text-gray-500' : 'text-gray-900'}`}
            style={{ width: `${width}px`, fontSize: '13.44px' }}
          >
            {editingPurchaser === item.id ? (
              <select
                value={(() => {
                  // Находим ID пользователя по имени (item.purchaser - это строка "Фамилия Имя")
                  if (!item.purchaser || !availablePurchasers || availablePurchasers.length === 0) {
                    return '';
                  }
                  const foundUser = availablePurchasers.find(u => u.name === item.purchaser);
                  return foundUser ? foundUser.id.toString() : '';
                })()}
                disabled={isInactive || isViewingArchiveVersion || !canEdit || isReadOnly}
                onChange={(e) => {
                  e.stopPropagation();
                  if (!isReadOnly) {
                    const newValue = e.target.value;
                    if (newValue === '') {
                      onPurchaserUpdate?.(item.id, null);
                    } else {
                      const purchaserId = parseInt(newValue, 10);
                      if (!isNaN(purchaserId)) {
                        onPurchaserUpdate?.(item.id, purchaserId);
                      }
                    }
                  }
                }}
                onBlur={() => {
                  setTimeout(() => {
                    setEditingPurchaser?.(null);
                  }, 200);
                }}
                onClick={(e) => e.stopPropagation()}
                onFocus={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setEditingPurchaser?.(null);
                  }
                  e.stopPropagation();
                }}
                autoFocus
                className="w-full text-gray-900 border border-gray-300 rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                style={{ fontSize: '13.44px' }}
              >
                <option value="">Не назначен</option>
                {availablePurchasers.length > 0 ? (
                  availablePurchasers.map((purchaser) => (
                    <option key={purchaser.id} value={purchaser.id}>
                      {purchaser.name}
                    </option>
                  ))
                ) : (
                  <option disabled>Загрузка пользователей...</option>
                )}
              </select>
            ) : (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isInactive && !isViewingArchiveVersion && canEdit && !isReadOnly) {
                    setEditingPurchaser?.(item.id);
                  }
                }}
                className={isInactive || !canEdit || isReadOnly ? 'truncate' : 'cursor-pointer hover:bg-blue-50 rounded px-1 py-0.5 transition-colors truncate'}
                title={isInactive || !canEdit || isReadOnly ? '' : 'Нажмите для редактирования'}
              >
                {item.purchaser || '-'}
              </div>
            )}
          </td>
        );
      
      case 'cfo':
        return (
          <td
            key={columnKey}
            className={`px-2 py-2 border-r border-gray-300 whitespace-nowrap relative ${isInactive ? 'text-gray-500' : 'text-gray-900'}`}
            style={{ width: `${width}px`, fontSize: '13.44px' }}
          >
            {creatingNewCfo === item.id ? (
              <input
                type="text"
                value={cfoInputValue?.[item.id] || ''}
                disabled={isInactive || isViewingArchiveVersion || !canEdit || isReadOnly}
                onChange={(e) => {
                  if (!isReadOnly) {
                    setCfoInputValue?.(prev => ({ ...prev, [item.id]: e.target.value }));
                  }
                }}
                onBlur={(e) => {
                  const newValue = e.target.value.trim();
                  if (newValue && canEdit && !isReadOnly) {
                    onCfoUpdate?.(item.id, newValue);
                  }
                  setCreatingNewCfo?.(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const newValue = e.currentTarget.value.trim();
                    if (newValue && canEdit && !isReadOnly) {
                      onCfoUpdate?.(item.id, newValue);
                    }
                    setCreatingNewCfo?.(null);
                  } else if (e.key === 'Escape') {
                    setCreatingNewCfo?.(null);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className={`rounded px-2 py-0.5 font-medium transition-all w-full ${
                  isInactive || isReadOnly
                    ? 'bg-gray-100 text-gray-500 border-0 cursor-not-allowed'
                    : 'border border-blue-500 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500'
                }`}
                style={{ fontSize: '13.44px' }}
                placeholder="Введите новое ЦФО"
                autoFocus
              />
            ) : (
              <select
                value={item.cfo || ''}
                disabled={isInactive || isViewingArchiveVersion || !canEdit || isReadOnly}
                onChange={(e) => {
                  e.stopPropagation();
                  if (e.target.value === '__CREATE_NEW__') {
                    setCreatingNewCfo?.(item.id);
                    setCfoInputValue?.(prev => ({ ...prev, [item.id]: '' }));
                    setEditingCfo?.(null);
                  } else if (canEdit && !isReadOnly && e.target.value !== item.cfo) {
                    onCfoUpdate?.(item.id, e.target.value || null);
                  }
                }}
                onMouseDown={(e) => {
                  if (!isInactive && !isViewingArchiveVersion && !isReadOnly) {
                    e.stopPropagation();
                    setEditingCfo?.(item.id);
                  }
                }}
                onFocus={(e) => {
                  e.stopPropagation();
                  setEditingCfo?.(item.id);
                }}
                onBlur={() => {
                  setTimeout(() => {
                    setEditingCfo?.(null);
                  }, 200);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setEditingCfo?.(null);
                  }
                }}
                className={`rounded px-2 py-0.5 font-medium cursor-pointer transition-all w-full ${
                  isInactive
                    ? 'bg-gray-100 text-gray-500 border-0 cursor-not-allowed'
                    : editingCfo === item.id
                    ? 'border border-blue-500 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500'
                    : 'bg-gray-100 text-gray-800 border-0'
                }`}
                style={{
                  fontSize: '13.44px',
                  ...(isInactive || editingCfo === item.id ? {} : {
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    paddingRight: '20px',
                    backgroundImage: item.cfo ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E")` : 'none',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 4px center',
                    backgroundSize: '12px',
                  })
                }}
              >
                <option value="">-</option>
                {!isReadOnly && (
                  <option value="__CREATE_NEW__" style={{ fontStyle: 'italic', color: '#3b82f6' }}>
                    + Создать новое ЦФО...
                  </option>
                )}
                {availableCfo
                  .slice()
                  .sort((a, b) => a.localeCompare(b, 'ru', { sensitivity: 'base' }))
                  .map((cfo) => (
                    <option key={cfo} value={cfo}>
                      {cfo}
                    </option>
                  ))}
              </select>
            )}
          </td>
        );
      
      case 'status':
        const hasPurchaseRequest = item.purchaseRequestId !== null;
        const displayStatus = hasPurchaseRequest && item.purchaseRequestStatus 
          ? item.purchaseRequestStatus 
          : (hasPurchaseRequest ? 'Заявка' : item.status);
        const isFromPurchaseRequest = hasPurchaseRequest;
        
        // Определяем цвет статуса
        let statusColor: string;
        if (editingStatus === item.id) {
          statusColor = 'border border-blue-500 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500';
        } else if (displayStatus === 'В плане') {
          statusColor = 'bg-blue-100 text-blue-800 border-0';
        } else if (displayStatus === 'Исключена') {
          statusColor = 'bg-red-100 text-red-800 border-0';
        } else if (displayStatus === 'Проект') {
          statusColor = 'bg-blue-100 text-blue-800 border-0';
        } else if (isFromPurchaseRequest && item.purchaseRequestStatus) {
          statusColor = getPurchaseRequestStatusColor(item.purchaseRequestStatus);
        } else {
          statusColor = 'bg-gray-100 text-gray-800 border-0';
        }
        
        return (
          <td
            key={columnKey}
            className="px-2 py-2 border-r border-gray-300 whitespace-nowrap relative"
            style={{ width: `${width}px`, fontSize: '13.44px' }}
          >
            <select
              value={displayStatus || ''}
              onChange={(e) => {
                e.stopPropagation();
                if (canEdit && !isReadOnly && e.target.value !== displayStatus) {
                  onStatusUpdate?.(item.id, e.target.value);
                }
              }}
              onFocus={(e) => {
                e.stopPropagation();
                if (canEdit && !isReadOnly) {
                  setEditingStatus?.(item.id);
                }
              }}
              onBlur={() => {
                setTimeout(() => {
                  setEditingStatus?.(null);
                }, 200);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setEditingStatus?.(null);
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (canEdit && !isReadOnly) {
                  setEditingStatus?.(item.id);
                }
              }}
              disabled={isReadOnly}
              className={`rounded px-2 py-0.5 font-medium cursor-pointer transition-all ${statusColor}`}
              style={{
                fontSize: '13.44px',
                ...(editingStatus === item.id ? {} : {
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  paddingRight: '20px',
                  width: '100%',
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  backgroundImage: displayStatus ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E")` : 'none',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 4px center',
                  backgroundSize: '12px',
                })
              }}
            >
              <option value="">-</option>
              {hasPurchaseRequest ? (
                // Если есть заявка, показываем статус заявки (disabled) и можно выбрать только "Исключена"
                <>
                  <option value={displayStatus || ''} disabled>{displayStatus}</option>
                  <option value="Исключена">Исключена</option>
                </>
              ) : (
                // Если нет заявки, можно выбрать все статусы
                <>
                  <option value="Проект">Проект</option>
                  <option value="В плане">В плане</option>
                  <option value="Исключена">Исключена</option>
                  <option value="Заявка">Заявка</option>
                  <option value="Пусто">Пусто</option>
                </>
              )}
            </select>
          </td>
        );
      
      case 'purchaseRequestId':
        // purchaseRequestId всегда можно редактировать, даже если оно уже установлено
        const canEditPurchaseRequestId = canEdit && !isInactive && !isViewingArchiveVersion;
        return (
          <td
            key={columnKey}
            className={`px-2 py-2 border-r border-gray-300 whitespace-nowrap ${isInactive ? 'text-gray-500' : 'text-gray-900'}`}
            style={{ width: `${width}px`, fontSize: '13.44px' }}
          >
            {editingPurchaseRequestId === item.id ? (
              <input
                type="number"
                defaultValue={item.purchaseRequestId?.toString() || ''}
                onBlur={(e) => {
                  const newValue = e.target.value.trim();
                  const currentValue = item.purchaseRequestId?.toString() || '';
                  if (canEditPurchaseRequestId && newValue !== currentValue) {
                    onPurchaseRequestIdUpdate?.(item.id, newValue || null);
                  } else {
                    setEditingPurchaseRequestId?.(null);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  } else if (e.key === 'Escape') {
                    setEditingPurchaseRequestId?.(null);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                onFocus={(e) => {
                  e.stopPropagation();
                  if (canEditPurchaseRequestId) {
                    setEditingPurchaseRequestId?.(item.id);
                  }
                }}
                className="w-full text-gray-900 bg-white border border-blue-500 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                style={{ fontSize: '13.44px' }}
                disabled={!canEditPurchaseRequestId}
                autoFocus
              />
            ) : (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  if (canEditPurchaseRequestId) {
                    setEditingPurchaseRequestId?.(item.id);
                  }
                }}
                className={!canEditPurchaseRequestId ? '' : 'cursor-pointer hover:bg-blue-50 rounded px-1 py-0.5 transition-colors'}
                title={!canEditPurchaseRequestId ? '' : 'Нажмите для редактирования'}
              >
                {item.purchaseRequestId || '-'}
              </div>
            )}
          </td>
        );
      
      case 'details':
        return (
          <td
            key={columnKey}
            className="px-2 py-2 border-r border-gray-300 whitespace-nowrap text-center"
            style={{ width: `${width}px`, fontSize: '13.44px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRowClick?.(item);
              }}
              className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              style={{ fontSize: '9.408px' }}
              title="Открыть детали"
            >
              Открыть
            </button>
          </td>
        );
      
      default:
        // Для остальных колонок просто отображаем значение
        const value = item[columnKey as keyof PurchasePlanItem];
        // Определяем размер шрифта: для company и purchaserCompany оставляем 16.8px, для остальных 13.44px
        const fontSize = (columnKey === 'company' || columnKey === 'purchaserCompany') ? '16.8px' : '13.44px';
        return (
          <td
            key={columnKey}
            className="px-2 py-2 text-gray-900 border-r border-gray-300 whitespace-nowrap"
            style={{ width: `${width}px`, fontSize }}
          >
            {value !== null && value !== undefined ? String(value) : '-'}
          </td>
        );
    }
  };

  return (
    <tr className={`${isReadOnly ? 'bg-gray-100 opacity-75' : 'hover:bg-gray-50'}`}>
      {columnOrder.map(col => renderCell(col))}
    </tr>
  );
}
