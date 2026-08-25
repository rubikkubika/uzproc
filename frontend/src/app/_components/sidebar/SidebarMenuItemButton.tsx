'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import type { SidebarMenuItem } from './sidebar.types';

interface SidebarMenuItemButtonProps {
  item: SidebarMenuItem;
  activeTab: string;
  isCollapsed: boolean;
  /** Развёрнут ли список подпунктов (для пунктов с subItems) */
  isSubOpen: boolean;
  onSelect: (item: SidebarMenuItem) => void;
  onToggleSub: () => void;
  /** true — пункт отрисовывается как вложенный (с отступом и уменьшенной иконкой) */
  isNested?: boolean;
}

/**
 * Пункт бокового меню: кнопка перехода и, при наличии subItems, вложенный список.
 * Клик по пункту с подпунктами переходит на его вкладку и раскрывает вложенный список,
 * стрелка справа раскрывает/сворачивает список, не меняя вкладку.
 * В свёрнутом сайдбаре подпункты показываются плоско — иконками, без вложенности.
 */
export default function SidebarMenuItemButton({
  item,
  activeTab,
  isCollapsed,
  isSubOpen,
  onSelect,
  onToggleSub,
  isNested = false,
}: SidebarMenuItemButtonProps) {
  const Icon = item.icon;
  const isActive = activeTab === item.id;
  const isDisabled = item.disabled || false;
  const subItems = item.subItems || [];
  const hasSubItems = subItems.length > 0;
  // Подпункты раскрыты, если раскрыты вручную или активна вкладка одного из них
  const isSubExpanded = isSubOpen || subItems.some(sub => sub.id === activeTab);

  return (
    <li>
      <div className="flex items-center">
        <button
          onClick={() => {
            if (isDisabled) return;
            onSelect(item);
            if (hasSubItems && !isCollapsed && !isSubExpanded) onToggleSub();
          }}
          disabled={isDisabled}
          className={`flex-1 min-w-0 flex items-center rounded-lg transition-colors relative text-sm ${
            isCollapsed ? 'justify-center py-0.5 px-0' : 'px-2 py-1'
          } ${
            isActive
              ? `text-blue-600 bg-blue-50 ${isCollapsed ? '' : 'border-l-4 border-blue-600'}`
              : isDisabled
              ? 'text-gray-400 cursor-not-allowed opacity-50'
              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
          }`}
          title={isCollapsed ? item.label : undefined}
        >
          <span className="flex items-center justify-center w-5 flex-shrink-0">
            <Icon className={isNested ? 'w-4 h-4' : 'w-5 h-5'} />
          </span>
          {!isCollapsed && <span className="ml-2 text-left truncate">{item.label}</span>}
        </button>
        {hasSubItems && !isCollapsed && (
          <button
            type="button"
            onClick={onToggleSub}
            className="p-1 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            title={isSubExpanded ? 'Свернуть' : 'Развернуть'}
          >
            {isSubExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      {hasSubItems && !isCollapsed && isSubExpanded && (
        <ul className="mt-1 ml-2 pl-2 border-l border-gray-200 space-y-1">
          {subItems.map(sub => (
            <SidebarMenuItemButton
              key={sub.id}
              item={sub}
              activeTab={activeTab}
              isCollapsed={isCollapsed}
              isSubOpen={false}
              onSelect={onSelect}
              onToggleSub={onToggleSub}
              isNested
            />
          ))}
        </ul>
      )}

      {/* В свёрнутом сайдбаре вложенность не показываем — подпункты идут плоско, иконками.
          Обёртка в <ul> обязательна: <li> не может быть прямым потомком <li>. */}
      {hasSubItems && isCollapsed && (
        <ul className="space-y-1">
          {subItems.map(sub => (
            <SidebarMenuItemButton
              key={sub.id}
              item={sub}
              activeTab={activeTab}
              isCollapsed={isCollapsed}
              isSubOpen={false}
              onSelect={onSelect}
              onToggleSub={onToggleSub}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
