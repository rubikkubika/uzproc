'use client';

// Базовый компонент SpecificationsTable - будет расширен позже
// Пока что используем заглушку с той же структурой заголовков и пагинации

export default function SpecificationsTable() {
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col flex-1 min-h-0">
      {/* Header с фильтрами - стиль как в PurchaseRequestsTable */}
      <div className="px-3 py-1 border-b border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Кнопка - Сбросить фильтры */}
          <button
            disabled
            className="px-3 py-1 text-xs font-medium bg-red-50 text-red-700 rounded-lg border border-red-300 hover:bg-red-100 hover:border-red-400 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Сбросить фильтры
          </button>

          {/* Фильтр по году */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-700 font-medium whitespace-nowrap">Год:</span>
            <button
              disabled
              className="px-2 py-1 text-xs rounded border transition-colors bg-blue-600 text-white border-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Все
            </button>
          </div>
        </div>

        {/* Информация о количестве записей справа */}
        <div className="text-xs text-gray-700 flex-shrink-0">
          Всего записей: 0
        </div>
      </div>

      {/* Пагинация */}
      <div className="px-3 py-1 border-b border-gray-200 flex items-center justify-between bg-white flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-700">
            Показано 0 из 0
          </div>
          <div className="flex items-center gap-1">
            <label htmlFor="pageSize" className="text-xs text-gray-700">
              На странице:
            </label>
            <select
              id="pageSize"
              defaultValue={100}
              disabled
              className="px-2 py-1 text-xs border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            disabled
            className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Первая
          </button>
          <button
            disabled
            className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Назад
          </button>
          <span className="px-2 py-1 text-xs font-medium text-gray-700">
            1 / 1
          </span>
          <button
            disabled
            className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Вперед
          </button>
          <button
            disabled
            className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Последняя
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto relative custom-scrollbar">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300">
                <div className="flex flex-col gap-1">
                  <div className="h-[24px] flex items-center flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px' }}></div>
                  <span className="normal-case min-h-[20px] flex items-center">Спецификация</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            <tr>
              <td colSpan={1} className="px-6 py-8 text-center text-gray-500">
                Нет данных для отображения
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
