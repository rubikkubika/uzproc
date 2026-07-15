import type { Delivery } from '../../types/delivery.types';
import type { ContractPayment, PaymentScheme } from '../../types/delivery-payments.types';
import { ADVANCE_LABEL, FACT_LABEL } from '../../types/delivery-payments.types';
import { EYEBROW, SECTION_LABEL } from '../../constants/delivery-modal.constants';
import { DeliveryPaymentRow } from './DeliveryPaymentRow';
import { DeliveryPaymentsProgress } from './DeliveryPaymentsProgress';

interface Group {
  title: string;
  hint: string;
  items: ContractPayment[];
  selectedIds: Set<number>;
  onToggle: (id: number) => void;
  emptyText: string;
}

interface Props {
  delivery: Delivery;
  paymentScheme: PaymentScheme | null;
  loading: boolean;
  advanceCandidates: ContractPayment[];
  factCandidates: ContractPayment[];
  advancePaymentIds: Set<number>;
  factPaymentIds: Set<number>;
  onToggleAdvance: (id: number) => void;
  onToggleFact: (id: number) => void;
  distributed: { amount: number; total: number; pct: number };
}

function PaymentsGroup({ group, loading }: { group: Group; loading: boolean }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className={EYEBROW}>{group.title}</span>
        <span className="text-xs text-[#98a2b3]">{group.hint}</span>
      </div>
      {loading ? (
        <div className="rounded-[14px] border border-dashed border-[#e3e5e9] px-4 py-5 text-center text-[13px] text-[#98a2b3]">
          Загрузка…
        </div>
      ) : group.items.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-[#e3e5e9] px-4 py-5 text-center text-[13px] text-[#98a2b3]">
          {group.emptyText}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {group.items.map((p) => (
            <DeliveryPaymentRow
              key={p.id}
              payment={p}
              checked={group.selectedIds.has(p.id)}
              onToggle={group.onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Колонка «Оплаты»: прогресс распределения и списки оплат по типам. */
export function DeliveryPaymentsSection({
  delivery,
  paymentScheme,
  loading,
  advanceCandidates,
  factCandidates,
  advancePaymentIds,
  factPaymentIds,
  onToggleAdvance,
  onToggleFact,
  distributed,
}: Props) {
  const groups: Group[] = [];

  // Аванс — только для схемы с авансом
  if (paymentScheme === 'PREPAYMENT') {
    groups.push({
      title: ADVANCE_LABEL,
      hint: 'присвоить тип «Аванс»',
      items: advanceCandidates,
      selectedIds: advancePaymentIds,
      onToggle: onToggleAdvance,
      emptyText: 'Нет доступных оплат для типа «Аванс»',
    });
  }

  groups.push({
    title: 'Оплаты',
    hint: 'присвоить тип «По факту»',
    items: factCandidates,
    selectedIds: factPaymentIds,
    onToggle: onToggleFact,
    emptyText: 'Нет доступных оплат для типа «По факту»',
  });

  return (
    <div className="flex min-w-0 flex-col gap-[18px] bg-[#fcfcfd] px-[30px] py-[26px]">
      <div className="flex items-center justify-between">
        <div className={SECTION_LABEL}>Оплаты</div>
        <div className="text-xs text-[#98a2b3]">отметьте оплаты поставки</div>
      </div>

      <DeliveryPaymentsProgress
        pct={distributed.pct}
        amount={distributed.amount}
        total={distributed.total}
        currency={delivery.currency}
      />

      {groups.map((group) => (
        <PaymentsGroup key={group.title} group={group} loading={loading} />
      ))}
    </div>
  );
}
