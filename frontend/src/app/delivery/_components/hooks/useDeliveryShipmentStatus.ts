import { useCallback, useEffect, useState } from 'react';
import { getBackendUrl } from '@/utils/api';
import type { Delivery } from '../types/delivery.types';
import { SHIPMENT_STATUS_OPTIONS } from '../types/delivery.types';
import { todayIso } from '../utils/date.utils';

interface Params {
  delivery: Delivery | null;
  onSaved: () => void;
  onError: (message: string | null) => void;
}

/**
 * Статус поставки. Сохраняется сразу при выборе; при переводе в «Поставлено»
 * сначала запрашивается фактическая дата поставки.
 */
export function useDeliveryShipmentStatus({ delivery, onSaved, onError }: Params) {
  const [shipmentStatus, setShipmentStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [awaitingDeliveredDate, setAwaitingDeliveredDate] = useState(false);
  const [deliveredDate, setDeliveredDate] = useState<string>('');

  useEffect(() => {
    if (!delivery) return;
    const matched = SHIPMENT_STATUS_OPTIONS.find((o) => o.label === delivery.shipmentStatus);
    setShipmentStatus(matched?.value ?? null);
    setSaving(false);
    setAwaitingDeliveredDate(false);
    setDeliveredDate(delivery.actualDeliveryDate ?? todayIso());
  }, [delivery]);

  const send = useCallback(
    async (value: string, actualDeliveryDate: string | null) => {
      if (!delivery) return;
      const prev = shipmentStatus;
      setShipmentStatus(value);
      setSaving(true);
      onError(null);
      try {
        const res = await fetch(`${getBackendUrl()}/api/deliveries/${delivery.id}/shipment-status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shipmentStatus: value, actualDeliveryDate }),
        });
        if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
        setAwaitingDeliveredDate(false);
        onSaved();
      } catch (e) {
        setShipmentStatus(prev);
        onError(e instanceof Error ? e.message : 'Ошибка сохранения статуса поставки');
      } finally {
        setSaving(false);
      }
    },
    [delivery, shipmentStatus, onSaved, onError]
  );

  const changeStatus = useCallback(
    async (value: string) => {
      if (!delivery) return;
      if (value === 'DELIVERED') {
        setShipmentStatus('DELIVERED');
        setDeliveredDate(delivery.actualDeliveryDate ?? todayIso());
        setAwaitingDeliveredDate(true);
        return;
      }
      setAwaitingDeliveredDate(false);
      await send(value, null);
    },
    [delivery, send]
  );

  const confirmDeliveredDate = useCallback(async () => {
    if (!deliveredDate) {
      onError('Укажите фактическую дату поставки');
      return;
    }
    await send('DELIVERED', deliveredDate);
  }, [deliveredDate, send, onError]);

  const cancelDeliveredDate = useCallback(() => {
    setAwaitingDeliveredDate(false);
    const matched = SHIPMENT_STATUS_OPTIONS.find((o) => o.label === delivery?.shipmentStatus);
    setShipmentStatus(matched?.value ?? null);
  }, [delivery?.shipmentStatus]);

  return {
    shipmentStatus,
    saving,
    changeStatus,
    awaitingDeliveredDate,
    deliveredDate,
    setDeliveredDate,
    confirmDeliveredDate,
    cancelDeliveredDate,
  };
}
