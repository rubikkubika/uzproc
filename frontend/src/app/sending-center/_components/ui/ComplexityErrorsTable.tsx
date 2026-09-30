import type { ComplexityErrorPurchaser } from '@/utils/sending-center.api';
import ComplexityErrorPurchaserRow from './ComplexityErrorPurchaserRow';

interface ComplexityErrorsTableProps {
  purchasers: ComplexityErrorPurchaser[];
  expanded: Set<string>;
  sendingKey: string | null;
  onToggle: (purchaserKey: string) => void;
  onSend: (purchaserKey: string) => void;
}

/** Компактная таблица закупщиков с закупками без сложности. */
export default function ComplexityErrorsTable({
  purchasers,
  expanded,
  sendingKey,
  onToggle,
  onSend,
}: ComplexityErrorsTableProps) {
  if (purchasers.length === 0) {
    return <p className="text-sm text-gray-500">Все закупки этого года со сложностью — отправлять нечего.</p>;
  }

  return (
    <div className="rounded-lg border border-gray-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
            <th className="px-3 py-2 text-left border-b border-gray-200">Закупщик</th>
            <th className="px-3 py-2 text-right border-b border-gray-200">Закупок</th>
            <th className="px-3 py-2 text-left border-b border-gray-200">Закупки</th>
            <th className="px-3 py-2 text-left border-b border-gray-200">Статус</th>
            <th className="px-3 py-2 text-center border-b border-gray-200">Действие</th>
          </tr>
        </thead>
        <tbody>
          {purchasers.map((purchaser) => (
            <ComplexityErrorPurchaserRow
              key={purchaser.purchaserKey || '__none__'}
              purchaser={purchaser}
              expanded={expanded.has(purchaser.purchaserKey)}
              sending={sendingKey === purchaser.purchaserKey}
              disabled={sendingKey !== null}
              onToggle={() => onToggle(purchaser.purchaserKey)}
              onSend={() => onSend(purchaser.purchaserKey)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
