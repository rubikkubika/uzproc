import { useEffect, useState } from 'react';
import { getBackendUrl } from '@/utils/api';
import type { ContractPayment } from '../types/delivery-payments.types';

/** Оплаты договора, к которому привязана поставка. */
export function useContractPayments(contractId: number | null, enabled: boolean) {
  const [payments, setPayments] = useState<ContractPayment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || contractId == null) {
      setPayments([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`${getBackendUrl()}/api/deliveries/contracts/${contractId}/payments`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((json: ContractPayment[]) => {
        if (!cancelled) setPayments(json);
      })
      .catch(() => {
        if (!cancelled) setPayments([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [contractId, enabled]);

  return { payments, loading };
}
