import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Delivery } from '../types/delivery.types';
import type { ContractPayment, PaymentScheme } from '../types/delivery-payments.types';
import { ADVANCE_LABEL, FACT_LABEL, sumPayments } from '../types/delivery-payments.types';

interface Params {
  delivery: Delivery | null;
  contractPayments: ContractPayment[];
}

/**
 * Форма распределения оплат: тип схемы (Аванс / По факту), конкретная схема
 * из справочника, срок поставки и разметка оплат договора по типам.
 */
export function useDeliveryPaymentsForm({ delivery, contractPayments }: Params) {
  const [paymentScheme, setPaymentScheme] = useState<PaymentScheme | null>(null);
  const [selectedSchemeId, setSelectedSchemeId] = useState<number | null>(null);
  const [advancePaymentIds, setAdvancePaymentIds] = useState<Set<number>>(new Set());
  const [factPaymentIds, setFactPaymentIds] = useState<Set<number>>(new Set());
  const [deliveryTermDays, setDeliveryTermDays] = useState<string>('');

  // Схема и срок — из поставки
  useEffect(() => {
    if (!delivery) return;
    setPaymentScheme(delivery.paymentScheme ?? null);
    setSelectedSchemeId(delivery.paymentSchemeId ?? null);
    setDeliveryTermDays(delivery.deliveryTermWorkingDays != null ? String(delivery.deliveryTermWorkingDays) : '');
  }, [delivery]);

  // Текущее распределение — из типов, уже проставленных оплатам договора
  useEffect(() => {
    setAdvancePaymentIds(new Set(contractPayments.filter((p) => p.paymentType === ADVANCE_LABEL).map((p) => p.id)));
    setFactPaymentIds(new Set(contractPayments.filter((p) => p.paymentType === FACT_LABEL).map((p) => p.id)));
  }, [contractPayments]);

  /** Оплата принадлежит только одному типу: отметка в одном списке снимает её в другом. */
  const toggle = useCallback((id: number, target: 'advance' | 'fact') => {
    const setTarget = target === 'advance' ? setAdvancePaymentIds : setFactPaymentIds;
    const setOther = target === 'advance' ? setFactPaymentIds : setAdvancePaymentIds;
    setTarget((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setOther((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const toggleAdvance = useCallback((id: number) => toggle(id, 'advance'), [toggle]);
  const toggleFact = useCallback((id: number) => toggle(id, 'fact'), [toggle]);

  /** Оплаты, доступные для типа «Аванс» (не отмеченные как «По факту»). */
  const advanceCandidates = useMemo(
    () => contractPayments.filter((p) => p.paymentType !== FACT_LABEL && !factPaymentIds.has(p.id)),
    [contractPayments, factPaymentIds]
  );

  /** Оплаты, доступные для типа «По факту» (не отмеченные как «Аванс»). */
  const factCandidates = useMemo(
    () => contractPayments.filter((p) => p.paymentType !== ADVANCE_LABEL && !advancePaymentIds.has(p.id)),
    [contractPayments, advancePaymentIds]
  );

  /** Сумма распределённых оплат и её доля от суммы поставки (0–100%). */
  const distributed = useMemo(() => {
    const amount =
      sumPayments(contractPayments, advancePaymentIds) + sumPayments(contractPayments, factPaymentIds);
    const total = delivery?.amount ?? 0;
    const pct = total > 0 ? Math.min(100, Math.max(0, Math.round((amount / total) * 100))) : 0;
    return { amount, total, pct };
  }, [contractPayments, advancePaymentIds, factPaymentIds, delivery?.amount]);

  /** Смена типа схемы сбрасывает конкретную схему, если она другого типа. */
  const changePaymentScheme = useCallback(
    (scheme: PaymentScheme, schemeTypeById: (id: number) => PaymentScheme | undefined) => {
      setPaymentScheme(scheme);
      setSelectedSchemeId((prev) => (prev != null && schemeTypeById(prev) !== scheme ? null : prev));
    },
    []
  );

  return {
    paymentScheme,
    changePaymentScheme,
    selectedSchemeId,
    setSelectedSchemeId,
    advancePaymentIds,
    factPaymentIds,
    toggleAdvance,
    toggleFact,
    advanceCandidates,
    factCandidates,
    distributed,
    deliveryTermDays,
    setDeliveryTermDays,
  };
}
