'use client';

import React from 'react';
import { CircleCheck } from 'lucide-react';

interface PurchasePlanPurchaserCheckedButtonProps {
  /** Позиция проверена закупщиком */
  checked: boolean;
  /** Нажатие доступно (драфт, закупщик или администратор, не архивная версия) */
  canEdit: boolean;
  /** Кто и когда последний раз ставил или снимал отметку */
  auditInfo: string | null;
  onToggle: () => void;
}

/**
 * Галочка «Проверено закупщиком» у позиции драфта плана закупок: серая — не проверено, зелёная — проверено.
 * Видна всем, нажимать могут только закупщики и администраторы.
 */
export default function PurchasePlanPurchaserCheckedButton({
  checked,
  canEdit,
  auditInfo,
  onToggle,
}: PurchasePlanPurchaserCheckedButtonProps) {
  const title = [
    checked ? 'Проверено закупщиком' : 'Не проверено закупщиком',
    auditInfo ? `${checked ? 'Отметил' : 'Отметку снял'}: ${auditInfo}` : null,
    canEdit ? (checked ? 'Кликните, чтобы снять отметку' : 'Кликните, чтобы отметить') : null,
  ].filter(Boolean).join('\n');

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (canEdit) onToggle();
      }}
      disabled={!canEdit}
      title={title}
      className={`flex items-center justify-center rounded p-0.5 transition-colors ${canEdit ? 'hover:bg-gray-100 cursor-pointer' : 'cursor-default'}`}
    >
      <CircleCheck className={`w-4 h-4 ${checked ? 'text-green-600' : 'text-gray-300'}`} />
    </button>
  );
}
