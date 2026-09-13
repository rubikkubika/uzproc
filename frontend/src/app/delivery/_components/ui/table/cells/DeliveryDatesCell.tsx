'use client';

import { RotateCcw } from 'lucide-react';
import type { DeliveryRowView } from '../../../types/delivery-view.types';
import { formatShortDate } from '../../../utils/date.utils';
import DeliveryInlineDate from './DeliveryInlineDate';

interface Props {
  row: DeliveryRowView;
  /** Пустая строка возвращает плановую дату в автоматический режим */
  onChangePlannedDate: (id: number, isoDate: string) => void;
  /** Пустая строка очищает фактическую дату */
  onChangeActualDate: (id: number, isoDate: string) => void;
  /** Пустая строка очищает дату ЭСФ */
  onChangeEsfDate: (id: number, isoDate: string) => void;
}

const LABEL = 'text-[10px] uppercase tracking-[.03em] text-slate-400';

/**
 * Колонка «Даты поставки». План — главная дата (по умолчанию равна дедлайну; изменённая вручную
 * синяя, со значком возврата). Дедлайн — справочный, только чтение. Факт и ЭСФ редактируются по клику;
 * заполнение факта переводит поставку в «Поставлено».
 */
export default function DeliveryDatesCell({ row, onChangePlannedDate, onChangeActualDate, onChangeEsfDate }: Props) {
  const d = row.delivery;
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 content-start tabular-nums min-w-0">
      <span className={`${LABEL} leading-[18px]`}>План</span>
      <span className="leading-[18px]">
        <DeliveryInlineDate
          value={d.plannedDeliveryDate}
          title={row.plannedManual
            ? 'Плановая дата поставки — задана вручную, автоматические пересчёты её не меняют'
            : 'Плановая дата поставки — по умолчанию равна дедлайну'}
          onCommit={(iso) => onChangePlannedDate(d.id, iso)}
          textClass={`font-semibold ${row.plannedManual ? 'text-blue-600' : 'text-slate-900'}`}
          trailing={row.plannedManual && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChangePlannedDate(d.id, ''); }}
              title="Вернуть автоматическую дату (равна дедлайну)"
              className="text-blue-600 hover:text-blue-800"
            >
              <RotateCcw className="w-[11px] h-[11px]" strokeWidth={2.2} />
            </button>
          )}
        />
      </span>

      <span className={`${LABEL} leading-4`}>Дедл.</span>
      <span className="leading-4 text-slate-500" title="Дедлайн (вычисляется автоматически)">{formatShortDate(d.deliveryDeadline)}</span>

      <span className={`${LABEL} leading-4`}>Факт</span>
      <span className="leading-4">
        <DeliveryInlineDate
          value={d.actualDeliveryDate}
          title="Факт — фактическая дата поставки. С датой поставка переходит в «Поставлено», без даты — снова ожидается"
          onCommit={(iso) => onChangeActualDate(d.id, iso)}
          textClass="font-semibold text-slate-900"
        />
      </span>

      <span className={`${LABEL} leading-4`}>ЭСФ</span>
      <span className="leading-4">
        <DeliveryInlineDate
          value={d.esfDate}
          title="ЭСФ — дата выставления электронной счёт-фактуры"
          onCommit={(iso) => onChangeEsfDate(d.id, iso)}
          textClass="text-slate-900"
        />
      </span>
    </div>
  );
}
