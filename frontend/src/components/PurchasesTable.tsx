'use client';

import React, { useState, useEffect, useMemo } from 'react';

interface PurchaseData {
  [key: string]: string;
}

export default function PurchasesTable() {
  const [data, setData] = useState<PurchaseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(''); // Текст в поле поиска
  const [searchQuery, setSearchQuery] = useState(''); // Активный поисковый запрос
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' | null }>({ key: null, direction: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 50;

  // Загрузка данных с сервера с пагинацией и поиском
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const searchParam = searchQuery.trim() ? `&search=${encodeURIComponent(searchQuery.trim())}` : '';
        const url = `/api/purchases-data?page=${currentPage}&limit=${itemsPerPage}${searchParam}`;
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const result = await res.json();
        
        setData(result.data);
        setTotalPages(result.pagination.totalPages);
        setTotalItems(result.pagination.total);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setLoading(false);
      }
    };
    
    loadData();
  }, [currentPage, itemsPerPage, searchQuery]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Получаем все доступные ключи из первой записи (мемоизировано)
  const allHeaders = useMemo(() => {
    return data.length > 0 ? Object.keys(data[0]) : [];
  }, [data]);
  
  // Важные колонки, которые будут в начале и с сортировкой
  const importantHeaders = [
    '№ заявки',
    'ЦФО', 
    'Предмет ЗП',
    'Формат ЗП',
    'Инициатор ЗП',
    'Закупшик',
    'Дата создания ЗП',
    'Лимит ЗП ПЛАН (сум без НДС)',
    'Состояние заявки на ЗП',
    'Cумма предпологаемого контракта ФАКТ',
    'Экономия'
  ];
  
  // Сортировка данных (мемоизировано) - данные уже отфильтрованы на сервере
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;
    
    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key!] || '';
      const bValue = b[sortConfig.key!] || '';
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  // Сброс на первую страницу при изменении поиска
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Обработчик поиска по Enter
  const handleSearch = () => {
    setSearchQuery(searchInput);
  };

  // Обработчик нажатия Enter
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Вычисляем индексы для отображения
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

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
      // Новый формат: DD.MM.YYYY HH:MM или DD.MM.YYYY
      if (dateStr.includes('.')) {
        const [datePart] = dateStr.split(' ');
        return datePart; // Возвращаем только дату без времени
      }
      // Старый формат: DD/MM/YYYY
      const [day, month, year] = dateStr.split('/');
      return `${day}.${month}.${year}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg shadow-lg overflow-hidden">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Реестр закупок</h2>
            <p className="text-sm text-gray-600">Всего записей: {totalItems}</p>
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
          <div className="flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Поиск по номеру заявки, предмету, ЦФО, инициатору, закупщику, поставщику, комментарию... (нажмите Enter)"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={handleKeyPress}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 placeholder-gray-500"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
            >
              Найти
            </button>
          </div>
          {searchQuery && (
            <div className="mt-2 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Найдено результатов: {totalItems}
              </div>
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchInput('');
                    setSearchQuery('');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Очистить поиск
                </button>
              )}
            </div>
          )}
        </div>

        {/* Область таблицы */}
        {loading ? (
          <div className="p-6 text-center text-gray-500">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/4 mx-auto"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        ) : sortedData.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            {searchQuery ? 'Ничего не найдено' : 'Нет данных'}
          </div>
        ) : (
          <>
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

            {/* Пагинация */}
            {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
            <div className="text-sm text-gray-700">
              Показано {startIndex + 1} - {endIndex} из {totalItems} записей
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Назад
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    // Показываем первую, последнюю, текущую и соседние страницы
                    return page === 1 || 
                           page === totalPages || 
                           (page >= currentPage - 2 && page <= currentPage + 2);
                  })
                  .map((page, index, array) => {
                    // Добавляем многоточие если есть пропуски
                    const showEllipsis = index > 0 && array[index - 1] !== page - 1;
                    return (
                      <React.Fragment key={page}>
                        {showEllipsis && (
                          <span className="px-2 text-gray-500">...</span>
                        )}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-2 text-sm font-medium rounded-lg ${
                            currentPage === page
                              ? 'bg-blue-500 text-white'
                              : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Вперед
              </button>
            </div>
            </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

