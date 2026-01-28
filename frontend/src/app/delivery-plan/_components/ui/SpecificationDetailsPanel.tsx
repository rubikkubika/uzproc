'use client';

import { useRouter } from 'next/navigation';
import { X, ExternalLink } from 'lucide-react';
import type { DeliveryPlanSpecification } from '../types/delivery-plan.types';
import { getStatusStyle, getSpecificationDisplayName, formatBudget } from '../utils/delivery-plan.utils';

interface SpecificationDetailsPanelProps {
  spec: DeliveryPlanSpecification;
  onClose: () => void;
}

export function SpecificationDetailsPanel({ spec, onClose }: SpecificationDetailsPanelProps) {
  const router = useRouter();
  const statusStyle = getStatusStyle(spec.status);

  return (
    <aside className="w-full sm:w-[380px] lg:w-[400px] flex-shrink-0 border-l border-gray-200 bg-white shadow-lg flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">Детали спецификации</h3>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors text-gray-600"
          title="Закрыть"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Название</div>
          <div className="text-sm text-gray-900">{getSpecificationDisplayName(spec)}</div>
        </div>
        {spec.innerId && (
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Внутренний номер</div>
            <div className="text-sm text-gray-900">{spec.innerId}</div>
          </div>
        )}
        <div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Статус</div>
          <span className={`inline-block text-sm px-2 py-1 rounded ${statusStyle.bg} ${statusStyle.text}`}>
            {spec.status || '—'}
          </span>
        </div>
        {spec.cfo && (
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">ЦФО</div>
            <div className="text-sm text-gray-900">{spec.cfo}</div>
          </div>
        )}
        {spec.budgetAmount != null && spec.budgetAmount > 0 && (
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Бюджет</div>
            <div className="text-sm text-gray-900">{formatBudget(spec.budgetAmount, spec.currency)}</div>
          </div>
        )}
        {spec.plannedDeliveryStartDate && (
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Плановая дата начала поставки</div>
            <div className="text-sm text-gray-900">
              {new Date(spec.plannedDeliveryStartDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        )}
        {spec.plannedDeliveryEndDate && (
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Плановая дата окончания поставки</div>
            <div className="text-sm text-gray-900">
              {new Date(spec.plannedDeliveryEndDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        )}
        {spec.purchaseRequestId && (
          <div className="pt-2 border-t border-gray-200">
            <button
              onClick={() => router.push(`/purchase-request/${spec.purchaseRequestId}`)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Перейти к заявке на закупку
            </button>
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
