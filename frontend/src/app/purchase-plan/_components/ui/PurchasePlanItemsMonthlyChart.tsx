'use client';

import React from 'react';

interface PurchasePlanItemsMonthlyChartProps {
  monthlyDistribution: number[];
  selectedYear: number | null;
  chartData: Array<{ year: number | null }>;
  selectedMonths: Set<number>;
  selectedMonthYear: number | null;
  lastSelectedMonthIndex: number | null;
  setSelectedMonthYear: (year: number | null) => void;
  setSelectedYear: (year: number | null) => void;
  setSelectedMonths: (months: Set<number>) => void;
  setLastSelectedMonthIndex: (index: number) => void;
}

/**
 * Компонент столбчатой диаграммы распределения закупок по месяцам
 * Отображается в заголовке колонки requestDate над диаграммой Ганта
 */
export default function PurchasePlanItemsMonthlyChart({
  monthlyDistribution,
  selectedYear,
  chartData,
  selectedMonths,
  selectedMonthYear,
  lastSelectedMonthIndex,
  setSelectedMonthYear,
  setSelectedYear,
  setSelectedMonths,
  setLastSelectedMonthIndex,
}: PurchasePlanItemsMonthlyChartProps) {
  const monthlyCounts = monthlyDistribution.slice(0, 13);
  const maxCount = Math.max(...monthlyCounts, 1);
  const monthLabels = ['Дек', 'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек', 'Без даты'];
  const displayYear = selectedYear || chartData[0]?.year || new Date().getFullYear();
  const prevYear = displayYear - 1;

  return (
    <div className="flex-1 flex items-end h-20 relative" style={{ minHeight: '80px', height: '80px', paddingLeft: '0', paddingRight: '0', gap: '2px', width: '100%' }}>
      {monthlyDistribution.map((count, index) => {
        const isNoDate = index === 13;
        
        if (isNoDate && count === 0) {
          return null;
        }
        
        const containerHeight = 80;
        const topMargin = 2;
        const availableHeight = containerHeight - topMargin;
        let columnHeight = 0;
        
        if (isNoDate) {
          columnHeight = availableHeight;
        } else if (count > 0 && maxCount > 0) {
          const ratio = count / maxCount;
          const scaledRatio = Math.pow(ratio, 0.4);
          columnHeight = scaledRatio * availableHeight;
          if (columnHeight < 8) {
            columnHeight = 8;
          }
        }
        
        let monthForFilter: number | null = null;
        let yearForFilter: number | null = null;
        if (index === 0) {
          monthForFilter = 11;
          yearForFilter = prevYear;
        } else if (index >= 1 && index <= 12) {
          monthForFilter = index - 1;
          yearForFilter = displayYear;
        } else if (index === 13) {
          monthForFilter = -1;
          yearForFilter = null;
        }
        
        const monthKey = monthForFilter === -1 ? -1 : (index === 0 ? -2 : monthForFilter);
        let isSelected = false;
        if (monthKey !== null && selectedMonths.has(monthKey)) {
          if (monthForFilter === -1) {
            isSelected = true;
          } else if (index === 0) {
            isSelected = selectedMonthYear === prevYear;
          } else if (index >= 1 && index <= 12) {
            isSelected = true;
          }
        }
        
        return (
          <div key={index} className="flex flex-col items-center relative" style={{ minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flex: '0 0 calc((100% - 24px) / 13)' }}>
            <div 
              className={`w-full rounded-t transition-colors relative group cursor-pointer ${
                isNoDate
                  ? isSelected
                    ? 'bg-red-700 ring-2 ring-red-400'
                    : 'bg-red-500 hover:bg-red-600'
                  : isSelected 
                    ? 'bg-blue-700 ring-2 ring-blue-400' 
                    : count > 0 
                      ? 'bg-blue-500 hover:bg-blue-600' 
                      : 'bg-gray-200'
              }`}
              style={{ 
                height: `${columnHeight}px`,
                minHeight: count > 0 ? '2px' : '0px',
                maxHeight: containerHeight + 'px',
                flexShrink: 0
              }}
              title={`${monthLabels[index]}: ${count} закупок`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (monthForFilter !== null) {
                  const currentDisplayYear = selectedYear || chartData[0]?.year || new Date().getFullYear();
                  const currentPrevYear = currentDisplayYear - 1;
                  const monthKey = monthForFilter === -1 ? -1 : (index === 0 ? -2 : monthForFilter);
                  const isCurrentlySelected = selectedMonths.has(monthKey) && 
                    (monthForFilter === -1 || 
                     (index === 0 && selectedMonthYear === currentPrevYear) || 
                     (index >= 1 && index <= 12));
                  
                  const shiftPressed = Boolean(e.shiftKey);
                  
                  if (shiftPressed && lastSelectedMonthIndex !== null && lastSelectedMonthIndex !== index && !isCurrentlySelected) {
                    const startIndex = Math.min(lastSelectedMonthIndex, index);
                    const endIndex = Math.max(lastSelectedMonthIndex, index);
                    const newSelectedMonths = new Set(selectedMonths);
                    
                    for (let i = startIndex; i <= endIndex; i++) {
                      let monthKeyForRange: number;
                      let yearForRange: number | null = null;
                      
                      if (i === 0) {
                        monthKeyForRange = -2;
                        yearForRange = currentPrevYear;
                      } else if (i >= 1 && i <= 12) {
                        monthKeyForRange = i - 1;
                        yearForRange = null;
                      } else if (i === 13) {
                        monthKeyForRange = -1;
                        yearForRange = null;
                      } else {
                        continue;
                      }
                      
                      newSelectedMonths.add(monthKeyForRange);
                      
                      if (i === 0 && yearForRange !== null) {
                        setSelectedMonthYear(yearForRange);
                      }
                    }
                    
                    setSelectedMonths(newSelectedMonths);
                    setLastSelectedMonthIndex(index);
                    return;
                  }
                  
                  const newSelectedMonths = new Set<number>();
                  
                  if (!isCurrentlySelected) {
                    newSelectedMonths.add(monthKey);
                    if (index === 0 && yearForFilter !== null) {
                      setSelectedMonthYear(yearForFilter);
                    } else if (index >= 1 && index <= 12) {
                      setSelectedMonthYear(null);
                      if (yearForFilter !== null && selectedYear === null) {
                        setSelectedYear(yearForFilter);
                      }
                    } else if (monthForFilter === -1) {
                      setSelectedMonthYear(null);
                    }
                  } else {
                    setSelectedMonthYear(null);
                  }
                  
                  setSelectedMonths(newSelectedMonths);
                  setLastSelectedMonthIndex(index);
                }
              }}
            >
              {count > 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-[9px] text-white font-bold whitespace-nowrap pointer-events-none" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                  {count}
                </div>
              )}
            </div>
            <div className={`text-[8px] text-center ${isSelected ? 'font-bold text-blue-700' : 'text-gray-500'}`} style={{ lineHeight: '1' }}>
              {monthLabels[index]}
            </div>
          </div>
        );
      })}
    </div>
  );
}
