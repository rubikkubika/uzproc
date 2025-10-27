'use client';

import { useState, useEffect } from 'react';

interface PurchaseData {
  [key: string]: string;
}

export default function PurchasesTable() {
  const [data, setData] = useState<PurchaseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' | null }>({ key: null, direction: null });

  useEffect(() => {
    fetch('/api/purchases-data')
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        console.log('Data received:', data);
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching data:', err);
        setLoading(false);
      });
  }, []);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Получаем все доступные ключи из первой записи
  const allHeaders = data.length > 0 ? Object.keys(data[0]) : [];
  
  // Важные колонки, которые будут в начале и с сортировкой
  const importantHeaders = [
    '№ заявки',
    'ЦФО', 
    'Предмет ЗП',
    'Формат ЗП',
    'Инициатор ЗП',
    'Закупшик',
    'Дата создания',
    'Лимит ЗП ПЛАН (сум без НДС)',
    'Состояние заявки на ЗП',
    'Cумма предпологаемого контракта ФАКТ',
    'Экономия'
  ];
  
  // Остальные колонки (исключая пустые column_N)
  const otherHeaders = allHeaders.filter(h => !importantHeaders.includes(h) && !h.startsWith('column_'));
  
  const filteredData = data.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item['№ заявки']?.toLowerCase().includes(searchLower) ||
      item['Предмет ЗП']?.toLowerCase().includes(searchLower) ||
      item['ЦФО']?.toLowerCase().includes(searchLower) ||
      item['Инициатор ЗП']?.toLowerCase().includes(searchLower) ||
      item['Закупшик']?.toLowerCase().includes(searchLower) ||
      item['Наименование поставщика (Закупочная процедура)']?.toLowerCase().includes(searchLower) ||
      item['Комментарий']?.toLowerCase().includes(searchLower) ||
      item['Комментарий руководителя закупок (Заявка на ЗП)']?.toLowerCase().includes(searchLower)
    );
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    const aValue = a[sortConfig.key] || '';
    const bValue = b[sortConfig.key] || '';
    
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const formatNumber = (value: string) => {
    if (!value || value.trim() === '') return '-';
    // Удаляем все пробелы и заменяем запятую на точку
    const cleanedValue = value.replace(/\s/g, '').replace(',', '.');
    const num = parseFloat(cleanedValue);
    if (isNaN(num)) return value;
    return new Intl.NumberFormat('ru-RU', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    }).format(num);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const [day, month, year] = dateStr.split('/');
      return `${day}.${month}.${year}`;
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <p className="text-gray-500">Нет данных для отображения</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg shadow-lg overflow-hidden">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Реестр закупок</h2>
            <p className="text-sm text-gray-600">Всего записей: {sortedData.length}</p>
          </div>
          <button
            onClick={() => {
              const table = document.querySelector('table');
              if (table) {
                const text = table.innerText;
                navigator.clipboard.writeText(text).then(() => {
                  alert('Таблица скопирована в буфер обмена!');
                }).catch(err => {
                  console.error('Ошибка при копировании:', err);
                  alert('Не удалось скопировать');
                });
              }
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
          >
            📋 Копировать таблицу
          </button>
        </div>
        
        {/* Поиск */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Поиск по номеру заявки, предмету, ЦФО, инициатору, закупщику, поставщику, комментарию..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Таблица */}
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="min-w-full divide-y divide-gray-200 whitespace-nowrap">
            <thead className="bg-gray-50">
              <tr>
                {allHeaders.map((header, idx) => {
                  if (header.startsWith('column_')) return null;
                  return (
                    <th 
                      key={idx}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort(header)}
                    >
                      {header || `Колонка ${idx}`} {sortConfig.key === header && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedData.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  {allHeaders.map((header, idx) => {
                    if (header.startsWith('column_')) return null;
                    const value = item[header] || '';
                    
                    // Специальная обработка для некоторых колонок
                    let cellContent;
                    if (header.includes('Дата')) {
                      cellContent = formatDate(value);
                    } else if (header.includes('сум') || header.includes('Сумма') || header.includes('Лимит')) {
                      cellContent = formatNumber(value);
                    } else if (header.includes('Состояние') || header.includes('Статус')) {
                      cellContent = (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          value?.includes('Согласован') 
                            ? 'bg-green-100 text-green-800'
                            : value?.includes('Не согласован')
                            ? 'bg-red-100 text-red-800'
                            : value?.includes('Удалена')
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {value || '-'}
                        </span>
                      );
                    } else {
                      cellContent = value || '-';
                    }
                    
                    return (
                      <td key={idx} className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {typeof cellContent === 'string' ? (
                          <div className="max-w-xs truncate" title={cellContent}>
                            {cellContent}
                          </div>
                        ) : (
                          cellContent
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sortedData.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Записи не найдены
          </div>
        )}
      </div>
    </div>
  );
}

