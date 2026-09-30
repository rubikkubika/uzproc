interface SendingSubTabsProps<T extends string> {
  tabs: { id: T; label: string }[];
  activeSubTab: T;
  onSubTabChange: (subTab: T) => void;
}

/** Переключатель подразделов вкладки центра отправки. */
export default function SendingSubTabs<T extends string>({
  tabs,
  activeSubTab,
  onSubTabChange,
}: SendingSubTabsProps<T>) {
  return (
    <div className="flex gap-1">
      {tabs.map((subTab) => {
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
