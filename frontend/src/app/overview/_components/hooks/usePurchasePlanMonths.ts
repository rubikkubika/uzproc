'use client';

import { useState, useMemo } from 'react';

/**
 * Хук для управления месяцами в плане закупок
 */
export function usePurchasePlanMonths() {
  const now = new Date();
  const currentYear = now.getFullYear();
  
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [currentMonthOffset, setCurrentMonthOffset] = useState(0);

  // Доступные годы для фильтра (текущий год и несколько лет вперед/назад)
  const availableYears = useMemo(() => {
    const years: number[] = [];
    for (let i = currentYear - 2; i <= currentYear + 5; i++) {
      years.push(i);
    }
    return years;
  }, [currentYear]);

  // Сброс смещения при изменении года
  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    setCurrentMonthOffset(0);
  };

  // Получаем текущий месяц с учетом смещения и выбранного года
  const getCurrentMonth = () => {
    const now = new Date();
    const nowYear = now.getFullYear();
    const nowMonth = now.getMonth();
    
    // Если выбран другой год, начинаем с января выбранного года
    if (selectedYear !== nowYear) {
      const dateInSelectedYear = new Date(selectedYear, 0, 1);
      dateInSelectedYear.setMonth(dateInSelectedYear.getMonth() + currentMonthOffset);
      return dateInSelectedYear;
    }
    
    // Если выбран текущий год, используем текущий месяц + смещение
    const date = new Date(nowYear, nowMonth, 1);
    date.setMonth(date.getMonth() + currentMonthOffset);
    return date;
  };

  // Получаем предыдущий месяц (текущий - 1)
  const getPreviousMonth = () => {
    const date = getCurrentMonth();
    const prev = new Date(date.getFullYear(), date.getMonth() - 1, 1);
    return prev;
  };

  // Получаем следующий месяц (текущий + 1)
  const getNextMonth = () => {
    const date = getCurrentMonth();
    const next = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    return next;
  };

  // Переключение на месяц назад
  const goToPreviousMonth = () => {
    setCurrentMonthOffset(prev => prev - 1);
  };

  // Переключение на месяц вперед
  const goToNextMonth = () => {
    setCurrentMonthOffset(prev => prev + 1);
  };

  // Форматирование месяца для отображения
  const formatMonth = (date: Date) => {
    const monthNames = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
  };

  // Проверка, есть ли предыдущий месяц в выбранном году
  const hasPreviousMonth = () => {
    const current = getCurrentMonth();
    // Проверяем, что не в январе выбранного года
    return current.getMonth() > 0 || current.getFullYear() < selectedYear;
  };

  // Проверка, есть ли следующий месяц в выбранном году
  const hasNextMonth = () => {
    const next = getNextMonth();
    // Проверяем, что следующий месяц все еще в выбранном году (не декабрь или не перешли в следующий год)
    return next.getFullYear() === selectedYear;
  };

  return {
    previousMonth: getPreviousMonth(),
    currentMonth: getCurrentMonth(),
    nextMonth: getNextMonth(),
    formatMonth,
    goToPreviousMonth,
    goToNextMonth,
    currentMonthOffset,
    hasPreviousMonth: hasPreviousMonth(),
    hasNextMonth: hasNextMonth(),
    selectedYear,
    availableYears,
    handleYearChange,
  };
}
