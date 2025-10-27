'use client';

import { useState, useEffect } from 'react';

export default function PurchasesStats() {
  const [stats, setStats] = useState({
    totalPurchases: 0,
    totalAmount: 0,
    averageDays: 0,
    totalSavings: 0,
    activePurchases: 0,
    completedPurchases: 0,
    rejectedPurchases: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/purchases-data')
      .then(res => res.json())
      .then(data => {
        if (!data || data.length === 0) return;
        
        // Подсчет статистики
        const total = data.length;
        let totalAmount = 0;
        let totalSavings = 0;
        let active = 0;
        let completed = 0;
        let rejected = 0;
        let totalApprovalDays = 0;
        let validPurchases = 0;
        
        data.forEach(item => {
          // Суммы
          const amount = parseFloat((item['Cумма предпологаемого контракта ФАКТ'] || '0').replace(/\s/g, '').replace(',', '.'));
          const saving = parseFloat((item['Экономия'] || '0').replace(/\s/g, '').replace(',', '.'));
          
          if (!isNaN(amount)) totalAmount += amount;
          if (!isNaN(saving)) totalSavings += saving;
          
          // Статусы
          const status = item['Состояние заявки на ЗП'] || '';
          if (status.includes('Согласован')) completed++;
          else if (status.includes('Не согласован')) rejected++;
          else if (status && !status.includes('Удалена')) active++;
          
          // Вычисляем срок согласования по всем датам назначения и выполнения
          let minAssignmentDate: Date | null = null;
          let maxCompletionDate: Date | null = null;
          
          const parseDate = (dateStr: string): Date | null => {
            if (!dateStr || dateStr.includes('Пропущено') || dateStr.trim() === '') return null;
            try {
              const parts = dateStr.split(/[\/\.]/);
              if (parts.length === 3) {
                const day = parseInt(parts[0]);
                const month = parseInt(parts[1]) - 1;
                const year = parseInt(parts[2]);
                return new Date(year, month, day);
              }
            } catch {}
            return null;
          };
          
          // Ищем все даты назначения и выполнения
          for (const key in item) {
            if (key.includes('Дата назначения')) {
              const date = parseDate(item[key]);
              if (date && (!minAssignmentDate || date < minAssignmentDate)) {
                minAssignmentDate = date;
              }
            } else if (key.includes('Дата выполнения')) {
              const date = parseDate(item[key]);
              if (date && (!maxCompletionDate || date > maxCompletionDate)) {
                maxCompletionDate = date;
              }
            }
          }
          
          // Вычисляем разницу в днях
          if (minAssignmentDate && maxCompletionDate && maxCompletionDate >= minAssignmentDate) {
            const diffMs = maxCompletionDate.getTime() - minAssignmentDate.getTime();
            const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
            if (diffDays >= 0) {
              totalApprovalDays += diffDays;
              validPurchases++;
            }
          }
        });
        
        setStats({
          totalPurchases: total,
          totalAmount,
          averageDays: validPurchases > 0 ? Math.round(totalApprovalDays / validPurchases) : 0,
          totalSavings,
          activePurchases: active,
          completedPurchases: completed,
          rejectedPurchases: rejected
        });
        setLoading(false);
      })
      .catch(err => {
        console.error('Error:', err);
        setLoading(false);
      });
  }, []);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ru-RU', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    }).format(num);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white p-3 sm:p-4 lg:p-6 rounded-lg shadow-lg animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
      <div className="bg-white p-3 sm:p-4 lg:p-6 rounded-lg shadow-lg">
        <div className="flex items-center">
          <div className="p-2 sm:p-3 rounded-full bg-blue-100">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 8c-1.11 0-2.08.402-2.599 1" />
            </svg>
          </div>
          <div className="ml-2 sm:ml-3 lg:ml-4">
            <p className="text-xs sm:text-sm font-medium text-gray-600">Общая сумма</p>
            <p className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900">
              {formatNumber(stats.totalAmount)} сум
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white p-3 sm:p-4 lg:p-6 rounded-lg shadow-lg">
        <div className="flex items-center">
          <div className="p-2 sm:p-3 rounded-full bg-blue-100">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-2 sm:ml-3 lg:ml-4">
            <p className="text-xs sm:text-sm font-medium text-gray-600">Завершено закупок</p>
            <p className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900">{stats.completedPurchases}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-3 sm:p-4 lg:p-6 rounded-lg shadow-lg">
        <div className="flex items-center">
          <div className="p-2 sm:p-3 rounded-full bg-blue-100">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 8c-1.11 0-2.08.402-2.599 1" />
            </svg>
          </div>
          <div className="ml-2 sm:ml-3 lg:ml-4">
            <p className="text-xs sm:text-sm font-medium text-gray-600">Экономия</p>
            <p className="text-lg sm:text-xl lg:text-2xl font-semibold text-blue-600">
              {formatNumber(stats.totalSavings)} сум
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}

