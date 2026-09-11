'use client';

import React from 'react';
import { RefreshCw, Trash2 } from 'lucide-react';
import { DraftGenerationResult } from '../hooks/usePurchasePlanDraftActions';

interface PurchasePlanDraftToolbarProps {
  year: number | null;
  isGenerating: boolean;
  isClearing: boolean;
  lastResult: DraftGenerationResult | null;
  errorMessage: string | null;
  onGenerate: () => void;
  onClear: () => void;
}

/**
 * Панель управления драфтом плана закупок.
 * Формирование позиций драфта из действующих договоров и очистка драфта за год.
 */
export default function PurchasePlanDraftToolbar({
  year,
  isGenerating,
  isClearing,
  lastResult,
  errorMessage,
  onGenerate,
  onClear,
}: PurchasePlanDraftToolbarProps) {
  const isBusy = isGenerating || isClearing;

  return (
    <div className="px-3 py-2 border-b border-gray-200 bg-amber-50 flex items-center justify-between gap-3 flex-wrap flex-shrink-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="px-2 py-1 text-xs font-semibold text-amber-800 bg-amber-100 border border-amber-300 rounded">
          Драфт плана закупок{year !== null ? ` на ${year} год` : ''}
        </span>
        <button
          data-tour="draft-generate"
          onClick={onGenerate}
          disabled={isBusy}
          className="px-2 py-1 text-xs bg-blue-600 text-white rounded border border-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Сформировать позиции драфта из действующих договоров Uzum Market и связанных с заявкой ДС, которые заканчиваются начиная с октября предыдущего года и в течение года планирования"
        >
          <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? 'Формирование…' : 'Сформировать из договоров'}
        </button>
        <button
          data-tour="draft-clear"
          onClick={onClear}
          disabled={isBusy}
          className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded border border-red-300 hover:bg-red-100 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Скрыть все позиции драфта за выбранный год (история и комментарии сохраняются, повторное формирование вернёт позиции с теми же id)"
        >
          <Trash2 className="w-3 h-3" />
          {isClearing ? 'Очистка…' : 'Очистить драфт'}
        </button>
      </div>

      <div data-tour="draft-status" className="text-xs text-gray-700">
        {errorMessage ? (
          <span className="text-red-600">{errorMessage}</span>
        ) : lastResult ? (
          <span>
            Отобрано договоров: {lastResult.contractsSelected}. Создано позиций: {lastResult.created}.
            {lastResult.skipped > 0 ? ` Уже были в драфте: ${lastResult.skipped}.` : ''}
          </span>
        ) : (
          <span className="text-gray-500">
            Источник: договоры Uzum Market и связанные с заявкой ДС (без спецификаций) в статусе «Подписан»
          </span>
        )}
      </div>
    </div>
  );
}
