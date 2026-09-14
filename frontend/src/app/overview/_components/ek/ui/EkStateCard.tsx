'use client';

import { EK_SELECTION_RULES } from '../constants/ek.constants';

type EkStateCardProps =
  | { variant: 'error'; message: string; onRetry: () => void }
  | { variant: 'empty'; year: number; nearestYear: number | null; onShowYear: (year: number) => void };

/** Карточка состояния дашборда ЕК: ошибка загрузки или нет заявок за год */
export function EkStateCard(props: EkStateCardProps) {
  const isError = props.variant === 'error';
  return (
    <div className="bg-white rounded-xl shadow-sm min-h-[220px] flex flex-col items-center justify-center text-center gap-2 px-5 py-7">
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center text-lg ${
          isError ? 'bg-red-50 text-red-700 font-bold' : 'bg-gray-100 text-gray-500 font-semibold'
        }`}
      >
        {isError ? '!' : '0'}
      </div>
      {props.variant === 'error' ? (
        <>
          <div className="text-sm font-semibold text-gray-900">Не удалось загрузить данные</div>
          <div className="text-xs text-gray-500 max-w-[280px]">{props.message}</div>
          <button
            type="button"
            onClick={props.onRetry}
            className="text-[13px] px-3.5 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 mt-1.5"
          >
            Повторить
          </button>
        </>
      ) : (
        <>
          <div className="text-sm font-semibold text-gray-900">Нет заявок за {props.year} год</div>
          <div className="text-xs text-gray-500 max-w-[300px]">{EK_SELECTION_RULES}</div>
          {props.nearestYear != null && (
            <button
              type="button"
              onClick={() => props.onShowYear(props.nearestYear as number)}
              className="text-[13px] text-blue-600 hover:text-blue-700 mt-1.5"
            >
              Показать {props.nearestYear} →
            </button>
          )}
        </>
      )}
    </div>
  );
}
