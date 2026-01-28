'use client';

import { useRouter } from 'next/navigation';
import { X, ExternalLink } from 'lucide-react';
import type { DeliveryPlanSpecification } from '../types/delivery-plan.types';
import { getStatusStyle, getSpecificationDisplayName, formatBudget } from '../utils/delivery-plan.utils';

interface DaySpecificationsPanelProps {
  date: string;
  specifications: DeliveryPlanSpecification[];
  onClose: () => void;
  onSelectSpec: (spec: DeliveryPlanSpecification) => void;
}

export function DaySpecificationsPanel({
  date,
  specifications,
  onClose,
  onSelectSpec,
}: DaySpecificationsPanelProps) {
  const router = useRouter();
  const dateObj = new Date(date);
  const formattedDate = dateObj.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
  });

  return (
    <aside className="w-full sm:w-[380px] lg:w-[400px] flex-shrink-0 border-l border-gray-200 bg-white shadow-lg flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">Спецификации на {formattedDate}</h3>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors text-gray-600"
          title="Закрыть"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {specifications.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-8">Нет спецификаций на эту дату</div>
        ) : (
          <div className="space-y-3">
            {specifications.map((spec) => {
              const statusStyle = getStatusStyle(spec.status);
              return (
                <div
                  key={spec.id}
                  className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-pointer bg-white"
                  onClick={() => onSelectSpec(spec)}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 mb-1">
                        {getSpecificationDisplayName(spec)}
                      </div>
                      {spec.innerId && (
                        <div className="text-xs text-gray-500 mb-1">ID: {spec.innerId}</div>
                      )}
                    </div>
                    {spec.status && (
                      <span
                        className={`inline-block text-xs px-2 py-1 rounded flex-shrink-0 ${statusStyle.bg} ${statusStyle.text}`}
                      >
                        {spec.status}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    {spec.cfo && <div>ЦФО: {spec.cfo}</div>}
                    {spec.budgetAmount != null && spec.budgetAmount > 0 && (
                      <div>Бюджет: {formatBudget(spec.budgetAmount, spec.currency)}</div>
                    )}
                    {spec.plannedDeliveryEndDate && (
                      <div className="text-[11px] text-gray-500">
                        До: {new Date(spec.plannedDeliveryEndDate).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </div>
                    )}
                  </div>
                  {spec.purchaseRequestId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/purchase-request/${spec.purchaseRequestId}`);
                      }}
                      className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Перейти к заявке
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
        <button
          onClick={onClose}
          className="w-full px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Закрыть
        </button>
      </div>
    </aside>
  );
}
