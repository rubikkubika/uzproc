'use client';

import type { ContractSummaryItem } from '../hooks/useContractsSummary';

const formatDocumentForm = (form: string) =>
  form === 'Дополнительное соглашение' ? 'ДС' : form;

interface ContractsSummaryTableProps {
  summaryData: ContractSummaryItem[];
  documentForms: string[];
  signedSummaryData: ContractSummaryItem[];
  signedDocumentForms: string[];
  currentYear: number;
  loading: boolean;
  selectedPreparedBy: string;
  selectedDocumentForm?: string;
  onPreparedByClick: (name: string) => void;
  onCellClick: (name: string, documentForm: string) => void;
}

function SummarySection({
  title,
  titleColorClass,
  summaryData,
  documentForms,
  loading,
  selectedPreparedBy,
  selectedDocumentForm,
  onPreparedByClick,
  onCellClick,
  interactive,
}: {
  title: string;
  titleColorClass: string;
  summaryData: ContractSummaryItem[];
  documentForms: string[];
  loading: boolean;
  selectedPreparedBy: string;
  selectedDocumentForm?: string;
  onPreparedByClick: (name: string) => void;
  onCellClick: (name: string, documentForm: string) => void;
  interactive: boolean;
}) {
  const total = summaryData.reduce((sum, item) => sum + item.count, 0);
  const formTotals = documentForms.reduce<Record<string, number>>((acc, form) => {
    acc[form] = summaryData.reduce((sum, item) => sum + (item.countByDocumentForm?.[form] ?? 0), 0);
    return acc;
  }, {});
  const colSpan = 2 + documentForms.length;

  const isCellSelected = (name: string, form: string) =>
    interactive && selectedPreparedBy === name && selectedDocumentForm === form;
  const isRowSelected = (name: string) =>
    interactive && selectedPreparedBy === name && !selectedDocumentForm;

  return (
    <div className="flex-shrink-0">
      <div className="border border-gray-200 rounded overflow-hidden overflow-x-auto">
        <table className="border-collapse text-xs">
          <thead>
            <tr className={`bg-blue-50`}>
              <th
                colSpan={colSpan}
                className={`px-2 py-0.5 text-center text-[11px] font-semibold border-b border-gray-200 whitespace-nowrap ${titleColorClass}`}
              >
                {title}
              </th>
            </tr>
            <tr className="bg-blue-50">
              <th className="px-2 py-1 text-left font-medium text-gray-600 border-b border-gray-200 border-r border-gray-200 whitespace-nowrap">
                Исполнитель
              </th>
              <th className="px-2 py-1 text-center font-medium text-gray-600 border-b border-gray-200 border-r border-gray-200 whitespace-nowrap" style={{ width: '56px' }}>
                Всего
              </th>
              {documentForms.map(form => (
                <th
                  key={form}
                  className="px-2 py-1 text-center font-medium text-gray-600 border-b border-gray-200 border-r border-gray-200 whitespace-nowrap"
                  style={{ minWidth: '60px' }}
                >
                  {formatDocumentForm(form)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white">
            {loading ? (
              <tr>
                <td colSpan={colSpan} className="px-2 py-2 text-center text-gray-400">Загрузка...</td>
              </tr>
            ) : summaryData.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-2 py-2 text-center text-gray-400">Нет данных</td>
              </tr>
            ) : (
              summaryData.map((item, idx) => {
                const rowSel = isRowSelected(item.preparedBy);
                const anySelected = interactive && selectedPreparedBy === item.preparedBy;
                return (
                  <tr key={item.preparedBy} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td
                      onClick={() => interactive && onPreparedByClick(item.preparedBy)}
                      className={`px-2 py-1 border-r border-gray-200 whitespace-nowrap font-medium ${interactive ? 'cursor-pointer transition-colors hover:bg-blue-50' : ''} ${rowSel ? 'bg-blue-100 text-blue-700' : anySelected ? 'text-blue-700' : 'text-gray-800'}`}
                    >
                      {item.preparedBy}
                    </td>
                    <td
                      onClick={() => interactive && onPreparedByClick(item.preparedBy)}
                      className={`px-2 py-1 text-center font-semibold border-r border-gray-200 ${interactive ? 'cursor-pointer transition-colors hover:bg-blue-50' : ''} ${rowSel ? 'bg-blue-100 text-blue-700' : 'text-blue-700'}`}
                    >
                      {item.count}
                    </td>
                    {documentForms.map(form => {
                      const val = item.countByDocumentForm?.[form] ?? 0;
                      const cellSel = isCellSelected(item.preparedBy, form);
                      return (
                        <td
                          key={form}
                          onClick={() => interactive && val > 0 && onCellClick(item.preparedBy, form)}
                          className={`px-2 py-1 text-center border-r border-gray-200 transition-colors ${
                            val > 0
                              ? cellSel
                                ? 'bg-blue-500 text-white font-semibold cursor-pointer'
                                : interactive
                                  ? 'text-gray-800 cursor-pointer hover:bg-blue-50'
                                  : 'text-gray-800'
                              : 'text-gray-300 cursor-default'
                          }`}
                        >
                          {val > 0 ? val : '—'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
          {!loading && summaryData.length > 0 && (
            <tfoot>
              <tr className="bg-gray-100 font-semibold border-t border-gray-200">
                <td className="px-2 py-1 text-gray-700 border-r border-gray-200">Итого</td>
                <td className="px-2 py-1 text-center text-blue-700 border-r border-gray-200">{total}</td>
                {documentForms.map(form => (
                  <td key={form} className="px-2 py-1 text-center text-blue-700 border-r border-gray-200">
                    {formTotals[form] > 0 ? formTotals[form] : '—'}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

export default function ContractsSummaryTable({
  summaryData,
  documentForms,
  signedSummaryData,
  signedDocumentForms,
  currentYear,
  loading,
  selectedPreparedBy,
  selectedDocumentForm,
  onPreparedByClick,
  onCellClick,
}: ContractsSummaryTableProps) {
  return (
    <div className="flex gap-4 flex-wrap">
      <SummarySection
        title="Документы в работе"
        titleColorClass="text-blue-800"
        summaryData={summaryData}
        documentForms={documentForms}
        loading={loading}
        selectedPreparedBy={selectedPreparedBy}
        selectedDocumentForm={selectedDocumentForm}
        onPreparedByClick={onPreparedByClick}
        onCellClick={onCellClick}
        interactive={true}
      />
      <SummarySection
        title={`Подписанные документы — ${currentYear}`}
        titleColorClass="text-green-800"
        summaryData={signedSummaryData}
        documentForms={signedDocumentForms}
        loading={loading}
        selectedPreparedBy=""
        selectedDocumentForm=""
        onPreparedByClick={() => {}}
        onCellClick={() => {}}
        interactive={false}
      />
    </div>
  );
}
