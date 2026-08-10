import { useState, useCallback, useEffect } from 'react';
import { getBackendUrl } from '@/utils/api';
import { TabType } from '../types/payments.types';

interface UsePaymentTabCountsOptions {
  filters: Record<string, string>;
  cfoFilter: Set<string>;
  paymentStatusFilter: string;
  requestStatusFilter: string;
  paymentTypeFilter: string;
  plannedExpenseMonth: string;
  plannedExpenseYear: string;
  paymentMonth: string;
  paymentYear: string;
}

/**
 * Счётчики записей по вкладкам (Не оплачены / Оплачены / Все) с учётом текущих фильтров.
 * Один запрос на /api/payments/tab-counts вместо отдельных запросов по каждой вкладке.
 */
export function usePaymentTabCounts({
  filters,
  cfoFilter,
  paymentStatusFilter,
  requestStatusFilter,
  paymentTypeFilter,
  plannedExpenseMonth,
  plannedExpenseYear,
  paymentMonth,
  paymentYear,
}: UsePaymentTabCountsOptions) {
  const [tabCounts, setTabCounts] = useState<Record<TabType, number | null>>({
    unpaid: null,
    paid: null,
    all: null,
  });

  const fetchTabCounts = useCallback(async () => {
    const params = new URLSearchParams();

    if (filters.mainId?.trim()) params.append('mainId', filters.mainId.trim());
    if (filters.comment?.trim()) params.append('comment', filters.comment.trim());
    if (filters.counterparty?.trim()) params.append('counterparty', filters.counterparty.trim());
    if (filters.purchaseRequestNumber?.trim()) params.append('purchaseRequestNumber', filters.purchaseRequestNumber.trim());
    if (filters.contractTitle?.trim()) params.append('contractTitle', filters.contractTitle.trim());
    if (filters.executor?.trim()) params.append('executor', filters.executor.trim());
    if (filters.responsible?.trim()) params.append('responsible', filters.responsible.trim());

    if (filters.amount?.trim()) {
      const amountValue = parseFloat(filters.amount.replace(/\s/g, '').replace(/,/g, ''));
      if (!isNaN(amountValue) && amountValue >= 0) {
        params.append('amount', String(amountValue));
        params.append('amountOperator', filters.amountOperator?.trim() || 'gte');
      }
    }

    if (cfoFilter.size > 0) cfoFilter.forEach(cfo => params.append('cfo', cfo));
    if (paymentStatusFilter?.trim()) params.append('paymentStatus', paymentStatusFilter.trim());
    if (requestStatusFilter?.trim()) params.append('requestStatus', requestStatusFilter.trim());
    if (paymentTypeFilter?.trim()) params.append('paymentType', paymentTypeFilter.trim());
    if (plannedExpenseMonth?.trim()) params.append('plannedExpenseMonth', plannedExpenseMonth.trim());
    if (plannedExpenseYear?.trim()) params.append('plannedExpenseYear', plannedExpenseYear.trim());
    if (paymentMonth?.trim()) params.append('paymentMonth', paymentMonth.trim());
    if (paymentYear?.trim()) params.append('paymentYear', paymentYear.trim());

    try {
      const res = await fetch(`${getBackendUrl()}/api/payments/tab-counts?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      setTabCounts({
        unpaid: data['unpaid'] ?? 0,
        paid: data['paid'] ?? 0,
        all: data['all'] ?? 0,
      });
    } catch {
      // оставляем предыдущие значения при ошибке
    }
  }, [filters, cfoFilter, paymentStatusFilter, requestStatusFilter, paymentTypeFilter,
      plannedExpenseMonth, plannedExpenseYear, paymentMonth, paymentYear]);

  useEffect(() => {
    // fetchTabCounts асинхронный: setState вызывается после await (не синхронный каскад ререндеров)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTabCounts();
  }, [fetchTabCounts]);

  return { tabCounts, refreshTabCounts: fetchTabCounts };
}
