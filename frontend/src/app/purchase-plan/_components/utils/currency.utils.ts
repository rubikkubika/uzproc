import { USD_TO_UZS_RATE } from '../constants/purchase-plan-items.constants';

// Функция для форматирования бюджета с учетом выбранной валюты
export const formatBudget = (amount: number | null, selectedCurrency: 'UZS' | 'USD' = 'UZS'): string => {
  if (!amount) return '-';
  
  let displayAmount = amount;
  let currency = 'UZS';
  
  if (selectedCurrency === 'USD') {
    displayAmount = amount / USD_TO_UZS_RATE;
    currency = 'USD';
  }
  
  return new Intl.NumberFormat('ru-RU', {
    notation: 'compact',
    maximumFractionDigits: 1,
    ...(selectedCurrency === 'USD' ? { style: 'currency', currency: 'USD' } : {})
  }).format(displayAmount);
};

// Функция для форматирования бюджета с полным форматом (для детального просмотра)
export const formatBudgetFull = (amount: number | null, selectedCurrency: 'UZS' | 'USD' = 'UZS'): string => {
  if (!amount) return '-';
  
  let displayAmount = amount;
  let currency = 'UZS';
  
  if (selectedCurrency === 'USD') {
    displayAmount = amount / USD_TO_UZS_RATE;
    currency = 'USD';
  }
  
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(displayAmount);
};
