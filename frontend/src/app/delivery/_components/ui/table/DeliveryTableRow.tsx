'use client';

import type { Delivery } from '../../types/delivery.types';
import type { DeliveryRowView } from '../../types/delivery-view.types';
import { DELIVERY_GRID_CLASS } from '../../constants/delivery.constants';
import { TONE_STRIPE } from '../../constants/delivery-tone.constants';
import DeliverySignalCell from './cells/DeliverySignalCell';
import DeliveryDatesCell from './cells/DeliveryDatesCell';
import DeliveryShipmentCell from './cells/DeliveryShipmentCell';
import DeliveryMoneyCell from './cells/DeliveryMoneyCell';
import DeliveryContractCell from './cells/DeliveryContractCell';

export interface DeliveryRowHandlers {
  onOpen: (delivery: Delivery) => void;
  onChangePlannedDate: (id: number, isoDate: string) => void;
  onChangeActualDate: (id: number, isoDate: string) => void;
  onChangeEsfDate: (id: number, isoDate: string) => void;
  /** URL возврата в раздел для ссылок на договор и заявку */
  backUrl: string;
  /** Запоминает позицию в списке перед переходом по ссылке */
  onNavigate: () => void;
}

interface Props extends DeliveryRowHandlers {
  row: DeliveryRowView;
  isFirst: boolean;
}

/** Строка таблицы поставок. Полоска слева повторяет цвет сигнала; клик открывает карточку поставки. */
export default function DeliveryTableRow({
  row, isFirst, onOpen, onChangePlannedDate, onChangeActualDate, onChangeEsfDate, backUrl, onNavigate,
}: Props) {
  const d = row.delivery;
  const stripe = row.signal ? TONE_STRIPE[row.signal.tone] : '';

  return (
    <div
      data-tour={isFirst ? 'first-row' : undefined}
      onClick={() => onOpen(d)}
      className={`${DELIVERY_GRID_CLASS} items-start px-5 py-[9px] border-b border-slate-100 text-[12px] leading-[1.35] cursor-pointer ${
        row.highlighted ? 'bg-[#f5f9ff]' : 'bg-white'
      } hover:bg-slate-50 ${stripe}`}
    >
      <div className="pr-2 min-w-0"><DeliverySignalCell innerId={d.innerId} signal={row.signal} /></div>
      <div className="pr-2 min-w-0">
        <DeliveryDatesCell
          row={row}
          onChangePlannedDate={onChangePlannedDate}
          onChangeActualDate={onChangeActualDate}
          onChangeEsfDate={onChangeEsfDate}
        />
      </div>
      <div className="pr-2 min-w-0"><DeliveryShipmentCell row={row} /></div>
      <div className="pr-2 min-w-0"><DeliveryMoneyCell row={row} /></div>
      <div className="pr-2 min-w-0"><DeliveryContractCell delivery={d} backUrl={backUrl} onNavigate={onNavigate} /></div>
      <div className="pr-2 min-w-0 truncate text-slate-900" title={d.supplierName ?? undefined}>{d.supplierName ?? '—'}</div>
      <div className="pr-2 min-w-0 whitespace-nowrap tabular-nums" title={row.amountFull}>
        <span className="font-semibold">{row.amountText}</span>{' '}
        <span className="text-[11px] text-slate-500">{row.currency}</span>
      </div>
      <div className="pr-2 min-w-0 text-[11px] text-slate-600 line-clamp-2" title={d.comment ?? undefined}>{d.comment || '—'}</div>
      <div
        className={`min-w-0 truncate text-slate-900 ${row.highlighted ? 'font-semibold' : ''}`}
        title={d.responsibleDisplayName ?? undefined}
      >
        {d.responsibleDisplayName ?? '—'}
      </div>
    </div>
  );
}
