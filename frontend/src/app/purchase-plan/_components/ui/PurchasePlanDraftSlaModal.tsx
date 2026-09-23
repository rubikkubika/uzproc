'use client';

import React from 'react';
import { DraftSlaRow, DraftSlaTable } from '../types/purchase-plan-items.types';
import PurchasePlanDraftSlaForm from './PurchasePlanDraftSlaForm';

interface PurchasePlanDraftSlaModalProps {
  isOpen: boolean;
  year: number | null;
  table: DraftSlaTable | null;
  /** Менять таблицу могут закупщики и администраторы */
  canEdit: boolean;
  isSaving: boolean;
  errorMessage: string | null;
  onSave: (rows: DraftSlaRow[]) => void;
  onClose: () => void;
}

/**
 * Модальное окно таблицы SLA драфта на год: срок от даты заявки до нового договора по сложности
 * = SLA закупки + SLA договора. После сохранения даты завершения позиций драфта пересчитываются.
 */
export default function PurchasePlanDraftSlaModal({ isOpen, onClose, ...formProps }: PurchasePlanDraftSlaModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <PurchasePlanDraftSlaForm {...formProps} onClose={onClose} />
      </div>
    </div>
  );
}
