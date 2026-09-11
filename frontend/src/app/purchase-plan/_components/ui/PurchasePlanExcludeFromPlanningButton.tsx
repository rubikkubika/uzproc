'use client';

import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PurchasePlanExcludeFromPlanningButtonProps {
  /** Позиция исключена из планирования (статус «Исключена») */
  excluded: boolean;
  /** Нажатие доступно (драфт, есть права, не архивная версия) */
  canEdit: boolean;
  /** Кто и когда последний раз исключал позицию из планирования или возвращал в план */
  auditInfo?: string | null;
  onToggle: () => void;
}

/**
 * «Глазик» у позиции драфта плана закупок (как «Скрыть из вкладки В работе» у заявок):
 * исключает позицию из планирования, а её договор — из следующих драфтов; повторное нажатие возвращает.
 */
export default function PurchasePlanExcludeFromPlanningButton({
  excluded,
  canEdit,
  auditInfo = null,
  onToggle,
}: PurchasePlanExcludeFromPlanningButtonProps) {
  const stateTitle = excluded
    ? 'Исключена из планирования, договор не попадёт в новые драфты' + (canEdit ? ' (кликните, чтобы вернуть)' : '')
    : canEdit
      ? 'Исключить из планирования: договор не попадёт в новые драфты'
      : 'В планировании';
  const title = auditInfo
    ? `${stateTitle}\n${excluded ? 'Исключил' : 'Вернул в план'}: ${auditInfo}`
    : stateTitle;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (canEdit) onToggle();
      }}
      disabled={!canEdit}
      title={title}
      className={`flex items-center justify-center rounded p-0.5 transition-colors ${canEdit ? 'hover:bg-gray-100 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
    >
      {excluded ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-600" />}
    </button>
  );
}
