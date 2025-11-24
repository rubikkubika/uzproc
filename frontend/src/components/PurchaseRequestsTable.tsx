'use client';

import { useState, useEffect } from 'react';

interface PurchaseRequest {
  id: number;
  guid: string;
  purchasePlanYear: number | null;
  company: string | null;
  cfo: string | null;
  mcc: string | null;
  purchaseInitiator: string | null;
  purchaseSubject: string | null;
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

  const fetchData = async (page: number, size: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:8080/api/purchase-requests?page=${page}&size=${size}`);
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
    fetchData(currentPage, pageSize);
  }, [currentPage, pageSize]);

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
        <h2 className="text-xl font-bold text-gray-900">Заявки на закупку</h2>
        <p className="text-sm text-gray-500 mt-1">
          Всего записей: {data.totalElements}
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                ID
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                Год
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                Компания
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                ЦФО
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                MCC
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                Инициатор
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Предмет закупки
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                Бюджет
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                Затраты
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                Договор
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
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
                <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900">
                  {request.id}
                </td>
                <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900">
                  {request.purchasePlanYear || '-'}
                </td>
                <td className="px-2 py-2 text-xs text-gray-900 truncate" title={request.company || ''}>
                  {request.company || '-'}
                </td>
                <td className="px-2 py-2 text-xs text-gray-900 truncate" title={request.cfo || ''}>
                  {request.cfo || '-'}
                </td>
                <td className="px-2 py-2 text-xs text-gray-900 truncate" title={request.mcc || ''}>
                  {request.mcc || '-'}
                </td>
                <td className="px-2 py-2 text-xs text-gray-900 truncate" title={request.purchaseInitiator || ''}>
                  {request.purchaseInitiator || '-'}
                </td>
                <td className="px-2 py-2 text-xs text-gray-900 truncate" title={request.purchaseSubject || ''}>
                  {request.purchaseSubject || '-'}
                </td>
                <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900">
                  {request.budgetAmount ? new Intl.NumberFormat('ru-RU', { 
                    notation: 'compact',
                    maximumFractionDigits: 1 
                  }).format(request.budgetAmount) : '-'}
                </td>
                <td className="px-2 py-2 text-xs text-gray-900 truncate" title={request.costType || ''}>
                  {request.costType || '-'}
                </td>
                <td className="px-2 py-2 text-xs text-gray-900 truncate" title={request.contractType || ''}>
                  {request.contractType || '-'}
                </td>
                <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900">
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

