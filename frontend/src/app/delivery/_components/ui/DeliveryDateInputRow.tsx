'use client';

import { useState, type ReactNode } from 'react';

interface Props {
  /** Подпись слева: «План.», «Факт», «ЭСФ» */
  label: string;
  /** Сохранённое значение (ISO-дата) или null */
  value: string | null;
  title: string;
  /** Сохраняет дату по завершении ввода; пустая строка — очистить дату */
  onCommit: (isoDate: string) => void;
  /** Выделить подпись и рамку синим (напр. плановая дата, заданная вручную) */
  highlighted?: boolean;
  /** Элементы справа от поля (напр. кнопка сброса) */
  trailing?: ReactNode;
}

/** Строка «подпись — дата» в колонке «Даты поставки» с полем для ввода даты прямо в таблице. */
export default function DeliveryDateInputRow({ label, value, title, onCommit, highlighted = false, trailing }: Props) {
  const saved = value ?? '';
  const [draft, setDraft] = useState(saved);
  const [syncedFrom, setSyncedFrom] = useState(saved);

  // Значение из списка могло измениться (перезагрузка, пересчёт) — подтягиваем его в поле.
  // Корректировка состояния при рендере вместо эффекта: лишнего прохода рендера не будет.
  if (syncedFrom !== saved) {
    setSyncedFrom(saved);
    setDraft(saved);
  }

  return (
    <span className="flex items-center gap-1" title={title} onClick={(e) => e.stopPropagation()}>
      <span className={`text-[10px] uppercase tracking-wide w-10 flex-shrink-0 ${highlighted ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
        {label}
      </span>
      <input
        type="date"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          // Сохраняем только по завершении ввода: промежуточные значения date-инпута
          // приходят пустыми, и запрос на каждое нажатие стирал бы дату
          if (draft !== saved) onCommit(draft);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        onClick={(e) => e.stopPropagation()}
        className={`text-xs border rounded px-1 py-0.5 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
          highlighted ? 'border-blue-400' : 'border-gray-300'
        }`}
      />
      {trailing}
    </span>
  );
}
