'use client';

import type { ReactNode } from 'react';

export interface DeliveryDashboardCardProps {
  title: string;
  subtitle?: string;
  loading?: boolean;
  error?: string | null;
  /** Нет данных для показа (после загрузки). */
  empty?: boolean;
  className?: string;
  children: ReactNode;
}

/** Карточка блока дэшборда: заголовок, подзаголовок и состояния загрузки / ошибки / пусто. */
export function DeliveryDashboardCard({
  title,
  subtitle,
  loading,
  error,
  empty,
  className = '',
  children,
}: DeliveryDashboardCardProps) {
  return (
    <div className={`bg-white rounded-lg shadow px-2 py-1.5 flex flex-col min-w-0 ${className}`}>
      <p className="text-xs font-medium text-gray-700 leading-tight">{title}</p>
      {subtitle && <p className="text-[10px] text-gray-500 leading-tight">{subtitle}</p>}
      <div className="flex-1 min-h-0 mt-1 flex flex-col">
        {error ? (
          <p className="text-xs text-red-600">{error}</p>
        ) : loading ? (
          <div className="flex-1 flex items-center justify-center text-xs text-gray-500">Загрузка…</div>
        ) : empty ? (
          <div className="flex-1 flex items-center justify-center text-xs text-gray-500">Нет данных</div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
