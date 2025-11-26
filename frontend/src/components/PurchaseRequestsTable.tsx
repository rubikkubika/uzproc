'use client';

import { useState, useEffect } from 'react';
import { getBackendUrl } from '@/utils/api';

interface PurchaseRequest {
  id: number;
  idPurchaseRequest: number | null;
  guid: string;
  purchasePlanYear: number | null;
  company: string | null;
  cfo: string | null;
  mcc: string | null;
  purchaseInitiator: string | null;
  name: string | null;
  purchaseRequestCreationDate: string | null;
  budgetAmount: number | null;
  costType: string | null;
  contractType: string | null;
  contractDurationMonths: number | null;
  isPlanned: boolean | null;
  createdAt: string;
  updatedAt: string;
}

interface PageResponse {
  content: PurchaseRequest[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export default function PurchaseRequestsTable() {
  const [data, setData] = useState<PageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number | null>(currentYear);

  const fetchData = async (page: number, size: number, year: number | null = null) => {
    setLoading(true);
    setError(null);
    try {
      let url = `${getBackendUrl()}/api/purchase-requests?page=${page}&size=${size}`;
      if (year !== null) {
        url += `&year=${year}`;
      }
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Ошибка загрузки данных');
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(currentPage, pageSize, selectedYear);
  }, [currentPage, pageSize, selectedYear]);

  // Получаем список уникальных годов из данных
  const getAvailableYears = (): number[] => {
    if (!data || !data.content) return [];
    const years = new Set<number>();
    data.content.forEach((request) => {
      if (request.purchaseRequestCreationDate) {
        const date = new Date(request.purchaseRequestCreationDate);
        const year = date.getFullYear();
        if (!isNaN(year)) {
          years.add(year);
        }
      }
    });
    return Array.from(years).sort((a, b) => b - a); // Сортируем по убыванию
  };

  // Получаем все годы из всех данных (нужно загрузить все данные для этого)
  const [allYears, setAllYears] = useState<number[]>([]);

  useEffect(() => {
    // Загружаем все данные для получения списка годов
    const fetchAllYears = async () => {
      try {
        const response = await fetch(`${getBackendUrl()}/api/purchase-requests?page=0&size=10000`);
        if (response.ok) {
          const result = await response.json();
          const years = new Set<number>();
          result.content.forEach((request: PurchaseRequest) => {
            if (request.purchaseRequestCreationDate) {
              const date = new Date(request.purchaseRequestCreationDate);
              const year = date.getFullYear();
              if (!isNaN(year)) {
                years.add(year);
              }
            }
          });
          setAllYears(Array.from(years).sort((a, b) => b - a));
        }
      } catch (err) {
        console.error('Error fetching years:', err);
      }
    };
    fetchAllYears();
  }, []);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(0); // Сбрасываем на первую страницу при изменении размера
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-500">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <div className="text-center py-8">
          <p className="text-red-600">Ошибка: {error}</p>
              <button
                onClick={() => fetchData(currentPage, pageSize)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Повторить
              </button>
        </div>
      </div>
    );
  }

  if (!data || data.content.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <div className="text-center py-8">
          <p className="text-gray-500">Нет данных</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700 font-medium">Фильтр по году создания:</span>
            {allYears.map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  selectedYear === year
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {year}
              </button>
            ))}
            <button
              onClick={() => setSelectedYear(null)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                selectedYear === null
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Все
            </button>
          </div>
          <p className="text-sm text-gray-500">
            Всего записей: {data.totalElements}
          </p>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 whitespace-nowrap" style={{ width: 'auto', minWidth: 'fit-content' }}>
                Номер
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20 border-r border-gray-300">
                ЦФО
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24 border-r border-gray-300">
                Инициатор
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                Наименование
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28 border-r border-gray-300">
                Бюджет
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20 border-r border-gray-300">
                Затраты
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20 border-r border-gray-300">
                Договор
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16 border-r border-gray-300">
                Срок
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                План
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.content.map((request) => (
              <tr key={request.id} className="hover:bg-gray-50">
                <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-200 min-w-fit">
                  {request.idPurchaseRequest || '-'}
                </td>
                <td className="px-2 py-2 text-xs text-gray-900 truncate border-r border-gray-200" title={request.cfo || ''}>
                  {request.cfo || '-'}
                </td>
                <td className="px-2 py-2 text-xs text-gray-900 truncate border-r border-gray-200" title={request.purchaseInitiator || ''}>
                  {request.purchaseInitiator || '-'}
                </td>
                <td className="px-2 py-2 text-xs text-gray-900 truncate border-r border-gray-200" title={request.name || ''}>
                  {request.name || '-'}
                </td>
                <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-200">
                  {request.budgetAmount ? new Intl.NumberFormat('ru-RU', { 
                    notation: 'compact',
                    maximumFractionDigits: 1 
                  }).format(request.budgetAmount) : '-'}
                </td>
                <td className="px-2 py-2 text-xs text-gray-900 truncate border-r border-gray-200" title={request.costType || ''}>
                  {request.costType || '-'}
                </td>
                <td className="px-2 py-2 text-xs text-gray-900 truncate border-r border-gray-200" title={request.contractType || ''}>
                  {request.contractType || '-'}
                </td>
                <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-200">
                  {request.contractDurationMonths || '-'}
                </td>
                <td className="px-2 py-2 whitespace-nowrap text-xs">
                  {request.isPlanned ? (
                    <span className="px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                      Да
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                      Нет
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Пагинация */}
      <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-700">
            Показано {data.content.length} из {data.totalElements} записей
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="pageSize" className="text-sm text-gray-700">
              Элементов на странице:
            </label>
            <select
              id="pageSize"
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage(0)}
            disabled={currentPage === 0}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Первая
          </button>
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 0}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Назад
          </button>
          <span className="px-4 py-2 text-sm font-medium text-gray-700">
            Страница {currentPage + 1} из {data.totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage >= data.totalPages - 1}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Вперед
          </button>
          <button
            onClick={() => setCurrentPage(data.totalPages - 1)}
            disabled={currentPage >= data.totalPages - 1}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Последняя
          </button>
        </div>
      </div>
    </div>
  );
}

