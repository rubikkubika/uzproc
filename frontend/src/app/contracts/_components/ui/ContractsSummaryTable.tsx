'use client';

import type { ContractSummaryItem } from '../hooks/useContractsSummary';

interface ContractsSummaryTableProps {
  summaryData: ContractSummaryItem[];
  loading: boolean;
  selectedPreparedBy: string;
  onPreparedByClick: (name: string) => void;
}

export default function ContractsSummaryTable({
  summaryData,
  loading,
  selectedPreparedBy,
  onPreparedByClick,
}: ContractsSummaryTableProps) {
  const total = summaryData.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="flex-shrink-0">
      <div className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
        Сводка — В работе
      </div>
      <div className="border border-gray-200 rounded overflow-hidden">
        <table className="border-collapse text-xs" style={{ minWidth: '220px' }}>
          <thead>
            <tr className="bg-blue-50">
              <th className="px-2 py-1 text-left font-medium text-gray-600 border-b border-gray-200 border-r border-gray-200">
                Исполнитель
              </th>
              <th className="px-2 py-1 text-center font-medium text-gray-600 border-b border-gray-200" style={{ width: '56px' }}>
                Договоров
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {loading ? (
              <tr>
                <td colSpan={2} className="px-2 py-2 text-center text-gray-400">
                  Загрузка...
                </td>
              </tr>
            ) : summaryData.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-2 py-2 text-center text-gray-400">
                  Нет данных
                </td>
              </tr>
            ) : (
              summaryData.map((item, idx) => {
                const isSelected = selectedPreparedBy === item.preparedBy;
                return (
                  <tr
                    key={item.preparedBy}
                    onClick={() => onPreparedByClick(item.preparedBy)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-100'
                        : idx % 2 === 0
                        ? 'bg-white hover:bg-blue-50'
                        : 'bg-gray-50 hover:bg-blue-50'
                    }`}
                  >
                    <td className={`px-2 py-1 border-r border-gray-200 whitespace-nowrap font-medium ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>
                      {item.preparedBy}
                    </td>
                    <td className={`px-2 py-1 text-center font-semibold ${isSelected ? 'text-blue-700' : 'text-blue-700'}`}>
                      {item.count}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {!loading && summaryData.length > 0 && (
            <tfoot>
              <tr className="bg-gray-100 font-semibold border-t border-gray-200">
                <td className="px-2 py-1 text-gray-700 border-r border-gray-200">Итого</td>
                <td className="px-2 py-1 text-center text-blue-700">{total}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
