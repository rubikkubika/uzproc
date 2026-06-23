'use client';

/**
 * Заглушка-макет «CSI по договорам» (раздел в разработке).
 * Визуально повторяет блок CSI (метрики со звёздами), но данные демонстрационные/статичные.
 * Размещается справа от блока «Кол-во документов» на вкладке «Договоры».
 */

interface CsiMetric {
  label: string;
  value: number; // 0..5, демонстрационное значение
}

const MOCK_METRICS: CsiMetric[] = [
  { label: 'Скорость', value: 4.5 },
  { label: 'Качество', value: 4.0 },
  { label: 'Удовлетворённость', value: 4.5 },
  { label: 'Общая оценка', value: 4.3 },
];

/** Отрисовка ряда из 5 звёзд с поддержкой половинок. Только отображение (макет). */
function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - (i - 1)));
        return (
          <span key={i} className="relative inline-block w-4 h-4 leading-none">
            <span className="absolute inset-0 text-gray-300">★</span>
            <span
              className="absolute inset-0 overflow-hidden text-amber-400"
              style={{ width: `${fill * 100}%` }}
            >
              ★
            </span>
          </span>
        );
      })}
    </div>
  );
}

export function ContractCsiMockupCard() {
  return (
    <div className="bg-white rounded-lg shadow p-3 sm:p-4 flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h3 className="text-sm font-medium text-gray-700">CSI по договорам</h3>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-100 border border-amber-200 rounded px-1.5 py-0.5">
          В разработке
        </span>
      </div>

      <div className="flex-1 min-h-0 flex flex-col justify-center gap-3 opacity-70 select-none pointer-events-none">
        {MOCK_METRICS.map((m) => (
          <div key={m.label} className="flex items-center justify-between gap-3">
            <span className="text-xs text-gray-600">{m.label}</span>
            <div className="flex items-center gap-2">
              <Stars value={m.value} />
              <span className="text-xs font-semibold text-gray-700 w-7 text-right">
                {m.value.toFixed(1)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] text-gray-400 flex-shrink-0">
        Раздел в разработке — показаны демонстрационные значения.
      </p>
    </div>
  );
}
