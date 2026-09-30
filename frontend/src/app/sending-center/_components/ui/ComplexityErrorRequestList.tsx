import Link from 'next/link';
import type { ComplexityErrorRequest } from '@/utils/sending-center.api';
import { COMPLEXITY_ERROR_COLLAPSED_LIMIT } from '../constants/purchase-sending.constants';

interface ComplexityErrorRequestListProps {
  requests: ComplexityErrorRequest[];
  expanded: boolean;
  onToggle: () => void;
}

/**
 * Номера заявок закупщика: свёрнуто — первые несколько, развёрнуто — все
 * с наименованием, статусом, ЦФО и номером закупки (если есть).
 */
export default function ComplexityErrorRequestList({ requests, expanded, onToggle }: ComplexityErrorRequestListProps) {
  const visible = expanded ? requests : requests.slice(0, COMPLEXITY_ERROR_COLLAPSED_LIMIT);
  const hidden = requests.length - visible.length;

  return (
    <div className={expanded ? 'space-y-0.5' : 'flex flex-wrap items-center gap-x-2 gap-y-0.5'}>
      {visible.map((request) => (
        <div key={request.id} className="text-xs">
          <Link
            href={`/purchase-request/${request.id}`}
            className={`hover:underline ${request.alreadySent ? 'text-blue-600' : 'text-blue-700 font-medium'}`}
            title={request.alreadySent ? 'Уже была в отправленном письме' : 'Ещё не отправлялась'}
          >
            {request.innerId || `#${request.id}`}
          </Link>
          {expanded && (
            <span className="text-gray-500">
              {' '}— {request.name || 'без наименования'}
              {request.status ? ` · ${request.status}` : ''}
              {request.cfo ? ` · ${request.cfo}` : ''}
              {request.purchases.length > 0 && ' · закупка '}
              {request.purchases.map((purchase, index) => (
                <span key={purchase.id}>
                  {index > 0 && ', '}
                  <Link href={`/purchase/${purchase.id}`} className="text-blue-600 hover:underline">
                    {purchase.innerId || `#${purchase.id}`}
                  </Link>
                </span>
              ))}
            </span>
          )}
        </div>
      ))}
      <button type="button" onClick={onToggle} className="text-xs text-gray-500 hover:text-gray-700 underline">
        {expanded ? 'свернуть' : hidden > 0 ? `ещё ${hidden}` : 'подробнее'}
      </button>
    </div>
  );
}
