'use client';

import React from 'react';
import { Eye, EyeOff, Check, Clock, X, Star } from 'lucide-react';
import { PurchaseRequest, TabType, Contract } from '../types/purchase-request.types';
import { getCurrencyIcon } from '../utils/currency.utils';

interface PurchaseRequestsTableRowProps {
  request: PurchaseRequest;
  index: number;
  filteredColumnOrder: string[];
  activeTab: TabType;
  getColumnWidth: (columnKey: string) => number;
  canEditExcludeFromInWork: boolean;
  userRole: string | null;
  onExcludeFromInWorkChange: (requestId: number, newValue: boolean) => Promise<void>;
  onRowClick: (request: PurchaseRequest, index: number) => void;
  onRowAuxClick: (request: PurchaseRequest, index: number) => void;
  // Для колонки "Оценка"
  onRatingClick?: (request: PurchaseRequest) => void;
  onFeedbackClick?: (request: PurchaseRequest) => void;
  onSentInvitationClick?: (request: PurchaseRequest) => void;
}

/**
 * Компонент строки таблицы заявок на закупку
 * Рендерит одну строку с данными заявки
 */
export default function PurchaseRequestsTableRow({
  request,
  index,
  filteredColumnOrder,
  activeTab,
  getColumnWidth,
  canEditExcludeFromInWork,
  userRole,
  onExcludeFromInWorkChange,
  onRowClick,
  onRowAuxClick,
  onRatingClick,
  onFeedbackClick,
  onSentInvitationClick,
}: PurchaseRequestsTableRowProps) {
  const handleToggleExclude = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEditExcludeFromInWork) {
      alert('Только администратор может изменять видимость заявки в работе');
      return;
    }
    if (request.idPurchaseRequest === null) {
      return;
    }
    const newValue = !request.excludeFromInWork;
    await onExcludeFromInWorkChange(request.idPurchaseRequest, newValue);
  };

  return (
    <tr 
      key={request.guid || `${request.id}-${index}`} 
      className="hover:bg-gray-50 cursor-pointer"
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('input') || target.closest('select') || target.closest('button') || target.closest('.cursor-col-resize')) {
          return;
        }
        onRowClick(request, index);
      }}
      onAuxClick={(e) => {
        if (e.button === 1) {
          e.preventDefault();
          const target = e.target as HTMLElement;
          if (target.closest('input') || target.closest('select') || target.closest('button') || target.closest('.cursor-col-resize')) {
            return;
          }
          onRowAuxClick(request, index);
        }
      }}
    >
      {filteredColumnOrder.map(columnKey => {
        // Колонка "excludeFromInWork"
        if (columnKey === 'excludeFromInWork') {
          return (
            <td 
              key={columnKey}
              className={`px-2 py-0.5 whitespace-nowrap border-r border-gray-200 ${canEditExcludeFromInWork ? 'cursor-pointer' : 'cursor-not-allowed'}`}
              style={{ width: '48px', minWidth: '48px', maxWidth: '48px' }}
              onClick={canEditExcludeFromInWork ? handleToggleExclude : undefined}
            >
              <div className={`flex items-center justify-center rounded p-1 transition-colors ${canEditExcludeFromInWork ? 'hover:bg-gray-100' : 'opacity-50'}`}>
                {request.excludeFromInWork ? (
                  <span title={canEditExcludeFromInWork ? "Скрыто из вкладки 'В работе' (кликните для изменения)" : "Скрыто из вкладки 'В работе' (только администратор может изменить)"}>
                    <EyeOff className="w-4 h-4 text-gray-400" />
                  </span>
                ) : (
                  <span title={canEditExcludeFromInWork ? "Отображается во вкладке 'В работе' (кликните для изменения)" : "Отображается во вкладке 'В работе' (только администратор может изменить)"}>
                    <Eye className="w-4 h-4 text-gray-600" />
                  </span>
                )}
              </div>
            </td>
          );
        }
        
        // Простые колонки
        if (columnKey === 'idPurchaseRequest') {
          return (
            <td 
              key={columnKey}
              className="px-2 py-0.5 whitespace-nowrap text-xs text-gray-900 border-r border-gray-200" 
              style={{ width: `${getColumnWidth('idPurchaseRequest')}px`, minWidth: `${getColumnWidth('idPurchaseRequest')}px`, maxWidth: `${getColumnWidth('idPurchaseRequest')}px` }}
            >
              {request.idPurchaseRequest || '-'}
            </td>
          );
        }
        
        if (columnKey === 'guid') {
          return (
            <td 
              key={columnKey}
              className="px-2 py-0.5 text-xs text-gray-900 truncate border-r border-gray-200" 
              style={{ width: `${getColumnWidth('guid')}px`, minWidth: `${getColumnWidth('guid')}px`, maxWidth: `${getColumnWidth('guid')}px` }}
              title={request.guid ? String(request.guid) : ''}
            >
              {request.guid ? String(request.guid) : '-'}
            </td>
          );
        }
        
        if (columnKey === 'purchaseRequestPlanYear') {
          return (
            <td 
              key={columnKey}
              className="px-2 py-0.5 whitespace-nowrap text-xs text-gray-900 border-r border-gray-200" 
              style={{ width: `${getColumnWidth('purchaseRequestPlanYear')}px`, minWidth: `${getColumnWidth('purchaseRequestPlanYear')}px`, maxWidth: `${getColumnWidth('purchaseRequestPlanYear')}px` }}
            >
              {request.purchaseRequestPlanYear || '-'}
            </td>
          );
        }
        
        if (columnKey === 'company') {
          return (
            <td 
              key={columnKey}
              className="px-2 py-0.5 text-xs text-gray-900 truncate border-r border-gray-200" 
              style={{ width: `${getColumnWidth('company')}px`, minWidth: `${getColumnWidth('company')}px`, maxWidth: `${getColumnWidth('company')}px` }}
              title={request.company || ''}
            >
              {request.company || '-'}
            </td>
          );
        }
        
        if (columnKey === 'cfo') {
          return (
            <td 
              key={columnKey}
              className="px-2 py-0.5 text-xs text-gray-900 truncate border-r border-gray-200" 
              style={{ width: `${getColumnWidth('cfo')}px`, minWidth: `${getColumnWidth('cfo')}px`, maxWidth: `${getColumnWidth('cfo')}px` }}
              title={request.cfo || ''}
            >
              {request.cfo || '-'}
            </td>
          );
        }
        
        if (columnKey === 'mcc') {
          return (
            <td 
              key={columnKey}
              className="px-2 py-0.5 text-xs text-gray-900 truncate border-r border-gray-200" 
              style={{ width: `${getColumnWidth('mcc')}px`, minWidth: `${getColumnWidth('mcc')}px`, maxWidth: `${getColumnWidth('mcc')}px` }}
              title={request.mcc || ''}
            >
              {request.mcc || '-'}
            </td>
          );
        }
        
        if (columnKey === 'purchaseRequestInitiator') {
          return (
            <td 
              key={columnKey}
              className="px-2 py-0.5 text-xs text-gray-900 truncate border-r border-gray-200" 
              style={{ width: `${getColumnWidth('purchaseRequestInitiator')}px`, minWidth: `${getColumnWidth('purchaseRequestInitiator')}px`, maxWidth: `${getColumnWidth('purchaseRequestInitiator')}px` }}
              title={request.purchaseRequestInitiator || ''}
            >
              {request.purchaseRequestInitiator || '-'}
            </td>
          );
        }
        
        if (columnKey === 'purchaser') {
          return (
            <td
              key={columnKey}
              className="px-2 py-0.5 text-xs text-gray-900 truncate border-r border-gray-200"
              style={{ width: `${getColumnWidth('purchaser')}px`, minWidth: `${getColumnWidth('purchaser')}px`, maxWidth: `${getColumnWidth('purchaser')}px` }}
              title={request.purchaser || ''}
            >
              {request.purchaser || '-'}
            </td>
          );
        }
        
        if (columnKey === 'name') {
          return (
            <td 
              key={columnKey}
              className="px-2 py-0.5 text-xs text-gray-900 break-words border-r border-gray-200" 
              style={{ width: `${getColumnWidth('name')}px`, minWidth: `${getColumnWidth('name')}px`, maxWidth: `${getColumnWidth('name')}px` }}
            >
              {request.name || '-'}
            </td>
          );
        }
        
        if (columnKey === 'purchaseRequestCreationDate') {
          return (
            <td 
              key={columnKey}
              className="px-2 py-0.5 whitespace-nowrap text-xs text-gray-900 border-r border-gray-200" 
              style={{ width: `${getColumnWidth('purchaseRequestCreationDate')}px`, minWidth: `${getColumnWidth('purchaseRequestCreationDate')}px`, maxWidth: `${getColumnWidth('purchaseRequestCreationDate')}px` }}
            >
              {request.purchaseRequestCreationDate ? new Date(request.purchaseRequestCreationDate).toLocaleDateString('ru-RU') : '-'}
            </td>
          );
        }
        
        if (columnKey === 'budgetAmount') {
          return (
            <td 
              key={columnKey}
              className="px-2 py-0.5 whitespace-nowrap text-xs text-gray-900 border-r border-gray-200" 
              style={{ width: `${getColumnWidth('budgetAmount')}px`, minWidth: `${getColumnWidth('budgetAmount')}px`, maxWidth: `${getColumnWidth('budgetAmount')}px` }}
            >
              {request.budgetAmount ? (
                <span className="flex items-center">
                  {new Intl.NumberFormat('ru-RU', { 
                    notation: 'compact',
                    maximumFractionDigits: 1 
                  }).format(request.budgetAmount)}
                  {getCurrencyIcon(request.currency)}
                </span>
              ) : '-'}
            </td>
          );
        }
        
        if (columnKey === 'currency') {
          return (
            <td 
              key={columnKey}
              className="px-2 py-0.5 whitespace-nowrap text-xs text-gray-900 border-r border-gray-200" 
              style={{ width: `${getColumnWidth('currency')}px`, minWidth: `${getColumnWidth('currency')}px`, maxWidth: `${getColumnWidth('currency')}px` }}
            >
              {request.currency ? (
                <span className="flex items-center">
                  {getCurrencyIcon(request.currency)}
                </span>
              ) : '-'}
            </td>
          );
        }
        
        if (columnKey === 'costType') {
          return (
            <td 
              key={columnKey}
              className="px-2 py-0.5 text-xs text-gray-900 truncate border-r border-gray-200" 
              style={{ width: `${getColumnWidth('costType')}px`, minWidth: `${getColumnWidth('costType')}px`, maxWidth: `${getColumnWidth('costType')}px` }}
              title={request.costType || ''}
            >
              {request.costType || '-'}
            </td>
          );
        }
        
        if (columnKey === 'contractType') {
          return (
            <td 
              key={columnKey}
              className="px-2 py-0.5 text-xs text-gray-900 truncate border-r border-gray-200" 
              style={{ width: `${getColumnWidth('contractType')}px`, minWidth: `${getColumnWidth('contractType')}px`, maxWidth: `${getColumnWidth('contractType')}px` }}
              title={request.contractType || ''}
            >
              {request.contractType || '-'}
            </td>
          );
        }
        
        if (columnKey === 'contractDurationMonths') {
          return (
            <td 
              key={columnKey}
              className="px-2 py-0.5 whitespace-nowrap text-xs text-gray-900 border-r border-gray-200 text-center" 
              style={{ width: `${getColumnWidth('contractDurationMonths')}px`, minWidth: `${getColumnWidth('contractDurationMonths')}px`, maxWidth: `${getColumnWidth('contractDurationMonths')}px` }}
            >
              {request.contractDurationMonths !== null && request.contractDurationMonths !== undefined ? (
                <span>{request.contractDurationMonths}</span>
              ) : '-'}
            </td>
          );
        }
        
        if (columnKey === 'isPlanned') {
          return (
            <td 
              key={columnKey}
              className="px-2 py-0.5 whitespace-nowrap text-xs border-r border-gray-200" 
              style={{ width: `${getColumnWidth('isPlanned')}px`, minWidth: `${getColumnWidth('isPlanned')}px`, maxWidth: `${getColumnWidth('isPlanned')}px` }}
            >
              {request.isPlanned ? (
                <span className="px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                  Плановая
                </span>
              ) : request.isPlanned === false ? (
                <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                  Внеплановая
                </span>
              ) : (
                <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-50 text-gray-500 rounded-full">
                  -
                </span>
              )}
            </td>
          );
        }

        if (columnKey === 'hasLinkedPlanItem') {
          return (
            <td
              key={columnKey}
              className="px-2 py-0.5 whitespace-nowrap text-xs border-r border-gray-200"
              style={{ width: `${getColumnWidth('hasLinkedPlanItem')}px`, minWidth: `${getColumnWidth('hasLinkedPlanItem')}px`, maxWidth: `${getColumnWidth('hasLinkedPlanItem')}px` }}
            >
              {request.hasLinkedPlanItem ? (
                <span className="px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                  В плане
                </span>
              ) : request.hasLinkedPlanItem === false ? (
                <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                  Не в плане
                </span>
              ) : (
                <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-50 text-gray-500 rounded-full">
                  -
                </span>
              )}
            </td>
          );
        }

        if (columnKey === 'requiresPurchase') {
          return (
            <td 
              key={columnKey}
              className="px-2 py-0.5 whitespace-nowrap text-xs border-r border-gray-200" 
              style={{ width: `${getColumnWidth('requiresPurchase')}px`, minWidth: `${getColumnWidth('requiresPurchase')}px`, maxWidth: `${getColumnWidth('requiresPurchase')}px` }}
            >
              {request.requiresPurchase ? (
                <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                  Закупка
                </span>
              ) : request.requiresPurchase === false ? (
                <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                  Заказ
                </span>
              ) : (
                <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-50 text-gray-500 rounded-full">
                  -
                </span>
              )}
            </td>
          );
        }
        
        if (columnKey === 'status') {
          const statusGroup = request.statusGroup;
          return (
            <td key={columnKey} className="px-2 py-0.5 text-xs border-r border-gray-200">
              {statusGroup ? (
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  statusGroup === 'Договор подписан'
                    ? 'bg-green-100 text-green-800'
                    : statusGroup === 'Спецификация подписана'
                    ? 'bg-green-100 text-green-800'
                    : statusGroup === 'Договор в работе'
                    ? 'bg-blue-100 text-blue-800'
                    : statusGroup === 'Заявка у закупщика'
                    ? 'bg-yellow-100 text-yellow-800'
                    : statusGroup === 'Заявка на согласовании'
                    ? 'bg-orange-100 text-orange-800'
                    : statusGroup === 'Заявка не согласована'
                    ? 'bg-red-100 text-red-800'
                    : statusGroup === 'Заявка не утверждена'
                    ? 'bg-red-100 text-red-800'
                    : statusGroup === 'Закупка не согласована'
                    ? 'bg-red-100 text-red-800'
                    : statusGroup === 'Спецификация создана - Архив'
                    ? 'bg-gray-200 text-gray-700'
                    : statusGroup === 'Спецификация в работе'
                    ? 'bg-blue-100 text-blue-800'
                    : statusGroup === 'Спецификация не согласована'
                    ? 'bg-red-100 text-red-800'
                    : statusGroup === 'Проект'
                    ? 'bg-gray-100 text-gray-800'
                    : statusGroup === 'Не установлен'
                    ? 'bg-gray-100 text-gray-600'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {statusGroup}
                </span>
              ) : (
                <span className="px-2 py-1 text-xs font-medium bg-gray-50 text-gray-500 rounded-full">
                  -
                </span>
              )}
            </td>
          );
        }
        
        if (columnKey === 'daysSinceCreation') {
          if (activeTab === 'completed') {
            return null;
          }
          return (
            <td 
              key={columnKey} 
              className="px-2 py-0.5 whitespace-nowrap text-xs text-gray-900 border-r border-gray-200 text-center"
              style={{ 
                width: `${getColumnWidth(columnKey)}px`,
                minWidth: `${getColumnWidth(columnKey)}px`,
                maxWidth: `${getColumnWidth(columnKey)}px`
              }}
            >
              {request.daysSinceCreation !== null && request.daysSinceCreation !== undefined ? (
                <span>{request.daysSinceCreation}</span>
              ) : '-'}
            </td>
          );
        }
        
        if (columnKey === 'createdAt') {
          return (
            <td 
              key={columnKey}
              className="px-2 py-0.5 whitespace-nowrap text-xs text-gray-900 border-r border-gray-200" 
              style={{ width: `${getColumnWidth('createdAt')}px`, minWidth: `${getColumnWidth('createdAt')}px`, maxWidth: `${getColumnWidth('createdAt')}px` }}
            >
              {request.createdAt ? new Date(request.createdAt).toLocaleString('ru-RU') : '-'}
            </td>
          );
        }
        
        if (columnKey === 'updatedAt') {
          return (
            <td 
              key={columnKey}
              className="px-2 py-0.5 whitespace-nowrap text-xs text-gray-900 border-r border-gray-200" 
              style={{ width: `${getColumnWidth('updatedAt')}px`, minWidth: `${getColumnWidth('updatedAt')}px`, maxWidth: `${getColumnWidth('updatedAt')}px` }}
            >
              {request.updatedAt ? new Date(request.updatedAt).toLocaleString('ru-RU') : '-'}
            </td>
          );
        }
        
        // Колонка "Трэк" - только для вкладок кроме "Завершенные"
        if (columnKey === 'track') {
          if (activeTab === 'completed') {
            return null;
          }
          
          const hasSpecificationOnCoordination = request.contracts && request.contracts.some(
            (contract: Contract) => 
              contract.documentForm === 'Спецификация' && 
              contract.status === 'На согласовании'
          );
          
          // Проверяем группу статуса заявки
          const isOnCoordination = request.statusGroup === 'Заявка на согласовании';
          const isAtBuyer = request.statusGroup === 'Заявка у закупщика';
          const isSpecificationInProgress = request.statusGroup === 'Спецификация в работе';
          const isContractInProgress = request.statusGroup === 'Договор в работе';
          
          return (
            <td key={columnKey} className="px-2 py-0.5 text-xs border-r border-gray-200">
              <div className="flex items-end gap-2">
                {/* Заявка - активна */}
                <div className="flex flex-col items-center gap-0.5">
                  {isOnCoordination ? (
                    // Если заявка на согласовании - желтый цвет
                    <div className="relative w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center" title="Заявка на согласовании">
                      <Clock className="w-2.5 h-2.5 text-white" />
                    </div>
                  ) : isAtBuyer ? (
                    // Если заявка у закупщика - зеленый цвет
                    <div className="relative w-4 h-4 rounded-full bg-green-500 flex items-center justify-center" title="Заявка у закупщика">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  ) : isSpecificationInProgress || isContractInProgress ? (
                    // Если спецификация или договор в работе - заявка зеленая
                    <div className="relative w-4 h-4 rounded-full bg-green-500 flex items-center justify-center" title={isSpecificationInProgress ? "Спецификация в работе" : "Договор в работе"}>
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  ) : request.status === 'Спецификация подписана' || request.status === 'Договор подписан' || request.status === 'Договор создан' || request.status === 'Закупка создана' || (request.requiresPurchase === false && hasSpecificationOnCoordination) ? (
                    <div className="relative w-4 h-4 rounded-full bg-green-500 flex items-center justify-center" title={
                      hasSpecificationOnCoordination && request.requiresPurchase === false ? "Заявка: Спецификация на согласовании" :
                      request.status === 'Спецификация подписана' ? "Заявка: Спецификация подписана" :
                      request.status === 'Договор подписан' ? "Заявка: Договор подписан" :
                      request.status === 'Договор создан' ? "Заявка: Договор создан" :
                      "Заявка: Закупка создана"
                    }>
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  ) : request.status === 'Утверждена' || request.status === 'Заявка утверждена' || request.status === 'Спецификация создана' ? (
                    <div className="relative w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center" title={
                      request.status === 'Спецификация создана' ? "Заявка: Спецификация создана" :
                      "Заявка утверждена"
                    }>
                      <Clock className="w-2.5 h-2.5 text-white" />
                    </div>
                  ) : request.status === 'Заявка не утверждена' || request.status === 'Заявка не согласована' || request.status === 'Закупка не согласована' ? (
                    <div className="relative w-4 h-4 rounded-full bg-red-500 flex items-center justify-center" title={
                      request.status === 'Закупка не согласована' ? "Заявка: Закупка не согласована" :
                      "Заявка: Заявка не утверждена или Заявка не согласована"
                    }>
                      <X className="w-2.5 h-2.5 text-white" />
                    </div>
                  ) : (
                    <div className="relative w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center" title="Заявка">
                      <Clock className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                  <span className="text-[10px] text-gray-600 whitespace-nowrap leading-none">Заявка</span>
                </div>
                
                {/* Если закупка требуется: Заявка → Закупка → Договор */}
                {request.requiresPurchase !== false ? (
                  <>
                    {/* Закупка */}
                    <div className="flex flex-col items-center gap-0.5">
                      {isOnCoordination ? (
                        // Если заявка на согласовании - серый цвет для остальных элементов
                        <div className="w-3 h-3 rounded-full bg-gray-300 mt-0.5" title="Закупка"></div>
                      ) : isAtBuyer ? (
                        // Если заявка у закупщика - желтый цвет для закупки
                        <div className="relative w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center mt-0.5" title="Закупка: Заявка у закупщика">
                          <Clock className="w-2.5 h-2.5 text-white" />
                        </div>
                      ) : isSpecificationInProgress || isContractInProgress ? (
                        // Если спецификация или договор в работе - закупка зеленая
                        <div className="relative w-4 h-4 rounded-full bg-green-500 flex items-center justify-center mt-0.5" title={isSpecificationInProgress ? "Закупка: Спецификация в работе" : "Закупка: Договор в работе"}>
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      ) : request.hasCompletedPurchase ? (
                        <div className="relative w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center mt-0.5" title="Закупка: Завершена">
                          <Clock className="w-2.5 h-2.5 text-white" />
                        </div>
                      ) : request.status === 'Закупка создана' ? (
                        <div className="relative w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center mt-0.5" title="Закупка: Закупка создана">
                          <Clock className="w-2.5 h-2.5 text-white" />
                        </div>
                      ) : request.status === 'Закупка не согласована' ? (
                        <div className="relative w-4 h-4 rounded-full bg-red-500 flex items-center justify-center mt-0.5" title="Закупка: Закупка не согласована">
                          <X className="w-2.5 h-2.5 text-white" />
                        </div>
                      ) : (
                        <div className="w-3 h-3 rounded-full bg-gray-300 mt-0.5" title="Закупка"></div>
                      )}
                      <span className="text-[10px] text-gray-500 whitespace-nowrap leading-none">Закупка</span>
                    </div>
                    {/* Договор */}
                    <div className="flex flex-col items-center gap-0.5">
                      {(() => {
                        // Если заявка на согласовании или у закупщика - серый цвет для договора
                        if (isOnCoordination || isAtBuyer) {
                          return (
                            <div className="w-3 h-3 rounded-full bg-gray-300 mt-0.5" title="Договор"></div>
                          );
                        }
                        
                        // Если спецификация или договор в работе - желтый цвет
                        if (isSpecificationInProgress || isContractInProgress) {
                          return (
                            <div className="relative w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center mt-0.5" title={isSpecificationInProgress ? "Договор: Спецификация в работе" : "Договор: Договор в работе"}>
                              <Clock className="w-2.5 h-2.5 text-white" />
                            </div>
                          );
                        }
                        
                        const hasSignedContract = request.contracts && request.contracts.some(
                          (contract: Contract) => contract.status === 'Договор подписан' || contract.status === 'Подписан'
                        );
                        const hasProjectContract = request.contracts && request.contracts.some(
                          (contract: Contract) => contract.status === 'Проект' || contract.status === 'Договор создан'
                        );
                        
                        if (request.status === 'Договор подписан' || hasSignedContract) {
                          return (
                            <div className="relative w-4 h-4 rounded-full bg-green-500 flex items-center justify-center mt-0.5" title="Договор: Договор подписан">
                              <Check className="w-2.5 h-2.5 text-white" />
                            </div>
                          );
                        } else if (request.status === 'Договор создан' || hasProjectContract) {
                          return (
                            <div className="relative w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center mt-0.5" title="Договор: Договор в статусе Проект">
                              <Clock className="w-2.5 h-2.5 text-white" />
                            </div>
                          );
                        } else if (request.hasCompletedPurchase) {
                          return (
                            <div className="relative w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center mt-0.5" title="Договор: Закупка завершена">
                              <Clock className="w-2.5 h-2.5 text-white" />
                            </div>
                          );
                        } else {
                          return (
                            <div className="w-3 h-3 rounded-full bg-gray-300 mt-0.5" title="Договор"></div>
                          );
                        }
                      })()}
                      <span className="text-[10px] text-gray-500 whitespace-nowrap leading-none">Договор</span>
                    </div>
                  </>
                ) : (
                  /* Если закупка не требуется: Заявка → Заказ */
                  <div className="flex flex-col items-center gap-0.5">
                    {isOnCoordination || isAtBuyer ? (
                      // Если заявка на согласовании или у закупщика - серый цвет для заказа
                      <div className="w-3 h-3 rounded-full bg-gray-300 mt-0.5" title="Заказ"></div>
                    ) : isSpecificationInProgress ? (
                      // Если спецификация в работе - желтый цвет для заказа
                      <div className="relative w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center mt-0.5" title="Заказ: Спецификация в работе">
                        <Clock className="w-2.5 h-2.5 text-white" />
                      </div>
                    ) : request.status === 'Спецификация подписана' || request.status === 'Договор подписан' ? (
                      <div className="relative w-4 h-4 rounded-full bg-green-500 flex items-center justify-center mt-0.5" title={
                        request.status === 'Спецификация подписана' ? "Заказ: Спецификация подписана" : 
                        "Заявка: Договор подписан"
                      }>
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    ) : request.status === 'Спецификация создана' ? (
                      <div className="relative w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center mt-0.5" title="Заказ: Спецификация создана">
                        <Clock className="w-2.5 h-2.5 text-white" />
                      </div>
                    ) : (
                      <div className="w-3 h-3 rounded-full bg-gray-300 mt-0.5" title="Заказ"></div>
                    )}
                    <span className="text-[10px] text-gray-500 whitespace-nowrap leading-none">Заказ</span>
                  </div>
                )}
              </div>
            </td>
          );
        }
        
        // Колонка "Оценка" для вкладок "Завершенные" и "В работе"
        if (columnKey === 'rating' && (activeTab === 'completed' || activeTab === 'in-work')) {
          return (
            <td 
              key={columnKey} 
              className="px-2 py-0.5 text-xs border-r border-gray-200"
              onClick={(e) => e.stopPropagation()}
            >
              {request.csiLink ? (
                request.hasFeedback ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onFeedbackClick?.(request);
                    }}
                    className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 transition-colors flex items-center gap-1"
                  >
                    {request.averageRating ? (() => {
                      const rating = request.averageRating;
                      const fullStars = Math.floor(rating);
                      const hasHalfStar = rating % 1 >= 0.5;
                      const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
                      return (
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: fullStars }).map((_, i) => (
                            <Star key={`full-${i}`} className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                          ))}
                          {hasHalfStar && (
                            <Star className="w-3 h-3 fill-yellow-500 text-yellow-500 opacity-50" />
                          )}
                          {Array.from({ length: emptyStars }).map((_, i) => (
                            <Star key={`empty-${i}`} className="w-3 h-3 text-gray-300" />
                          ))}
                          <span className="ml-1">{rating.toFixed(1)}</span>
                        </div>
                      );
                    })() : '-'}
                  </button>
                ) : request.csiInvitationSent ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSentInvitationClick?.(request);
                    }}
                    className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors cursor-pointer"
                  >
                    Оценка отправлена
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRatingClick?.(request);
                    }}
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Оценка
                  </button>
                )
              ) : (
                <span className="text-gray-400">-</span>
              )}
            </td>
          );
        }
        
        return null;
      })}
    </tr>
  );
}
