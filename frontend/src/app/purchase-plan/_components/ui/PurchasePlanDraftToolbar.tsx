'use client';

import React from 'react';
import { RefreshCw, Timer, Trash2 } from 'lucide-react';
import { DraftGenerationResult } from '../hooks/usePurchasePlanDraftActions';
import { DraftSlaTable } from '../types/purchase-plan-items.types';
import { DRAFT_MANAGE_FORBIDDEN_TITLE } from '../constants/purchase-plan-items.constants';

interface PurchasePlanDraftToolbarProps {
  year: number | null;
  isGenerating: boolean;
  isClearing: boolean;
  lastResult: DraftGenerationResult | null;
  errorMessage: string | null;
  onGenerate: () => void;
  onClear: () => void;
  /** Формировать и очищать драфт могут закупщики и администраторы */
  canManage: boolean;
  /** Таблица SLA драфта выбранного года (null — ещё не загружена) */
  slaTable: DraftSlaTable | null;
  onOpenSla: () => void;
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
  canManage,
  slaTable,
  onOpenSla,
}: PurchasePlanDraftToolbarProps) {
  const isBusy = isGenerating || isClearing;
  const isDisabled = isBusy || !canManage;

  return (
    <div className="px-3 py-2 border-b border-gray-200 bg-amber-50 flex items-center justify-between gap-3 flex-wrap flex-shrink-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="px-2 py-1 text-xs font-semibold text-amber-800 bg-amber-100 border border-amber-300 rounded">
          Драфт плана закупок{year !== null ? ` на ${year} год` : ''}
        </span>
        <button
          data-tour="draft-generate"
          onClick={onGenerate}
          disabled={isDisabled}
          className="px-2 py-1 text-xs bg-blue-600 text-white rounded border border-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          title={canManage
            ? 'Сформировать позиции драфта из действующих договоров Uzum Market и связанных с заявкой ДС, которые заканчиваются начиная с октября предыдущего года и в течение года планирования'
            : DRAFT_MANAGE_FORBIDDEN_TITLE}
        >
          <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? 'Формирование…' : 'Сформировать из договоров'}
        </button>
        <button
          data-tour="draft-clear"
          onClick={onClear}
          disabled={isDisabled}
          className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded border border-red-300 hover:bg-red-100 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          title={canManage
            ? 'Скрыть все позиции драфта за выбранный год (история и комментарии сохраняются, повторное формирование вернёт позиции с теми же id)'
            : DRAFT_MANAGE_FORBIDDEN_TITLE}
        >
          <Trash2 className="w-3 h-3" />
          {isClearing ? 'Очистка…' : 'Очистить драфт'}
        </button>
        <button
          data-tour="draft-sla"
          onClick={onOpenSla}
          disabled={!slaTable}
          className="px-2 py-1 text-xs bg-white text-gray-700 rounded border border-gray-300 hover:bg-gray-50 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Срок от даты заявки до нового договора по сложности 1–4, рабочих дней: SLA закупки + SLA договора"
        >
          <Timer className="w-3 h-3" />
          SLA{slaTable ? `: ${slaTable.rows.map(row => row.totalDays).join(' / ')}` : ''}
        </button>
      </div>

      <div data-tour="draft-status" className="text-xs text-gray-700">
        {errorMessage ? (
          <span className="text-red-600">{errorMessage}</span>
        ) : lastResult ? (
          <span>
            Отобрано договоров: {lastResult.contractsSelected}. Создано позиций: {lastResult.created}.
            {lastResult.skipped > 0 ? ` Пропущено (уже в драфте или исключены): ${lastResult.skipped}.` : ''}
            {lastResult.purchasersFilled ? ` Назначен закупщик из заявки: ${lastResult.purchasersFilled}.` : ''}
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
