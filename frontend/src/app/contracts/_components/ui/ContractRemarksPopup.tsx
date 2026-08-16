'use client';

import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { ContractRemarkItem, ContractRemarksPopupState } from '../types/contract-remarks.types';
import { formatRemarkDate } from '../utils/contractRemarks.utils';

interface ContractRemarksPopupProps {
  popup: ContractRemarksPopupState | null;
  remarks: ContractRemarkItem[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

/**
 * Попап со всеми замечаниями по договору: кто дал (ФИО), роль, этап, дата и текст замечания.
 * Рендерится в портале, чтобы не обрезался прокруткой таблицы.
 */
export default function ContractRemarksPopup({ popup, remarks, loading, error, onClose }: ContractRemarksPopupProps) {
  if (!popup || typeof document === 'undefined') return null;

  return createPortal(
    <div
      data-remarks-popup-portal
      className="fixed z-[100] w-[460px] max-w-[calc(100vw-32px)] rounded-lg border border-gray-200 bg-white shadow-xl"
      style={{
        left: popup.left,
        top: popup.top,
        transform: popup.placement === 'above' ? 'translateY(-100%)' : undefined,
      }}
    >
      <div className="flex items-center justify-between gap-2 px-2 py-1.5 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <span className="text-xs font-semibold text-gray-800 truncate">
          Замечания{popup.contractInnerId ? ` — ${popup.contractInnerId}` : ''}
          {!loading && !error && remarks.length > 0 && (
            <span className="ml-1 text-gray-500 font-normal">({remarks.length})</span>
          )}
        </span>
        <button type="button" onClick={onClose} className="p-0.5 rounded hover:bg-gray-200 flex-shrink-0" aria-label="Закрыть">
          <X className="w-3.5 h-3.5 text-gray-500" />
        </button>
      </div>

      <div className="max-h-[50vh] overflow-y-auto custom-scrollbar divide-y divide-gray-100">
        {loading && <div className="px-2 py-4 text-xs text-gray-500 text-center">Загрузка...</div>}
        {error && <div className="px-2 py-4 text-xs text-red-600 text-center">{error}</div>}
        {!loading && !error && remarks.length === 0 && (
          <div className="px-2 py-4 text-xs text-gray-400 text-center">Замечаний нет</div>
        )}
        {!loading && !error && remarks.map((remark) => (
          <div key={remark.id} className="px-2 py-1.5 flex gap-2 items-start">
            <div className="flex-shrink-0 w-36 text-[10px] text-gray-500 leading-tight">
              <div className="font-medium text-gray-800 break-words">{remark.executorName || '—'}</div>
              {remark.role && <div className="break-words">{remark.role}</div>}
              {remark.stage && <div className="text-gray-400 break-words">{remark.stage}</div>}
              <div className="text-gray-400">{formatRemarkDate(remark.completionDate)}</div>
            </div>
            <div className="flex-1 min-w-0 bg-amber-50 border border-amber-200 rounded px-2 py-1 text-xs text-gray-900 whitespace-pre-wrap break-words leading-snug">
              {remark.commentText}
            </div>
          </div>
        ))}
      </div>
    </div>,
    document.body,
  );
}
