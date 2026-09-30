import { Send } from 'lucide-react';
import type { ComplexityErrorPurchaser } from '@/utils/sending-center.api';
import ComplexityErrorRequestList from './ComplexityErrorRequestList';
import { formatSentDate } from '../utils/complexity-errors.utils';

interface ComplexityErrorPurchaserRowProps {
  purchaser: ComplexityErrorPurchaser;
  expanded: boolean;
  sending: boolean;
  disabled: boolean;
  onToggle: () => void;
  onSend: () => void;
}

/** Строка закупщика: ФИО и адрес, заявки без сложности, статус отправки и кнопка «Отправить». */
export default function ComplexityErrorPurchaserRow({
  purchaser,
  expanded,
  sending,
  disabled,
  onToggle,
  onSend,
}: ComplexityErrorPurchaserRowProps) {
  const canSend = !!purchaser.email && !disabled;
  const sent = !!purchaser.lastSentAt;

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 align-top">
      <td className="px-3 py-2">
        <div className="text-gray-900">{purchaser.purchaserName}</div>
        <div className={`text-[11px] ${purchaser.email ? 'text-gray-400' : 'text-red-500'}`}>
          {purchaser.email ?? (purchaser.purchaserKey ? 'нет адреса в справочнике' : 'письмо отправить некому')}
        </div>
      </td>
      <td className="px-3 py-2 text-right text-gray-900">{purchaser.requestCount}</td>
      <td className="px-3 py-2">
        <ComplexityErrorRequestList requests={purchaser.requests} expanded={expanded} onToggle={onToggle} />
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        {sent ? (
          <div className="flex flex-col gap-0.5">
            <span
              className="text-xs text-blue-600"
              title={[purchaser.lastSentTo && `→ ${purchaser.lastSentTo}`, purchaser.lastSentBy && `отправил: ${purchaser.lastSentBy}`]
                .filter(Boolean).join(', ')}
            >
              Отправлено {formatSentDate(purchaser.lastSentAt)}
            </span>
            {purchaser.notSentCount > 0 && (
              <span className="text-[11px] text-amber-600">+{purchaser.notSentCount} новых</span>
            )}
          </div>
        ) : (
          <span className="text-xs text-gray-400">Не отправлено</span>
        )}
      </td>
      <td className="px-3 py-2 text-center">
        <button
          type="button"
          disabled={!canSend}
          onClick={onSend}
          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            canSend ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
          title={!purchaser.email ? 'Не найден адрес закупщика' : undefined}
        >
          <Send className="w-3 h-3" />
          {sending ? 'Отправка…' : sent ? 'Отправить снова' : 'Отправить'}
        </button>
      </td>
    </tr>
  );
}
