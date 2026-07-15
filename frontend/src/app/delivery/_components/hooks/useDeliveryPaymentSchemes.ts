import { useEffect, useState } from 'react';
import { getBackendUrl } from '@/utils/api';
import type { PaymentSchemeOption } from '../types/delivery.types';

/** Справочник схем оплаты (загружается один раз). */
export function useDeliveryPaymentSchemes() {
  const [schemes, setSchemes] = useState<PaymentSchemeOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`${getBackendUrl()}/api/deliveries/payment-schemes`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((json: PaymentSchemeOption[]) => {
        if (!cancelled) setSchemes(json);
      })
      .catch(() => {
        if (!cancelled) setSchemes([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return schemes;
}
