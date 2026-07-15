import { useMemo } from 'react';
import type { Delivery } from '../types/delivery.types';
import type { ContractPayment } from '../types/delivery-payments.types';
import { formatDate, maxDate } from '../utils/date.utils';

export type TimelineStepState = 'done' | 'current' | 'pending';
export type TimelineIcon = 'check' | 'calendar' | 'none';

export interface TimelineStep {
  key: string;
  label: string;
  date: string;
  state: TimelineStepState;
  icon: TimelineIcon;
}

interface Params {
  delivery: Delivery | null;
  contractPayments: ContractPayment[];
  advancePaymentIds: Set<number>;
  factPaymentIds: Set<number>;
}

/**
 * Цепочка поставки: Синхронизация → Оплата → План поставки → Факт / ЭСФ.
 * Дедлайн = базовая дата + срок поставки, пересчитывается на бэкенде при сохранении.
 */
export function useDeliveryTimeline({
  delivery,
  contractPayments,
  advancePaymentIds,
  factPaymentIds,
}: Params): TimelineStep[] {
  return useMemo(() => {
    if (!delivery) return [];

    const syncDate = delivery.contractSynchronizationDate ?? delivery.contractRegistrationDate;

    // Дата оплаты — самая поздняя фактическая оплата среди распределённых
    const paidDate = maxDate(
      contractPayments
        .filter((p) => advancePaymentIds.has(p.id) || factPaymentIds.has(p.id))
        .map((p) => p.paymentDate)
    );

    const planDate = delivery.deliveryDeadline ?? delivery.contractPlannedDeliveryStartDate;
    const factDate = delivery.actualDeliveryDate ?? delivery.esfDate;

    const planState: TimelineStepState = factDate ? 'done' : planDate ? 'current' : 'pending';

    return [
      {
        key: 'sync',
        label: 'Синхронизация',
        date: formatDate(syncDate, 'нет данных'),
        state: syncDate ? 'done' : 'pending',
        icon: syncDate ? 'check' : 'none',
      },
      {
        key: 'payment',
        label: 'Оплата',
        date: formatDate(paidDate, 'ожидается'),
        state: paidDate ? 'done' : 'pending',
        icon: paidDate ? 'check' : 'none',
      },
      {
        key: 'plan',
        label: 'План поставки',
        date: formatDate(planDate, 'не рассчитан'),
        state: planState,
        icon: planState === 'done' ? 'check' : planState === 'current' ? 'calendar' : 'none',
      },
      {
        key: 'fact',
        label: 'Факт / ЭСФ',
        date: formatDate(factDate, 'ожидается'),
        state: factDate ? 'done' : 'pending',
        icon: factDate ? 'check' : 'none',
      },
    ];
  }, [delivery, contractPayments, advancePaymentIds, factPaymentIds]);
}
