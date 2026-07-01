import { Send, Check } from 'lucide-react';
import { CfoSpecificationSending } from '@/utils/sending-center.api';
import RecipientEditor from './RecipientEditor';

interface SpecificationSendingTableProps {
  rows: CfoSpecificationSending[];
  sendingCfo: Record<string, boolean>;
  onSend: (cfoName: string) => void;
  onReload: () => void;
}

function formatAmount(value: number | null): string {
  if (value == null) return '0';
  return value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatSentAt(value: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return `Отправлено: ${d.toLocaleString('ru-RU')}`;
}

export default function SpecificationSendingTable({ rows, sendingCfo, onSend, onReload }: SpecificationSendingTableProps) {
  if (rows.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200 text-gray-500 text-sm">
        За выбранный месяц нет подписанных спецификаций.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
            <th className="px-3 py-2 text-left border-b border-gray-200">ЦФО</th>
            <th className="px-3 py-2 text-left border-b border-gray-200">Получатель</th>
            <th className="px-3 py-2 text-right border-b border-gray-200">Спецификаций</th>
            <th className="px-3 py-2 text-right border-b border-gray-200">Сумма</th>
            <th className="px-3 py-2 text-center border-b border-gray-200">Статус</th>
            <th className="px-3 py-2 text-center border-b border-gray-200">Действие</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isSending = !!sendingCfo[row.cfoName];
            const canSend = !!row.recipientEmail && !isSending;
            return (
              <tr key={row.cfoName} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-900">{row.cfoName}</td>
                <td className="px-3 py-2 text-gray-700">
                  <RecipientEditor row={row} onChanged={onReload} />
                </td>
                <td className="px-3 py-2 text-right text-gray-900">{row.specificationCount}</td>
                <td className="px-3 py-2 text-right text-gray-900 whitespace-nowrap">
                  {formatAmount(row.totalAmount)}
                </td>
                <td className="px-3 py-2 text-center">
                  {row.sent ? (
                    <div className="flex flex-col items-center gap-0.5">
                      {row.rated ? (
                        <span className="inline-flex items-center gap-1 text-green-600 text-xs">
                          <Check className="w-3 h-3" /> Оценено
                        </span>
                      ) : (
                        <span className="text-xs text-blue-600">Отправлено</span>
                      )}
                      {row.sentTo && (
                        <span className="text-[11px] text-gray-400" title={formatSentAt(row.sentAt)}>
                          → {row.sentTo}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  <button
                    type="button"
                    disabled={!canSend}
                    onClick={() => onSend(row.cfoName)}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      canSend
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                    title={!row.recipientEmail ? 'Не назначен получатель с email' : undefined}
                  >
                    <Send className="w-3 h-3" />
                    {isSending ? 'Отправка...' : row.sent ? 'Отправить снова' : 'Отправить'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
