import Link from 'next/link';
import type { ComplexityErrorPurchase } from '@/utils/sending-center.api';
import { COMPLEXITY_ERROR_COLLAPSED_LIMIT } from '../constants/purchase-sending.constants';

interface ComplexityErrorPurchaseListProps {
  purchases: ComplexityErrorPurchase[];
  expanded: boolean;
  onToggle: () => void;
}

/** Номера закупок закупщика: свёрнуто — первые несколько, развёрнуто — все с наименованием. */
export default function ComplexityErrorPurchaseList({ purchases, expanded, onToggle }: ComplexityErrorPurchaseListProps) {
  const visible = expanded ? purchases : purchases.slice(0, COMPLEXITY_ERROR_COLLAPSED_LIMIT);
  const hidden = purchases.length - visible.length;

  return (
    <div className={expanded ? 'space-y-0.5' : 'flex flex-wrap items-center gap-x-2 gap-y-0.5'}>
      {visible.map((purchase) => (
        <div key={purchase.id} className="text-xs">
          <Link
            href={`/purchase/${purchase.id}`}
            className={`hover:underline ${purchase.alreadySent ? 'text-blue-600' : 'text-blue-700 font-medium'}`}
            title={purchase.alreadySent ? 'Уже была в отправленном письме' : 'Ещё не отправлялась'}
          >
            {purchase.innerId || `#${purchase.id}`}
          </Link>
          {expanded && (
            <span className="text-gray-500">
              {' '}— {purchase.name || 'без наименования'}
              {purchase.cfo ? ` · ${purchase.cfo}` : ''}
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
