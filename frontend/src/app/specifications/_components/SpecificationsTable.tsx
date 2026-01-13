'use client';

// Базовый компонент SpecificationsTable - будет расширен позже
// Пока что используем заглушку с той же структурой заголовков и пагинации

export default function SpecificationsTable() {
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700 font-medium">Фильтр по году создания:</span>
            <button
              className="px-3 py-1.5 text-sm rounded-lg border transition-colors bg-blue-600 text-white border-blue-600"
            >
              Все
            </button>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-500">
              Всего записей: 0
            </p>
            <button
              className="px-4 py-2 text-sm font-medium bg-red-50 text-red-700 rounded-lg border-2 border-red-300 hover:bg-red-100 hover:border-red-400 transition-colors shadow-sm"
            >
              Сбросить фильтры
            </button>
          </div>
        </div>
      </div>

      {/* Пагинация */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-700">
            Показано 0 из 0 записей
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="pageSize" className="text-sm text-gray-700">
              Элементов на странице:
            </label>
            <select
              id="pageSize"
              defaultValue={100}
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
            disabled
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Первая
          </button>
          <button
            disabled
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Назад
          </button>
          <span className="px-4 py-2 text-sm font-medium text-gray-700">
            Страница 1 из 1
          </span>
          <button
            disabled
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Вперед
          </button>
          <button
            disabled
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Последняя
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto relative">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50">
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

