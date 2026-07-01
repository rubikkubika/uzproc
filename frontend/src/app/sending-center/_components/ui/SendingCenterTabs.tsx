import { SENDING_CENTER_TABS } from '../constants/sending-center.constants';
import { SendingCenterTabId } from '../types/sending-center.types';

interface SendingCenterTabsProps {
  activeTab: SendingCenterTabId;
  onTabChange: (tab: SendingCenterTabId) => void;
}

export default function SendingCenterTabs({ activeTab, onTabChange }: SendingCenterTabsProps) {
  return (
    <div className="flex gap-1 border-b border-gray-200">
      {SENDING_CENTER_TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              isActive
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
