'use client';

import React from 'react';
import { Circle, CircleCheck, CircleDashed } from 'lucide-react';
import {
  PURCHASER_CHECKED_FILTER_CYCLE,
  PurchaserCheckedFilterValue,
} from '../constants/purchase-plan-items.constants';

interface PurchasePlanPurchaserCheckedFilterButtonProps {
  /** Текущее значение фильтра: '' — все, 'true' — проверенные, 'false' — непроверенные */
  value: string;
  onChange: (value: PurchaserCheckedFilterValue) => void;
}

const FILTER_TITLES: Record<PurchaserCheckedFilterValue, string> = {
  '': 'Фильтр: все позиции (кликните — только проверенные)',
  true: 'Фильтр: только проверенные закупщиком (кликните — только непроверенные)',
  false: 'Фильтр: только непроверенные (кликните — все позиции)',
};

/**
 * Фильтр колонки «Проверено закупщиком» символами: по клику переключается
 * «все» (пунктирный кружок) → «проверенные» (зелёная галочка) → «непроверенные» (серый кружок).
 */
export default function PurchasePlanPurchaserCheckedFilterButton({
  value,
  onChange,
}: PurchasePlanPurchaserCheckedFilterButtonProps) {
  const current = (PURCHASER_CHECKED_FILTER_CYCLE as readonly string[]).includes(value)
    ? (value as PurchaserCheckedFilterValue)
    : '';
  const next = PURCHASER_CHECKED_FILTER_CYCLE[(PURCHASER_CHECKED_FILTER_CYCLE.indexOf(current) + 1) % PURCHASER_CHECKED_FILTER_CYCLE.length];

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onChange(next);
      }}
      title={FILTER_TITLES[current]}
      className={`flex items-center justify-center rounded p-0.5 transition-colors hover:bg-gray-200 ${current ? 'ring-1 ring-blue-500 bg-white' : ''}`}
    >
      {current === 'true' && <CircleCheck className="w-4 h-4 text-green-600" />}
      {current === 'false' && <Circle className="w-4 h-4 text-gray-400" />}
      {current === '' && <CircleDashed className="w-4 h-4 text-gray-400" />}
    </button>
  );
}
