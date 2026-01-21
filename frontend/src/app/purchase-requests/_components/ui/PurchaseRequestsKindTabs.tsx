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
    <div className="flex gap-2 px-4 py-2 border-b border-gray-200 bg-gray-50">
      <button
        onClick={() => onKindTabChange('purchase')}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          kindTab === 'purchase'
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
        }`}
      >
        Закупки
      </button>
      <button
        onClick={() => onKindTabChange('order')}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          kindTab === 'order'
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
        }`}
      >
        Заказы
      </button>
    </div>
  );
}
