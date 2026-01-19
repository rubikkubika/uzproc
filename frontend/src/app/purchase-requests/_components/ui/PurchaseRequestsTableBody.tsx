'use client';

import React from 'react';
import { PurchaseRequest, TabType } from '../types/purchase-request.types';
import PurchaseRequestsTableRow from './PurchaseRequestsTableRow';

interface PurchaseRequestsTableBodyProps {
  allItems: PurchaseRequest[];
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
 * Компонент тела таблицы заявок на закупку
 * Рендерит все строки таблицы
 */
export default function PurchaseRequestsTableBody({
  allItems,
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
}: PurchaseRequestsTableBodyProps) {
  const hasData = allItems && allItems.length > 0;

  return (
    <tbody className="bg-white divide-y divide-gray-200">
      {hasData ? (
        allItems.map((request, index) => (
          <PurchaseRequestsTableRow
            key={request.guid || `${request.id}-${index}`}
            request={request}
            index={index}
            filteredColumnOrder={filteredColumnOrder}
            activeTab={activeTab}
            getColumnWidth={getColumnWidth}
            canEditExcludeFromInWork={canEditExcludeFromInWork}
            userRole={userRole}
            onExcludeFromInWorkChange={onExcludeFromInWorkChange}
            onRowClick={onRowClick}
            onRowAuxClick={onRowAuxClick}
            onRatingClick={onRatingClick}
            onFeedbackClick={onFeedbackClick}
            onSentInvitationClick={onSentInvitationClick}
          />
        ))
      ) : (
        <tr>
          <td colSpan={filteredColumnOrder.length} className="px-6 py-8 text-center text-gray-500">
            Нет данных
          </td>
        </tr>
      )}
    </tbody>
  );
}
