'use client';

export interface DeliveryDashboardYearBarProps {
  year: number;
  availableYears: number[];
  onYearChange: (year: number) => void;
  /** Пояснение к расчёту справа от фильтра. */
  note?: string;
}

/** Панель фильтра дэшбордов по поставкам: год (общий для всех вкладок категории) и пояснение. */
export function DeliveryDashboardYearBar({ year, availableYears, onYearChange, note }: DeliveryDashboardYearBarProps) {
  return (
    <div className="bg-white rounded shadow px-2 py-1 flex flex-wrap items-center gap-1.5">
      <label htmlFor="delivery-dashboard-year" className="text-xs font-medium text-gray-700 whitespace-nowrap">
        Год:
      </label>
      <select
        id="delivery-dashboard-year"
        value={year}
        onChange={(e) => onYearChange(Number(e.target.value))}
        className="px-1.5 py-1 text-xs border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
      >
        {availableYears.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      {note && <span className="text-[10px] text-gray-500">{note}</span>}
    </div>
  );
}
