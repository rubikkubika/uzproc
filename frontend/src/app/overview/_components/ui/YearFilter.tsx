'use client';

interface YearFilterProps {
  selectedYear: number;
  onYearChange: (year: number) => void;
  availableYears: number[];
}

/**
 * UI компонент для фильтра по году планирования
 */
export function YearFilter({
  selectedYear,
  onYearChange,
  availableYears,
}: YearFilterProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center gap-3">
        <label htmlFor="year-filter" className="text-sm font-medium text-gray-700 whitespace-nowrap">
          Год планирования:
        </label>
        <select
          id="year-filter"
          value={selectedYear}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {availableYears.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
