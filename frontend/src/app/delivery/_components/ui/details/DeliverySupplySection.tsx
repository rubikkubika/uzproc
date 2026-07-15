import { ChevronDown } from 'lucide-react';
import type { Delivery, PaymentSchemeOption } from '../../types/delivery.types';
import { SHIPMENT_STATUS_OPTIONS } from '../../types/delivery.types';
import type { PaymentScheme } from '../../types/delivery-payments.types';
import { ADVANCE_LABEL, FACT_LABEL } from '../../types/delivery-payments.types';
import {
  EYEBROW,
  FIELD_BOX,
  PLACEHOLDER,
  SECTION_LABEL,
  SELECT_BOX,
} from '../../constants/delivery-modal.constants';
import { DeliveryField, DeliveryValue } from './DeliveryField';

interface Props {
  delivery: Delivery;
  paymentScheme: PaymentScheme | null;
  onSelectPaymentScheme: (scheme: PaymentScheme) => void;
  schemeOptions: PaymentSchemeOption[];
  selectedSchemeId: number | null;
  onSelectSchemeId: (id: number | null) => void;
  shipmentStatus: string | null;
  shipmentSaving: boolean;
  onChangeShipmentStatus: (value: string) => void;
  awaitingDeliveredDate: boolean;
  deliveredDate: string;
  onChangeDeliveredDate: (value: string) => void;
  onConfirmDeliveredDate: () => void;
  onCancelDeliveredDate: () => void;
  deliveryTermDays: string;
  onChangeDeliveryTermDays: (value: string) => void;
}

const SCHEME_TABS: Array<{ value: PaymentScheme; label: string }> = [
  { value: 'PREPAYMENT', label: ADVANCE_LABEL },
  { value: 'POSTPAYMENT', label: FACT_LABEL },
];

/** Колонка «Поставка»: схема оплаты, статус поставки, срок, комментарий. */
export function DeliverySupplySection({
  delivery,
  paymentScheme,
  onSelectPaymentScheme,
  schemeOptions,
  selectedSchemeId,
  onSelectSchemeId,
  shipmentStatus,
  shipmentSaving,
  onChangeShipmentStatus,
  awaitingDeliveredDate,
  deliveredDate,
  onChangeDeliveredDate,
  onConfirmDeliveredDate,
  onCancelDeliveredDate,
  deliveryTermDays,
  onChangeDeliveryTermDays,
}: Props) {
  return (
    <div className="flex flex-col gap-[18px] border-r border-[#eceef1] px-[30px] py-[26px]">
      <div className={SECTION_LABEL}>Поставка</div>

      <div className="flex gap-4">
        <DeliveryField label="№" className="flex-1">
          <div className="text-sm font-bold text-[#101828] tabular-nums">{delivery.innerId ?? delivery.id}</div>
        </DeliveryField>
        <DeliveryField label="Ответственный" className="flex-[2]">
          <DeliveryValue value={delivery.responsibleDisplayName} />
        </DeliveryField>
      </div>

      {/* Схема оплаты: тип + конкретная схема из справочника */}
      <div>
        <div className={`${EYEBROW} mb-2`}>
          Схема оплаты <span className="text-[#e5484d]">*</span>
        </div>
        <div className="flex gap-[3px] rounded-[10px] bg-[#f2f3f5] p-[3px]">
          {SCHEME_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => onSelectPaymentScheme(tab.value)}
              className={`flex-1 rounded-lg py-2 text-[13px] font-semibold transition-colors ${
                paymentScheme === tab.value
                  ? 'bg-[#4f46e5] text-white shadow-[0_2px_6px_-1px_rgba(79,70,229,.5)]'
                  : 'text-[#667085] hover:text-[#101828]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative mt-[9px]">
          <select
            value={selectedSchemeId ?? ''}
            onChange={(e) => onSelectSchemeId(e.target.value ? Number(e.target.value) : null)}
            disabled={!paymentScheme}
            className={`${SELECT_BOX} ${selectedSchemeId == null ? PLACEHOLDER : ''}`}
          >
            <option value="">{paymentScheme ? '— выберите схему —' : 'Сначала выберите тип'}</option>
            {schemeOptions.map((s) => (
              <option key={s.id} value={s.id} className="text-[#101828]">
                {s.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-[13px] top-1/2 h-4 w-4 -translate-y-1/2 text-[#98a2b3]" />
        </div>
      </div>

      {/* Статус поставки */}
      <div>
        <div className={`${EYEBROW} mb-2`}>Статус поставки</div>
        <div className="relative">
          <select
            value={shipmentStatus ?? ''}
            onChange={(e) => onChangeShipmentStatus(e.target.value)}
            disabled={shipmentSaving}
            className={SELECT_BOX}
          >
            <option value="" disabled>
              —
            </option>
            {SHIPMENT_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-[13px] top-1/2 h-4 w-4 -translate-y-1/2 text-[#98a2b3]" />
        </div>
        {awaitingDeliveredDate && (
          <div className="mt-2 flex flex-col gap-2 rounded-[10px] border border-[#fde68a] bg-[#fffbeb] p-3">
            <span className="text-[11px] font-medium text-[#667085]">Укажите фактическую дату поставки</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={deliveredDate}
                onChange={(e) => onChangeDeliveredDate(e.target.value)}
                className={`${FIELD_BOX} py-2`}
              />
              <button
                type="button"
                onClick={onConfirmDeliveredDate}
                disabled={shipmentSaving || !deliveredDate}
                className="flex-shrink-0 rounded-lg bg-[#4f46e5] px-3 py-2 text-xs font-semibold text-white hover:bg-[#4338ca] disabled:opacity-60"
              >
                ОК
              </button>
              <button
                type="button"
                onClick={onCancelDeliveredDate}
                disabled={shipmentSaving}
                className="flex-shrink-0 rounded-lg bg-[#f2f3f5] px-3 py-2 text-xs font-semibold text-[#344054] hover:bg-[#e6e8eb] disabled:opacity-60"
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Срок поставки */}
      <DeliveryField label="Срок поставки (раб. дней)">
        <input
          type="number"
          min={0}
          value={deliveryTermDays}
          onChange={(e) => onChangeDeliveryTermDays(e.target.value)}
          placeholder="Напр. 30"
          className={`${FIELD_BOX} placeholder:text-[#b0b6c0]`}
        />
      </DeliveryField>

      <DeliveryField label="Комментарий">
        <div className={`min-h-[42px] rounded-[10px] border border-[#e3e5e9] px-[13px] py-[11px] text-sm ${
          delivery.comment ? 'text-[#101828]' : PLACEHOLDER
        }`}>
          {delivery.comment ?? '—'}
        </div>
      </DeliveryField>
    </div>
  );
}
