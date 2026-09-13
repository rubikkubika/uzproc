'use client';

interface Props {
  availableYears: number[];
  selectedYear: number | null;
  showNoDate: boolean;
  onShowAll: () => void;
  onYearChange: (year: number) => void;
  onShowNoDate: () => void;
}

const BASE = 'text-[12px] px-2.5 py-1 rounded-md border transition-colors';
const IDLE = 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100';
const ACTIVE = 'bg-blue-600 border-blue-600 text-white font-semibold';

/** Фильтр по году даты поставки: «Все», годы и «Без даты» (всегда выделена оранжевым — это разбирают первым). */
export default function DeliveryYearFilter({ availableYears, selectedYear, showNoDate, onShowAll, onYearChange, onShowNoDate }: Props) {
  return (
    <div data-tour="date-filter" className="flex items-center gap-1.5 flex-wrap">
      <span className="text-slate-500 mr-0.5">Дата:</span>
      <button type="button" onClick={onShowAll} className={`${BASE} ${selectedYear === null && !showNoDate ? ACTIVE : IDLE}`}>
        Все
      </button>
      {availableYears.map((year) => (
        <button
          key={year}
          type="button"
          onClick={() => onYearChange(year)}
          className={`${BASE} ${selectedYear === year && !showNoDate ? ACTIVE : IDLE}`}
        >
          {year}
        </button>
      ))}
      <button
        type="button"
        onClick={onShowNoDate}
        className={`${BASE} font-semibold ${
          showNoDate ? 'bg-orange-600 border-orange-600 text-white' : 'border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100'
        }`}
      >
        Без даты
      </button>
    </div>
  );
}
