import type { RequestKindTab } from '../types/purchase-request.types';

interface PurchaseRequestsKindTabsProps {
  kindTab: RequestKindTab;
  onKindTabChange: (tab: RequestKindTab) => void;
}

export default function PurchaseRequestsKindTabs({
  kindTab,
  onKindTabChange,
}: PurchaseRequestsKindTabsProps) {
  return (
    <div className="sticky top-0 left-0 right-0 z-30 flex gap-1 pt-2 pb-2 bg-white shadow-sm" style={{ minHeight: '44px', width: '100%', backgroundColor: 'white' }}>
      <button
        onClick={() => onKindTabChange('purchase')}
        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors shadow-sm ${
          kindTab === 'purchase'
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        }`}
      >
        Закупки
      </button>
      <button
        onClick={() => onKindTabChange('order')}
        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors shadow-sm ${
          kindTab === 'order'
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        }`}
      >
        Заказы
      </button>
    </div>
  );
}
