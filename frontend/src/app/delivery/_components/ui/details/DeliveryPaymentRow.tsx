import { Check } from 'lucide-react';
import type { ContractPayment } from '../../types/delivery-payments.types';
import { CHIP_MUTED, CHIP_NEUTRAL, CHIP_SUCCESS, PAYMENT_ROW } from '../../constants/delivery-modal.constants';
import { formatAmountFull, formatAmountShort } from '../../utils/amount.utils';
import { formatDate } from '../../utils/date.utils';

interface Props {
  payment: ContractPayment;
  checked: boolean;
  onToggle: (id: number) => void;
}

/** Строка-карточка оплаты договора с отметкой принадлежности к типу. */
export function DeliveryPaymentRow({ payment, checked, onToggle }: Props) {
  const paid = Boolean(payment.paymentDate);

  return (
    <button type="button" onClick={() => onToggle(payment.id)} className={PAYMENT_ROW}>
      <span
        aria-hidden
        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border transition-colors ${
          checked ? 'border-[#4f46e5] bg-[#4f46e5]' : 'border-[#cfd3da] bg-white'
        }`}
      >
        {checked && <Check className="h-[13px] w-[13px] text-white" strokeWidth={3} />}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-bold text-[#101828] tabular-nums">{payment.mainId ?? '—'}</span>
          {payment.paymentType && <span className={CHIP_NEUTRAL}>{payment.paymentType}</span>}
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-[7px]">
          {payment.paymentStatus && (
            <span className={paid ? CHIP_SUCCESS : CHIP_MUTED}>{payment.paymentStatus}</span>
          )}
          {payment.requestStatus && <span className={CHIP_MUTED}>{payment.requestStatus}</span>}
          <span className="text-xs text-[#98a2b3] tabular-nums">
            {formatDate(payment.paymentDate ?? payment.plannedExpenseDate)}
          </span>
        </span>
      </span>

      <span
        className="flex-shrink-0 text-[15px] font-bold text-[#101828] tabular-nums"
        title={formatAmountFull(payment.amount)}
      >
        {formatAmountShort(payment.amount)}
      </span>
    </button>
  );
}
