'use client';

import { useState, useEffect } from 'react';

interface PurchaseData {
  [key: string]: string;
}

interface TopPurchase {
  subject: string;
  cfo: string;
  purchaser: string;
  days: number;
  role: string;
  requestNumber: string;
}

export default function TopLongestPurchases() {
  const [topPurchases, setTopPurchases] = useState<TopPurchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ВРЕМЕННО ОТКЛЮЧЕНО
    return;
    fetch('/api/purchases-data?all=true&minimal=true')
      .then(res => res.json())
      .then(data => {
        calculateTopPurchases(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error:', err);
        setLoading(false);
      });
  }, []);

  const calculateTopPurchases = (purchases: PurchaseData[]) => {
    const parsedPurchases: TopPurchase[] = [];

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

    purchases.forEach(item => {
      // Используем уже вычисленный срок из "Дней всего согласования ЗП"
      const totalDaysStr = item['Дней всего согласования ЗП'] || '';
      const totalDays = parseInt(totalDaysStr) || 0;
      
      if (totalDays <= 0) return;
      
      let maxDays = 0;
      let maxRole = '';

      // Извлекаем роль с максимальным количеством дней (исключая "Дней в работе закупщика")
      for (const key in item) {
        if (key.includes('Дней в работе') && !key.includes('Дней в работе закупщика')) {
          const daysStr = item[key] || '';
          if (daysStr && daysStr.trim() !== '' && !daysStr.includes('Пропущено')) {
            const days = parseInt(daysStr);
            if (!isNaN(days) && days > maxDays) {
              maxDays = days;
              // Извлекаем название роли из названия колонки
              maxRole = key.replace('Согласование Заявки на ЗП', '').replace('Согласование результатов ЗП', '').replace('Закупочная комиссия', '').replace('Утверждение заявки на ЗП', '').replace('Проверка результата закупочной комиссии', '').replace('Руководитель закупщика', '').replace('Дней в работе', '').trim();
            }
          }
        }
      }

      // Пропускаем закупки без роли
      if (!maxRole || maxRole.trim() === '') return;

      // Debug: выводим первые несколько записей
      if (parsedPurchases.length < 3) {
        console.log('Запись:', item['№ заявки'], 'Предмет:', item['Предмет ЗП'], 'MaxDays:', maxDays, 'Role:', maxRole);
      }

      parsedPurchases.push({
        subject: item['Предмет ЗП'] || '-',
        cfo: item['ЦФО'] || '-',
        purchaser: item['Закупшик'] || '-',
        days: maxDays, // Показываем дни именно для этой роли
        role: maxRole,
        requestNumber: item['№ заявки'] || ''
      });
    });

    const sorted = parsedPurchases.sort((a, b) => b.days - a.days).slice(0, 10);
    setTopPurchases(sorted);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ru-RU').format(num);
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

  if (topPurchases.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Топ-10 закупок с самым длинным сроком выполнения</h3>
      
      {/* Десктопная версия */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 text-xs sm:text-sm font-semibold text-gray-700">№</th>
              <th className="text-left py-3 px-2 text-xs sm:text-sm font-semibold text-gray-700">Предмет</th>
              <th className="text-left py-3 px-2 text-xs sm:text-sm font-semibold text-gray-700">ЦФО</th>
              <th className="text-left py-3 px-2 text-xs sm:text-sm font-semibold text-gray-700">Закупщик</th>
              <th className="text-left py-3 px-2 text-xs sm:text-sm font-semibold text-gray-700">Срок (дней)</th>
              <th className="text-left py-3 px-2 text-xs sm:text-sm font-semibold text-gray-700">Роль</th>
            </tr>
          </thead>
          <tbody>
            {topPurchases.map((purchase, index) => (
              <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-2 text-xs sm:text-sm text-gray-900">{purchase.requestNumber}</td>
                <td className="py-3 px-2 text-xs sm:text-sm text-gray-700 max-w-xs truncate">{purchase.subject}</td>
                <td className="py-3 px-2 text-xs sm:text-sm text-gray-700">{purchase.cfo}</td>
                <td className="py-3 px-2 text-xs sm:text-sm text-gray-700 max-w-xs truncate">{purchase.purchaser}</td>
                <td className="py-3 px-2 text-xs sm:text-sm font-semibold text-blue-600">{purchase.days}</td>
                <td className="py-3 px-2 text-xs sm:text-sm text-gray-600">{purchase.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Мобильная версия */}
      <div className="md:hidden space-y-3">
        {topPurchases.map((purchase, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="font-semibold text-gray-900 text-sm mb-1">№{purchase.requestNumber}</div>
                <div className="text-xs text-gray-600 mb-2">{purchase.subject}</div>
              </div>
              <div className="text-xs font-semibold text-blue-600 ml-2">
                {purchase.days} дн.
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
              <div>
                <span className="text-gray-500">ЦФО:</span> {purchase.cfo}
              </div>
              <div>
                <span className="text-gray-500">Роль:</span> {purchase.role}
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">Закупщик:</span> {purchase.purchaser}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
