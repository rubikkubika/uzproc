'use client';

import type { DeliveryPlanSpecification } from '../types/delivery-plan.types';
import { getStatusStyle, getSpecificationDisplayName, formatBudget } from '../utils/delivery-plan.utils';

interface SpecificationWeekCardProps {
  item: DeliveryPlanSpecification;
  onSelect: (item: DeliveryPlanSpecification) => void;
}

export function SpecificationWeekCard({ item, onSelect }: SpecificationWeekCardProps) {
  const displayName = getSpecificationDisplayName(item);
  const statusStyle = getStatusStyle(item.status);

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect(item);
      }}
      className="p-2 rounded border cursor-pointer hover:shadow-md transition-shadow bg-blue-100 border-blue-300 hover:bg-blue-200"
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="text-xs font-semibold text-gray-900 truncate">{displayName}</div>
        {item.status && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ${statusStyle.bg} ${statusStyle.text}`}>
            {item.status}
          </span>
        )}
      </div>
      <div className="text-[10px] text-gray-600 space-y-0.5">
        {item.cfo && <div>ЦФО: {item.cfo}</div>}
        {item.budgetAmount != null && item.budgetAmount > 0 && (
          <div>Бюджет: {formatBudget(item.budgetAmount, item.currency)}</div>
        )}
        {item.plannedDeliveryEndDate && (
          <div className="text-[9px] text-gray-500">
            До: {new Date(item.plannedDeliveryEndDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
          </div>
        )}
      </div>
    </div>
  );
}
