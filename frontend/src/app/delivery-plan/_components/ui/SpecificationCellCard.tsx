'use client';

import type { DeliveryPlanSpecification } from '../types/delivery-plan.types';
import { getStatusStyle, getSpecificationDisplayName } from '../utils/delivery-plan.utils';

interface SpecificationCellCardProps {
  item: DeliveryPlanSpecification;
  onSelect: (item: DeliveryPlanSpecification) => void;
}

const MAX_NAME_LENGTH = 25;

export function SpecificationCellCard({ item, onSelect }: SpecificationCellCardProps) {
  const displayName = getSpecificationDisplayName(item);
  const truncatedName = displayName.length > MAX_NAME_LENGTH ? displayName.substring(0, MAX_NAME_LENGTH) + '...' : displayName;
  const statusStyle = getStatusStyle(item.status);

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect(item);
      }}
      className="text-xs px-2 py-1 rounded cursor-pointer bg-blue-100 text-blue-800 hover:bg-blue-200"
      title={`${displayName}${item.status ? ` • ${item.status}` : ''}`}
    >
      <div className="truncate mb-1">{truncatedName}</div>
      {item.status && (
        <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded ${statusStyle.bg} ${statusStyle.text}`}>
          {statusStyle.short}
        </span>
      )}
    </div>
  );
}
