'use client';

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import type { Delivery } from '../types/delivery.types';

interface Props {
  delivery: Delivery;
  /** Сохраняет плановую дату вручную; пустая строка возвращает её в автоматический режим */
  onChangePlannedDate: (id: number, isoDate: string) => void;
}

/** Формат даты для показа: ДД.ММ.ГГГГ, либо «—» для пустого значения. */
const formatDate = (value: string | null) => (value ? new Date(value).toLocaleDateString('ru-RU') : '—');

/** Строка «подпись — значение» внутри ячейки дат. */
function DateRow({ label, value, title }: { label: string; value: string | null; title: string }) {
  return (
    <span className="flex items-baseline gap-1" title={title}>
      <span className="text-[10px] uppercase tracking-wide text-gray-400 w-10 flex-shrink-0">{label}</span>
      <span className={value ? 'text-gray-900' : 'text-gray-400'}>{formatDate(value)}</span>
    </span>
  );
}

/**
 * Колонка «Даты поставки»: дедлайн (вычисляется автоматически), редактируемая плановая дата,
 * факт и ЭСФ.
 * Плановая дата по умолчанию равна дедлайну; после ручного изменения она фиксируется
 * (помечается «вручную») и больше не меняется автоматическими пересчётами.
 */
export default function DeliveryDatesCell({ delivery, onChangePlannedDate }: Props) {
  const saved = delivery.plannedDeliveryDate ?? '';
  const [draft, setDraft] = useState(saved);
  const [syncedFrom, setSyncedFrom] = useState(saved);

  // Значение из списка могло измениться (перезагрузка, пересчёт) — подтягиваем его в поле.
  // Корректировка состояния при рендере вместо эффекта: лишнего прохода рендера не будет.
  if (syncedFrom !== saved) {
    setSyncedFrom(saved);
    setDraft(saved);
  }

  const manual = delivery.plannedDeliveryDateManual;

  return (
    <div className="flex flex-col gap-0.5 leading-tight">
      <DateRow label="Дедл." value={delivery.deliveryDeadline} title="Дедлайн (вычисляется автоматически)" />

      <span
        className="flex items-center gap-1"
        title={manual
          ? 'Плановая дата поставки — задана вручную, автоматические пересчёты её не меняют'
          : 'Плановая дата поставки — по умолчанию равна дедлайну'}
        onClick={(e) => e.stopPropagation()}
      >
        <span className={`text-[10px] uppercase tracking-wide w-10 flex-shrink-0 ${manual ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
          План.
        </span>
        <input
          type="date"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            // Сохраняем только по завершении ввода: промежуточные значения date-инпута
            // приходят пустыми, и запрос на каждое нажатие сбрасывал бы дату в авто-режим
            if (draft !== saved) onChangePlannedDate(delivery.id, draft);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          onClick={(e) => e.stopPropagation()}
          className={`text-xs border rounded px-1 py-0.5 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
            manual ? 'border-blue-400' : 'border-gray-300'
          }`}
        />
        {manual && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDraft(delivery.deliveryDeadline ?? '');
              onChangePlannedDate(delivery.id, '');
            }}
            className="flex-shrink-0 text-gray-400 hover:text-blue-600 transition-colors"
            title="Вернуть автоматическую дату (равна дедлайну)"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
      </span>

      <DateRow label="Факт" value={delivery.actualDeliveryDate} title="Факт — фактическая дата поставки" />
      <DateRow label="ЭСФ" value={delivery.esfDate} title="ЭСФ — дата выставления электронной счёт-фактуры" />
    </div>
  );
}
