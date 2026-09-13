import type { Delivery } from '../types/delivery.types';
import { getPaymentSchemeLabel, getPaymentsStatus } from '../types/delivery.types';
import type { DeliveryRowView, ToneLabel } from '../types/delivery-view.types';
import { PAYMENT_STATUS_TONE, SHIPMENT_TONE } from '../constants/delivery-tone.constants';
import { formatAmountFull, formatAmountShort } from './amount.utils';
import { getRowSignal, hasReportDiscrepancy, isDelivered } from './delivery-signal.utils';

const PAYMENTS_TONE = { none: 'slate', undistributed: 'orange', distributed: 'green' } as const;

/** Подготавливает поставку к отображению в строке таблицы. */
export function toDeliveryRowView(d: Delivery, today: Date, highlightedResponsible: string): DeliveryRowView {
  const payments = getPaymentsStatus(d.paymentsCount, d.paymentsDistributed);
  const schemeLabel = d.paymentSchemeLabel ?? getPaymentSchemeLabel(d.paymentScheme);
  const shipment: ToneLabel | null = d.shipmentStatus
    ? { label: d.shipmentStatus, tone: SHIPMENT_TONE[d.shipmentStatus] ?? 'slate' }
    : null;
  const paymentStatus: ToneLabel | null = d.status
    ? { label: d.status, tone: PAYMENT_STATUS_TONE[d.status] ?? 'slate' }
    : null;

  return {
    delivery: d,
    signal: getRowSignal(d, today),
    plannedManual: d.plannedDeliveryDateManual,
    shipment,
    esfState: d.esfDate ? 'present' : isDelivered(d) ? 'missing' : 'pending',
    reportDiscrepancy: hasReportDiscrepancy(d) ? d.reportStatus : null,
    schemeLabel,
    schemeMissing: !d.paymentSchemeLabel && !d.paymentScheme,
    payments: { label: payments.label, tone: PAYMENTS_TONE[payments.kind] },
    paymentStatus,
    // Валюта показывается отдельно, мельче — поэтому в сокращённую сумму её не передаём
    amountText: d.amount != null ? formatAmountShort(d.amount) : '—',
    amountFull: formatAmountFull(d.amount, d.currency),
    currency: d.amount != null ? d.currency ?? '' : '',
    highlighted: highlightedResponsible !== '' && d.responsibleDisplayName === highlightedResponsible,
  };
}
