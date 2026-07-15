import type { Delivery } from '../../types/delivery.types';
import { SECTION_LABEL } from '../../constants/delivery-modal.constants';
import { formatAmountFull, formatAmountShort } from '../../utils/amount.utils';
import { formatDate } from '../../utils/date.utils';
import { DeliveryField, DeliveryValue } from './DeliveryField';

interface Props {
  delivery: Delivery;
}

function SummaryRow({ label, value, strong = false }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[13px]">
      <span className="flex-shrink-0 text-[#667085]">{label}</span>
      <span className={`text-right ${strong ? 'font-bold text-[#101828] tabular-nums' : 'font-semibold text-[#101828]'}`}>
        {value}
      </span>
    </div>
  );
}

/** Колонка «Договор»: реквизиты договора и его условия оплаты. */
export function DeliveryContractSection({ delivery }: Props) {
  const muted = (text: string) => <span className="font-medium text-[#98a2b3]">{text}</span>;

  return (
    <div className="flex flex-col gap-[18px] border-r border-[#eceef1] px-[30px] py-[26px]">
      <div className={SECTION_LABEL}>Договор</div>

      <DeliveryField label="Номер">
        <DeliveryValue value={delivery.contractInnerId} className="tabular-nums" />
      </DeliveryField>

      <DeliveryField label="Наименование">
        <DeliveryValue value={delivery.contractName} className="leading-[1.5] [text-wrap:pretty]" />
      </DeliveryField>

      <DeliveryField label="Поставщик">
        <DeliveryValue value={delivery.supplierName} />
        {delivery.supplierInn && (
          <div className="mt-[3px] text-[13px] text-[#98a2b3] tabular-nums">ИНН {delivery.supplierInn}</div>
        )}
      </DeliveryField>

      <div className="mt-0.5 flex flex-col gap-3 rounded-xl bg-[#f7f8fa] p-4">
        <SummaryRow
          label="Сумма"
          value={
            <span title={formatAmountFull(delivery.amount, delivery.currency)}>
              {formatAmountShort(delivery.amount, delivery.currency)}
            </span>
          }
          strong
        />
        <div className="h-px bg-[#eceef1]" />
        <SummaryRow
          label="Схема (договор)"
          value={delivery.contractPaymentScheme?.trim() ? delivery.contractPaymentScheme : muted('Не указана')}
        />
        <SummaryRow
          label="Условия оплаты"
          value={delivery.contractPaymentTerms?.trim() ? delivery.contractPaymentTerms : muted('Не указаны')}
        />
        <SummaryRow
          label="Срок (договор)"
          value={delivery.contractDeliveryTerm?.trim() ? delivery.contractDeliveryTerm : muted('Не указан')}
        />
        <SummaryRow
          label="Регистрация"
          value={
            delivery.contractRegistrationDate ? (
              <span className="tabular-nums">{formatDate(delivery.contractRegistrationDate)}</span>
            ) : (
              muted('—')
            )
          }
        />
        <SummaryRow
          label="Синхронизация"
          value={
            delivery.contractSynchronizationDate ? (
              <span className="tabular-nums">{formatDate(delivery.contractSynchronizationDate)}</span>
            ) : (
              muted('—')
            )
          }
        />
      </div>
    </div>
  );
}
