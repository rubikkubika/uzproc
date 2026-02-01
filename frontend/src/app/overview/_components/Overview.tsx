'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useOverview } from './hooks/useOverview';
import { OverviewTabs } from './ui/OverviewTabs';
import { usePurchasePlanMonths } from './hooks/usePurchasePlanMonths';
import { PurchasePlanMonthBlock } from './ui/PurchasePlanMonthBlock';
import AllCsiFeedback from './ui/AllCsiFeedback';

/**
 * Главный компонент страницы обзор
 * Интегрирует все вкладки и их содержимое
 */
export default function Overview() {
  const { activeTab, setActiveTab } = useOverview();
  const {
    previousMonth,
    currentMonth,
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
    <div className="space-y-1 sm:space-y-2">
      <OverviewTabs activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div className="w-full">
        {activeTab === 'csi' && (
          <div className="w-1/2">
            <AllCsiFeedback />
          </div>
        )}
        {activeTab === 'purchase-plan' && (
          <div className="space-y-2 sm:space-y-3">
            {/* Фильтр по году планирования */}
            <div className="bg-white rounded-lg shadow-lg p-2 sm:p-3">
              <div className="flex items-center gap-2">
                <label htmlFor="year-filter" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  Год планирования:
                </label>
                <select
                  id="year-filter"
                  value={selectedYear}
                  onChange={(e) => handleYearChange(Number(e.target.value))}
                  className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                className="w-full py-0.5 px-2 min-h-0 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-xs rounded transition-colors flex items-center justify-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
                <span>Предыдущий месяц</span>
              </button>
            )}

            {/* Сверху: месяц −1 от текущего */}
            <PurchasePlanMonthBlock
              title={formatMonth(previousMonth)}
              year={previousMonth.getFullYear()}
              month={previousMonth.getMonth()}
              isCurrentMonth={false}
            />

            {/* Снизу: текущий месяц */}
            <PurchasePlanMonthBlock
              title={formatMonth(currentMonth)}
              year={currentMonth.getFullYear()}
              month={currentMonth.getMonth()}
              isCurrentMonth={true}
            />

            {/* Кнопка "Следующий месяц" снизу */}
            {hasNextMonth && (
              <button
                onClick={goToNextMonth}
                className="w-full py-0.5 px-2 min-h-0 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-xs rounded transition-colors flex items-center justify-center gap-1"
              >
                <span>Следующий месяц</span>
                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
