'use client';

import { useState } from 'react';
import { useContractRemarksDashboard, useContractRemarksByCategory } from '../hooks/useContractRemarksDashboard';
import { ContractRemarksChart } from './ContractRemarksChart';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const currentYear = new Date().getFullYear();
const DEFAULT_DATE_FROM = `${currentYear}-01-01`;
const DEFAULT_DATE_TO = `${currentYear}-12-31`;

export function ContractRemarksDashboardContent() {
  const [dateFrom, setDateFrom] = useState(DEFAULT_DATE_FROM);
  const [dateTo, setDateTo] = useState(DEFAULT_DATE_TO);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const dashboard = useContractRemarksDashboard(dateFrom, dateTo);
  const categoryRemarks = useContractRemarksByCategory(selectedCategory, dateFrom, dateTo);

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category === selectedCategory || category === '' ? null : category);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Фильтр по дате создания */}
      <div className="bg-white rounded shadow px-3 py-2">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium text-gray-700">Дата создания:</span>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500">с</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setSelectedCategory(null); }}
              className="px-2 py-1 text-xs border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500">по</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setSelectedCategory(null); }}
              className="px-2 py-1 text-xs border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory(null)}
              className="px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded border border-blue-300 hover:bg-blue-100 transition-colors"
            >
              Сбросить выбор категории
            </button>
          )}
        </div>
      </div>

      {/* График + детали */}
      <div className="flex gap-2 items-start">
        {/* График */}
        <div className="bg-white rounded shadow px-3 py-2 flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-700">
              Распределение замечаний по категориям
              {dashboard.data && (
                <span className="ml-2 text-gray-400 font-normal">
                  (всего: {dashboard.data.totalCount})
                </span>
              )}
            </h3>
            {selectedCategory && (
              <span className="text-xs text-blue-600 font-medium">
                Выбрана: {selectedCategory}
              </span>
            )}
          </div>

          {dashboard.loading && (
            <div className="flex items-center justify-center h-40 text-xs text-gray-400">Загрузка...</div>
          )}
          {dashboard.error && (
            <div className="flex items-center justify-center h-40 text-xs text-red-500">{dashboard.error}</div>
          )}
          {!dashboard.loading && !dashboard.error && dashboard.data && (
            dashboard.data.categories.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-xs text-gray-400">
                Нет данных за выбранный период
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-400 mb-2">Нажмите на категорию, чтобы увидеть замечания</p>
                <ContractRemarksChart
                  categories={dashboard.data.categories}
                  selectedCategory={selectedCategory}
                  onCategoryClick={handleCategoryClick}
                />
              </>
            )
          )}
        </div>

        {/* Список замечаний по категории */}
        {selectedCategory && (
          <div className="bg-white rounded shadow px-3 py-2 w-[480px] flex-shrink-0">
            <h3 className="text-xs font-semibold text-gray-700 mb-2">
              {selectedCategory}
              {categoryRemarks.data.length > 0 && (
                <span className="ml-2 text-gray-400 font-normal">
                  ({categoryRemarks.data.length})
                </span>
              )}
            </h3>

            {categoryRemarks.loading && (
              <div className="flex items-center justify-center h-32 text-xs text-gray-400">Загрузка...</div>
            )}
            {categoryRemarks.error && (
              <div className="text-xs text-red-500 py-2">{categoryRemarks.error}</div>
            )}
            {!categoryRemarks.loading && !categoryRemarks.error && (
              <div className="flex flex-col gap-1.5 max-h-[520px] overflow-y-auto pr-1">
                {categoryRemarks.data.length === 0 ? (
                  <div className="text-xs text-gray-400 py-4 text-center">Нет замечаний</div>
                ) : (
                  categoryRemarks.data.map((item, i) => (
                    <div key={i} className="border border-gray-200 rounded p-2 bg-gray-50 text-xs">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.contractInnerId && (
                            <span className="font-medium text-blue-700">{item.contractInnerId}</span>
                          )}
                          {item.contractName && (
                            <span className="text-gray-600 truncate max-w-[220px]" title={item.contractName}>
                              {item.contractName}
                            </span>
                          )}
                        </div>
                        <span className="text-gray-400 whitespace-nowrap flex-shrink-0">
                          {formatDate(item.createdAt)}
                        </span>
                      </div>
                      <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{item.commentText}</p>
                      <div className="flex items-center gap-2 mt-1 text-gray-400">
                        {item.executorName && <span>{item.executorName}</span>}
                        {item.role && <span>· {item.role}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
