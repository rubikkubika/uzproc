import { CARD } from '../../constants/delivery-modal.constants';
import { formatAmountFull, formatAmountShort } from '../../utils/amount.utils';

interface Props {
  pct: number;
  amount: number;
  total: number;
  currency: string | null;
}

/** Доля распределённых оплат от суммы поставки. */
export function DeliveryPaymentsProgress({ pct, amount, total, currency }: Props) {
  const full = pct >= 100;
  return (
    <div className={CARD}>
      <div className="mb-[11px] flex items-baseline justify-between">
        <span className="text-[13px] font-medium text-[#667085]">Оплаты распределены</span>
        <span className={`text-base font-bold ${full ? 'text-[#137a43]' : 'text-[#667085]'}`}>{pct}%</span>
      </div>
      <div className="h-[9px] overflow-hidden rounded-full bg-[#eef0f2]">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${
            full ? 'bg-gradient-to-r from-[#22a15b] to-[#2bb56a]' : 'bg-gradient-to-r from-[#4f46e5] to-[#6366f1]'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-[11px] flex justify-between text-[13px] tabular-nums">
        <span className="font-bold text-[#101828]" title={formatAmountFull(amount, currency)}>
          {formatAmountShort(amount)} распределено
        </span>
        <span className="text-[#98a2b3]" title={formatAmountFull(total, currency)}>
          из {formatAmountShort(total, currency)}
        </span>
      </div>
    </div>
  );
}
