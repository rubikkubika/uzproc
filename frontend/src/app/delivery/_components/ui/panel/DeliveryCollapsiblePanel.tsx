'use client';

import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface Props {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  /** Содержимое заголовка справа от названия */
  headerExtra?: ReactNode;
  children: ReactNode;
  className?: string;
  tourId?: string;
}

/** Сворачиваемая панель над таблицей: шеврон + название в заголовке, в свёрнутом виде тело скрыто. */
export default function DeliveryCollapsiblePanel({ title, collapsed, onToggle, headerExtra, children, className = '', tourId }: Props) {
  return (
    <div data-tour={tourId} className={`border border-slate-200 rounded-lg overflow-hidden min-w-0 ${className}`}>
      <div className={`flex items-center gap-2.5 px-3 py-2 bg-slate-50 ${collapsed ? '' : 'border-b border-slate-200'}`}>
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-900 whitespace-nowrap"
          aria-expanded={!collapsed}
        >
          <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-150 ${collapsed ? '-rotate-90' : ''}`} />
          {title}
        </button>
        {headerExtra}
      </div>
      {!collapsed && children}
    </div>
  );
}
