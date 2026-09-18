import { DELIVERY_SENDING_SUB_TABS } from '../constants/delivery-sending.constants';
import { DeliverySendingSubTabId } from '../types/delivery-sending.types';

interface DeliverySendingSubTabsProps {
  activeSubTab: DeliverySendingSubTabId;
  onSubTabChange: (subTab: DeliverySendingSubTabId) => void;
}

/** Переключатель подразделов вкладки «Поставки». */
export default function DeliverySendingSubTabs({
  activeSubTab,
  onSubTabChange,
}: DeliverySendingSubTabsProps) {
  return (
    <div className="flex gap-1">
      {DELIVERY_SENDING_SUB_TABS.map((subTab) => {
        const isActive = activeSubTab === subTab.id;
        return (
          <button
            key={subTab.id}
            type="button"
            onClick={() => onSubTabChange(subTab.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
              isActive
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
            }`}
          >
            {subTab.label}
          </button>
        );
      })}
    </div>
  );
}
