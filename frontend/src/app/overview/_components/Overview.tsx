'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useOverview } from './hooks/useOverview';
import { OverviewTabs } from './ui/OverviewTabs';
import { usePurchasePlanMonths } from './hooks/usePurchasePlanMonths';
import { PurchasePlanMonthBlock } from './ui/PurchasePlanMonthBlock';

/**
 * Главный компонент страницы обзор
 * Интегрирует все вкладки и их содержимое
 */
export default function Overview() {
  const { activeTab, setActiveTab } = useOverview();
  const {
    currentMonth,
    nextMonth,
    formatMonth,
    goToPreviousMonth,
    goToNextMonth,
    hasPreviousMonth,
    hasNextMonth,
    selectedYear,
    availableYears,
    handleYearChange,
  } = usePurchasePlanMonths();

  return (
    <div className="space-y-2 sm:space-y-3">
      <OverviewTabs activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div className="w-full">
        {activeTab === 'purchase-plan' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Фильтр по году планирования */}
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="flex items-center gap-3">
                <label htmlFor="year-filter" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  Год планирования:
                </label>
                <select
                  id="year-filter"
                  value={selectedYear}
                  onChange={(e) => handleYearChange(Number(e.target.value))}
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

            {/* Кнопка "Предыдущий месяц" сверху */}
            {hasPreviousMonth && (
              <button
                onClick={goToPreviousMonth}
                className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-5 h-5" />
                <span>Предыдущий месяц</span>
              </button>
            )}

            {/* Блок текущего месяца */}
            <PurchasePlanMonthBlock
              title={formatMonth(currentMonth)}
              isCurrentMonth={true}
            />

            {/* Блок следующего месяца */}
            <PurchasePlanMonthBlock
              title={formatMonth(nextMonth)}
              isCurrentMonth={false}
            />

            {/* Кнопка "Следующий месяц" снизу */}
            {hasNextMonth && (
              <button
                onClick={goToNextMonth}
                className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <span>Следующий месяц</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
