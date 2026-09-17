'use client';

import { EK_MODE_ASSIGNMENT_TITLE, EK_MODE_CREATION_TITLE } from '../constants/ek.constants';
import type { EkYearType } from '../types/ek.types';
import { currencyNamePrepositional, currencySymbol } from '../utils/ek-format.utils';

interface EkModeBadgesProps {
  yearType: EkYearType;
  amountsInBaseCurrency: boolean;
  baseCurrency: string | null;
  /** Подсказка с курсами пересчёта */
  exchangeRatesTitle: string;
}

/** Бейджи режима года и пересчёта валют в панели фильтров */
export function EkModeBadges({ yearType, amountsInBaseCurrency, baseCurrency, exchangeRatesTitle }: EkModeBadgesProps) {
  return (
    <>
      {yearType === 'assignment' ? (
        <span
          title={EK_MODE_ASSIGNMENT_TITLE}
          className="flex items-center gap-1.5 rounded-full text-xs px-2.5 py-1 bg-gray-100 text-gray-700"
        >
          <span className="w-[7px] h-[7px] rounded-full bg-blue-600" />
          По году назначения на закупщика
        </span>
      ) : (
        <span
          title={EK_MODE_CREATION_TITLE}
          className="flex items-center gap-1.5 rounded-full text-xs px-2.5 py-[3px] bg-amber-50 text-amber-800 border border-amber-200"
        >
          <span className="font-bold">!</span>
          По году создания — нет дат назначения на закупщика
        </span>
      )}
      {amountsInBaseCurrency && (
        <span
          title={exchangeRatesTitle}
          className="flex items-center gap-1.5 rounded-full text-xs px-2.5 py-1 bg-gray-100 text-gray-700 cursor-help"
        >
          <span className="font-semibold">{currencySymbol(baseCurrency)}</span>
          Суммы в {currencyNamePrepositional(baseCurrency)} по курсу
        </span>
      )}
    </>
  );
}
