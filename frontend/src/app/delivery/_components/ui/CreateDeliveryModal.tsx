'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { getBackendUrl } from '@/utils/api';

interface ContractSearchResult {
  id: number;
  innerId: string | null;
  name: string | null;
  title: string | null;
  documentForm: string | null;
  supplierName: string | null;
  budgetAmount: number | null;
  currency: string | null;
}

interface ContractPayment {
  id: number;
  mainId: string | null;
  amount: number | null;
  paymentStatus: string | null;
  plannedExpenseDate: string | null;
  paymentDate: string | null;
  comment: string | null;
}

type PaymentScheme = 'POSTPAYMENT' | 'PREPAYMENT';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function CreateDeliveryModal({ open, onClose, onCreated }: Props) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [contracts, setContracts] = useState<ContractSearchResult[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [selectedContract, setSelectedContract] = useState<ContractSearchResult | null>(null);
  const [paymentScheme, setPaymentScheme] = useState<PaymentScheme | null>(null);
  const [contractPayments, setContractPayments] = useState<ContractPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setSearch('');
    setContracts([]);
    setSelectedContract(null);
    setPaymentScheme(null);
    setContractPayments([]);
    setSelectedPaymentIds(new Set());
    setSubmitting(false);
    setError(null);
  }, []);

  useEffect(() => {
    if (open) resetState();
  }, [open, resetState]);

  useEffect(() => {
    if (!open || selectedContract) return;
    setContractsLoading(true);
    const params = new URLSearchParams();
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
    params.set('limit', '20');
    fetch(`${getBackendUrl()}/api/deliveries/search-contracts?${params}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((json: ContractSearchResult[]) => setContracts(json))
      .catch(() => setContracts([]))
      .finally(() => setContractsLoading(false));
  }, [open, debouncedSearch, selectedContract]);

  useEffect(() => {
    if (!selectedContract) {
      setContractPayments([]);
      return;
    }
    setPaymentsLoading(true);
    fetch(`${getBackendUrl()}/api/deliveries/contracts/${selectedContract.id}/payments`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((json: ContractPayment[]) => setContractPayments(json))
      .catch(() => setContractPayments([]))
      .finally(() => setPaymentsLoading(false));
  }, [selectedContract]);

  const togglePayment = useCallback((id: number) => {
    setSelectedPaymentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const canSubmit = useMemo(
    () => !!selectedContract && !!paymentScheme && !submitting,
    [selectedContract, paymentScheme, submitting]
  );

  const handleSubmit = async () => {
    if (!selectedContract || !paymentScheme) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${getBackendUrl()}/api/deliveries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId: selectedContract.id,
          paymentScheme,
          paymentIds: Array.from(selectedPaymentIds),
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      onCreated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-800">Создать поставку</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 text-gray-500"
            aria-label="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto px-4 py-3 flex flex-col gap-4">
          {/* Шаг 1: договор */}
          <section>
            <h3 className="text-xs font-semibold text-gray-700 mb-1.5">
              1. Договорной документ <span className="text-red-500">*</span>
            </h3>
            {selectedContract ? (
              <div className="flex items-start justify-between bg-blue-50 border border-blue-200 rounded p-2">
                <div className="text-xs text-gray-800 flex flex-col gap-0.5 min-w-0">
                  <span className="font-medium">
                    {selectedContract.innerId ?? '—'} · {selectedContract.documentForm ?? '—'}
                  </span>
                  <span className="text-gray-700 truncate" title={selectedContract.name ?? undefined}>
                    {selectedContract.name ?? selectedContract.title ?? '—'}
                  </span>
                  {selectedContract.supplierName && (
                    <span className="text-gray-500">Поставщик: {selectedContract.supplierName}</span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelectedContract(null);
                    setSelectedPaymentIds(new Set());
                  }}
                  className="px-2 py-1 text-xs text-blue-700 hover:bg-blue-100 rounded"
                >
                  Сменить
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Поиск по номеру, наименованию, заголовку"
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
                <div className="mt-2 max-h-64 overflow-auto border border-gray-200 rounded">
                  {contractsLoading ? (
                    <div className="text-xs text-gray-400 px-3 py-4 text-center">Загрузка...</div>
                  ) : contracts.length === 0 ? (
                    <div className="text-xs text-gray-400 px-3 py-4 text-center">
                      Нет подписанных договоров, подготовленных договорником
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {contracts.map((c) => (
                        <li key={c.id}>
                          <button
                            onClick={() => setSelectedContract(c)}
                            className="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-xs text-gray-800 flex flex-col gap-0.5"
                          >
                            <span className="font-medium">
                              {c.innerId ?? '—'} · {c.documentForm ?? '—'}
                            </span>
                            <span className="text-gray-600 truncate" title={c.name ?? undefined}>
                              {c.name ?? c.title ?? '—'}
                            </span>
                            {c.supplierName && (
                              <span className="text-gray-500">Поставщик: {c.supplierName}</span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Показаны подписанные договоры, подготовленные пользователями с признаком «договорник».
                </p>
              </>
            )}
          </section>

          {/* Шаг 2: схема оплаты */}
          <section>
            <h3 className="text-xs font-semibold text-gray-700 mb-1.5">
              2. Схема оплаты <span className="text-red-500">*</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {(['POSTPAYMENT', 'PREPAYMENT'] as PaymentScheme[]).map((scheme) => (
                <button
                  key={scheme}
                  onClick={() => setPaymentScheme(scheme)}
                  className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
                    paymentScheme === scheme
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {scheme === 'POSTPAYMENT' ? 'Постоплата' : 'Предоплата'}
                </button>
              ))}
            </div>
          </section>

          {/* Шаг 3: оплаты */}
          {selectedContract && (
            <section>
              <h3 className="text-xs font-semibold text-gray-700 mb-1.5">
                3. Привязать оплаты <span className="text-gray-400 font-normal">(опционально)</span>
              </h3>
              {paymentsLoading ? (
                <div className="text-xs text-gray-400 px-3 py-3 text-center border border-gray-200 rounded">
                  Загрузка...
                </div>
              ) : contractPayments.length === 0 ? (
                <div className="text-xs text-gray-400 px-3 py-3 text-center border border-gray-200 rounded">
                  К выбранному договору не привязано оплат
                </div>
              ) : (
                <div className="border border-gray-200 rounded max-h-56 overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-2 py-1.5 w-8" />
                        <th className="px-2 py-1.5 text-left font-medium text-gray-500">№</th>
                        <th className="px-2 py-1.5 text-right font-medium text-gray-500">Сумма</th>
                        <th className="px-2 py-1.5 text-left font-medium text-gray-500">Статус оплаты</th>
                        <th className="px-2 py-1.5 text-left font-medium text-gray-500">Дата оплаты</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contractPayments.map((p) => {
                        const checked = selectedPaymentIds.has(p.id);
                        return (
                          <tr
                            key={p.id}
                            className={`border-t border-gray-100 cursor-pointer ${checked ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                            onClick={() => togglePayment(p.id)}
                          >
                            <td className="px-2 py-1 text-center">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => togglePayment(p.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </td>
                            <td className="px-2 py-1 text-gray-800">{p.mainId ?? '—'}</td>
                            <td className="px-2 py-1 text-right text-gray-800 tabular-nums">
                              {p.amount != null
                                ? Number(p.amount).toLocaleString('ru-RU', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })
                                : '—'}
                            </td>
                            <td className="px-2 py-1 text-gray-700">{p.paymentStatus ?? '—'}</td>
                            <td className="px-2 py-1 text-gray-700">{p.paymentDate ?? '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-2 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-3 py-1 text-xs text-gray-700 border border-gray-300 rounded bg-white hover:bg-gray-100"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`px-3 py-1 text-xs font-medium text-white rounded ${
              canSubmit ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            {submitting ? 'Создание...' : 'Создать поставку'}
          </button>
        </div>
      </div>
    </div>
  );
}
