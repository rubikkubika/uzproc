import type { ReactNode } from 'react';
import type { RequestKindTab } from '../types/purchase-request.types';

interface PurchaseRequestsKindTabsProps {
  kindTab: RequestKindTab;
  onKindTabChange: (tab: RequestKindTab) => void;
  /** Действия в правой части строки вкладок (напр. кнопка запуска тура). */
  actions?: ReactNode;
}

export default function PurchaseRequestsKindTabs({
  kindTab,
  onKindTabChange,
  actions,
}: PurchaseRequestsKindTabsProps) {
  return (
    <div className="sticky top-0 left-0 right-0 z-30 flex gap-0.5 pt-0.5 pb-0.5 bg-white shadow-sm" style={{ minHeight: '30px', width: '100%', backgroundColor: 'white' }}>
      <div data-tour="kind-tabs" className="flex gap-0.5">
      <button
        onClick={() => onKindTabChange('purchase')}
        className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors shadow-sm ${
          kindTab === 'purchase'
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        }`}
      >
        Закупки
      </button>
      <button
        onClick={() => onKindTabChange('order')}
        className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors shadow-sm ${
          kindTab === 'order'
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        }`}
      >
        Заказы
      </button>
      </div>
      {actions ? <div className="ml-auto flex-shrink-0 pr-1">{actions}</div> : null}
    </div>
  );
}
