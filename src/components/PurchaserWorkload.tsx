'use client';

import { useState, useEffect } from 'react';

interface PurchaseData {
  [key: string]: string;
}

interface PurchaserStats {
  purchaser: string;
  totalPurchases: number;
  activePurchases: number;
  completedPurchases: number;
  pendingPurchases: number;
  averageDays: number;
  totalAmount: number;
}

export default function PurchaserWorkload() {
  const [stats, setStats] = useState<PurchaserStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/purchases-data')
      .then(res => res.json())
      .then(data => {
        calculateWorkload(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error:', err);
        setLoading(false);
      });
  }, []);

  const calculateWorkload = (purchases: PurchaseData[]) => {
    const purchaserMap = new Map<string, {
      total: number;
      active: number;
      completed: number;
      pending: number;
      totalDays: number;
      purchasesWithDays: number;
      totalAmount: number;
    }>();

    purchases.forEach(item => {
      const purchaser = item['Закупшик'] || 'Не назначен';
      const status = item['Состояние заявки на ЗП'] || '';
      const amount = parseFloat((item['Cумма предпологаемого контракта ФАКТ'] || '0').replace(/\s/g, '').replace(',', '.'));
      const totalDaysStr = item['Дней всего согласования ЗП'] || '';
      const totalDays = parseInt(totalDaysStr) || 0;

      if (!purchaserMap.has(purchaser)) {
        purchaserMap.set(purchaser, {
          total: 0,
          active: 0,
          completed: 0,
          pending: 0,
          totalDays: 0,
          purchasesWithDays: 0,
          totalAmount: 0
        });
      }

      const stats = purchaserMap.get(purchaser)!;
      stats.total++;

      if (status.includes('Согласован')) {
        stats.completed++;
      } else if (status && !status.includes('Удалена')) {
        stats.active++;
      }

      if (totalDays > 0) {
        stats.totalDays += totalDays;
        stats.purchasesWithDays++;
      }

      if (!isNaN(amount)) {
        stats.totalAmount += amount;
      }
    });

    const result: PurchaserStats[] = Array.from(purchaserMap.entries()).map(([purchaser, data]) => ({
      purchaser,
      totalPurchases: data.total,
      activePurchases: data.active,
      completedPurchases: data.completed,
      pendingPurchases: data.active, // Активные = в работе
      averageDays: data.purchasesWithDays > 0 ? Math.round(data.totalDays / data.purchasesWithDays) : 0,
      totalAmount: data.totalAmount
    }));

    // Сортируем по убыванию нагрузки (активные + общее количество)
    const sorted = result.sort((a, b) => (b.activePurchases + b.totalPurchases) - (a.activePurchases + a.totalPurchases));
    setStats(sorted);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Нагрузка на закупщиков</h2>
        <p className="text-sm text-gray-600 mb-4">Анализ распределения закупок и рабочей нагрузки</p>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left py-3 px-2 text-xs sm:text-sm font-semibold text-gray-700">Закупщик</th>
                <th className="text-left py-3 px-2 text-xs sm:text-sm font-semibold text-gray-700">Всего закупок</th>
                <th className="text-left py-3 px-2 text-xs sm:text-sm font-semibold text-gray-700">Завершено</th>
                <th className="text-left py-3 px-2 text-xs sm:text-sm font-semibold text-gray-700">В работе</th>
                <th className="text-left py-3 px-2 text-xs sm:text-sm font-semibold text-gray-700">Среднее время (дн.)</th>
                <th className="text-left py-3 px-2 text-xs sm:text-sm font-semibold text-gray-700">Общая сумма</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((stat, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-2 text-xs sm:text-sm text-gray-900 font-medium">{stat.purchaser}</td>
                  <td className="py-3 px-2 text-xs sm:text-sm text-gray-700">{stat.totalPurchases}</td>
                  <td className="py-3 px-2 text-xs sm:text-sm text-green-600 font-semibold">{stat.completedPurchases}</td>
                  <td className="py-3 px-2 text-xs sm:text-sm text-blue-600 font-semibold">{stat.activePurchases}</td>
                  <td className="py-3 px-2 text-xs sm:text-sm text-gray-700">{stat.averageDays > 0 ? stat.averageDays : '-'}</td>
                  <td className="py-3 px-2 text-xs sm:text-sm text-gray-700">{formatNumber(stat.totalAmount)} сум</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
