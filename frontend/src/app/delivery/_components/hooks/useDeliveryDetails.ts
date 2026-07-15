import { useCallback, useEffect, useMemo, useState } from 'react';
import { getBackendUrl } from '@/utils/api';
import type { Delivery } from '../types/delivery.types';
import type { PaymentScheme } from '../types/delivery-payments.types';
import { useContractPayments } from './useContractPayments';
import { useDeliveryPaymentSchemes } from './useDeliveryPaymentSchemes';
import { useDeliveryPaymentsForm } from './useDeliveryPaymentsForm';
import { useDeliveryShipmentStatus } from './useDeliveryShipmentStatus';
import { useDeliveryTimeline } from './useDeliveryTimeline';

interface Params {
  delivery: Delivery | null;
  onClose: () => void;
  onSaved: () => void;
}

/** Вся логика карточки поставки: данные, форма распределения, статус, сохранение. */
export function useDeliveryDetails({ delivery, onClose, onSaved }: Params) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    setError(null);
    setSubmitting(false);
    setResetting(false);
  }, [delivery]);

  const schemes = useDeliveryPaymentSchemes();
  const { payments: contractPayments, loading: paymentsLoading } = useContractPayments(
    delivery?.contractId ?? null,
    Boolean(delivery)
  );
  const form = useDeliveryPaymentsForm({ delivery, contractPayments });
  const shipment = useDeliveryShipmentStatus({ delivery, onSaved, onError: setError });
  const timeline = useDeliveryTimeline({
    delivery,
    contractPayments,
    advancePaymentIds: form.advancePaymentIds,
    factPaymentIds: form.factPaymentIds,
  });

  /** Схемы выбранного типа — для выпадающего списка. */
  const schemeOptions = useMemo(
    () => schemes.filter((s) => s.paymentType === form.paymentScheme),
    [schemes, form.paymentScheme]
  );

  const selectPaymentScheme = useCallback(
    (scheme: PaymentScheme) => {
      form.changePaymentScheme(scheme, (id) => schemes.find((s) => s.id === id)?.paymentType);
    },
    [form, schemes]
  );

  const canSubmit = form.selectedSchemeId != null && !submitting && !resetting;
  const canReset = Boolean(delivery?.paymentScheme || delivery?.paymentsDistributed) && !submitting && !resetting;

  const save = useCallback(async () => {
    if (!delivery || form.selectedSchemeId == null) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${getBackendUrl()}/api/deliveries/${delivery.id}/payments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentScheme: form.paymentScheme,
          paymentSchemeId: form.selectedSchemeId,
          advancePaymentIds: Array.from(form.advancePaymentIds),
          factPaymentIds: Array.from(form.factPaymentIds),
          deliveryTermWorkingDays:
            form.deliveryTermDays.trim() !== '' ? Number(form.deliveryTermDays) : null,
        }),
      });
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSubmitting(false);
    }
  }, [delivery, form, onSaved, onClose]);

  const resetDistribution = useCallback(async () => {
    if (!delivery) return;
    setResetting(true);
    setError(null);
    try {
      const res = await fetch(`${getBackendUrl()}/api/deliveries/${delivery.id}/payments/reset`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сброса распределения');
    } finally {
      setResetting(false);
    }
  }, [delivery, onSaved, onClose]);

  return {
    form,
    shipment,
    timeline,
    schemeOptions,
    selectPaymentScheme,
    contractPayments,
    paymentsLoading,
    error,
    submitting,
    resetting,
    canSubmit,
    canReset,
    save,
    resetDistribution,
  };
}
