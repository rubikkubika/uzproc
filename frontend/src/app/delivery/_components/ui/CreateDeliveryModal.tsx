'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { getBackendUrl } from '@/utils/api';
import { parseFirstNumber } from '../types/delivery.types';
import type { PaymentSchemeOption } from '../types/delivery.types';
import { formatAmountShort, formatAmountFull } from '../utils/amount.utils';

interface ContractSearchResult {
  id: number;
  innerId: string | null;
  name: string | null;
  title: string | null;
  documentForm: string | null;
  supplierName: string | null;
  budgetAmount: number | null;
  currency: string | null;
  paymentTerms: string | null;
  paymentScheme: string | null;
  deliveryTerm: string | null;
}

interface ContractPayment {
  id: number;
  mainId: string | null;
  amount: number | null;
  paymentStatus: string | null;
  plannedExpenseDate: string | null;
  paymentDate: string | null;
  comment: string | null;
  paymentType: string | null;
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

const ADVANCE_LABEL = 'Аванс';
const FACT_LABEL = 'По факту';

export default function CreateDeliveryModal({ open, onClose, onCreated }: Props) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [contracts, setContracts] = useState<ContractSearchResult[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [selectedContract, setSelectedContract] = useState<ContractSearchResult | null>(null);
  const [paymentScheme, setPaymentScheme] = useState<PaymentScheme | null>(null);
  // Справочник схем оплаты и выбранная конкретная схема
  const [schemes, setSchemes] = useState<PaymentSchemeOption[]>([]);
  const [selectedSchemeId, setSelectedSchemeId] = useState<number | null>(null);
  const [contractPayments, setContractPayments] = useState<ContractPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [advancePaymentIds, setAdvancePaymentIds] = useState<Set<number>>(new Set());
  const [factPaymentIds, setFactPaymentIds] = useState<Set<number>>(new Set());
  const [deliveryTermDays, setDeliveryTermDays] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setSearch('');
    setContracts([]);
    setSelectedContract(null);
    setPaymentScheme(null);
    setSelectedSchemeId(null);
    setContractPayments([]);
    setAdvancePaymentIds(new Set());
    setFactPaymentIds(new Set());
    setDeliveryTermDays('');
    setSubmitting(false);
    setError(null);
  }, []);

  useEffect(() => {
    if (open) resetState();
  }, [open, resetState]);

  // Загрузка справочника схем оплаты при открытии
  useEffect(() => {
    if (!open) return;
    fetch(`${getBackendUrl()}/api/deliveries/payment-schemes`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((json: PaymentSchemeOption[]) => setSchemes(json))
      .catch(() => setSchemes([]));
  }, [open]);

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

  // При выборе договора подставляем срок поставки (первое число из текста договора).
  useEffect(() => {
    const parsed = parseFirstNumber(selectedContract?.deliveryTerm);
    setDeliveryTermDays(parsed != null ? String(parsed) : '');
  }, [selectedContract]);

  // Авто-выбор схемы оплаты по «Схеме оплаты» (paymentScheme) и «Условиям оплаты» (paymentTerms) договора.
  // Логика (как на бэкенде autoSchemeForContract):
  //   • полная постоплата → «0/100/10 д.» (срок не важен);
  //   • иначе: аванс % = первый процент из «Схемы оплаты», доплата = 100 − аванс,
  //     срок = первое число из «Условий оплаты» → точный матч по (аванс, доплата, срок);
  //   • неоднозначность 30/70/10 vs 30/30/40/10 — по числу долей.
  //   • нет точного совпадения — не трогаем.
  // Эффект срабатывает только при смене договора/справочника; выбор можно изменить вручную.
  useEffect(() => {
    if (!selectedContract || schemes.length === 0) return;
    const s = (selectedContract.paymentScheme ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
    const termsRaw = selectedContract.paymentTerms ?? '';

    let target: PaymentSchemeOption | undefined;
    if (s.includes('постоплата') && s.includes('100') && !s.includes('аванс') && !s.includes('предоплата')) {
      target = schemes.find((x) => x.label.trim() === '0/100/10 д.');
    } else {
      const pcts = Array.from(s.matchAll(/(\d+)\s*%/g)).map((m) => Number(m[1]));
      const termMatch = termsRaw.match(/\d+/);
      if (pcts.length > 0 && termMatch) {
        const advance = pcts[0];
        const balance = 100 - advance;
        const term = Number(termMatch[0]);
        const matches = schemes.filter(
          (x) => x.advancePercent === advance && x.finalPercent === balance && x.termDays === term,
        );
        if (matches.length === 1) {
          target = matches[0];
        } else if (matches.length > 1) {
          const threeStage = pcts.length >= 3;
          target = matches.find((x) => (x.label.trim().split(' ')[0].split('/').length >= 4) === threeStage) ?? matches[0];
        }
      }
    }
    if (target) {
      setPaymentScheme(target.paymentType);
      setSelectedSchemeId(target.id);
    }
  }, [selectedContract, schemes]);

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

  const toggleAdvance = useCallback((id: number) => {
    setAdvancePaymentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setFactPaymentIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const toggleFact = useCallback((id: number) => {
    setFactPaymentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setAdvancePaymentIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  /** Кандидаты для блока «Аванс»: всё, что не помечено как «По факту» и не выбрано в блоке «Оплаты». */
  const advanceCandidates = useMemo(
    () => contractPayments.filter((p) => p.paymentType !== FACT_LABEL && !factPaymentIds.has(p.id)),
    [contractPayments, factPaymentIds]
  );

  /** Кандидаты для блока «Оплаты» (По факту): всё, что не помечено как «Аванс» и не выбрано в блоке «Аванс». */
  const factCandidates = useMemo(
    () => contractPayments.filter((p) => p.paymentType !== ADVANCE_LABEL && !advancePaymentIds.has(p.id)),
    [contractPayments, advancePaymentIds]
  );

  const canSubmit = useMemo(
    () => !!selectedContract && selectedSchemeId != null && !submitting,
    [selectedContract, selectedSchemeId, submitting]
  );

  const handleSubmit = async () => {
    if (!selectedContract || selectedSchemeId == null) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${getBackendUrl()}/api/deliveries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId: selectedContract.id,
          paymentScheme,
          paymentSchemeId: selectedSchemeId,
          advancePaymentIds: Array.from(advancePaymentIds),
          factPaymentIds: Array.from(factPaymentIds),
          deliveryTermWorkingDays: deliveryTermDays.trim() !== '' ? Number(deliveryTermDays) : null,
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

  const renderPaymentsTable = (
    items: ContractPayment[],
    selectedIds: Set<number>,
    onToggle: (id: number) => void,
    emptyText: string,
  ) => {
    if (paymentsLoading) {
      return (
        <div className="text-xs text-gray-400 px-3 py-3 text-center border border-gray-200 rounded">
          Загрузка...
        </div>
      );
    }
    if (items.length === 0) {
      return (
        <div className="text-xs text-gray-400 px-3 py-3 text-center border border-gray-200 rounded">
          {emptyText}
        </div>
      );
    }
    return (
      <div className="border border-gray-200 rounded max-h-56 overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-2 py-1.5 w-8" />
              <th className="px-2 py-1.5 text-left font-medium text-gray-500">№</th>
              <th className="px-2 py-1.5 text-right font-medium text-gray-500">Сумма</th>
              <th className="px-2 py-1.5 text-left font-medium text-gray-500">Тип</th>
              <th className="px-2 py-1.5 text-left font-medium text-gray-500">Статус оплаты</th>
              <th className="px-2 py-1.5 text-left font-medium text-gray-500">Дата оплаты</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => {
              const checked = selectedIds.has(p.id);
              return (
                <tr
                  key={p.id}
                  className={`border-t border-gray-100 cursor-pointer ${checked ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  onClick={() => onToggle(p.id)}
                >
                  <td className="px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(p.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="px-2 py-1 text-gray-800">{p.mainId ?? '—'}</td>
                  <td className="px-2 py-1 text-right text-gray-800 tabular-nums" title={formatAmountFull(p.amount)}>
                    {formatAmountShort(p.amount)}
                  </td>
                  <td className="px-2 py-1 text-gray-700">{p.paymentType ?? '—'}</td>
                  <td className="px-2 py-1 text-gray-700">{p.paymentStatus ?? '—'}</td>
                  <td className="px-2 py-1 text-gray-700">{p.paymentDate ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

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
                    setAdvancePaymentIds(new Set());
                    setFactPaymentIds(new Set());
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

          {/* Шаг 2: схема оплаты — сначала тип, затем конкретная схема */}
          <section>
            <h3 className="text-xs font-semibold text-gray-700 mb-1.5">
              2. Схема оплаты <span className="text-red-500">*</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {(['PREPAYMENT', 'POSTPAYMENT'] as PaymentScheme[]).map((scheme) => (
                <button
                  key={scheme}
                  onClick={() => {
                    setPaymentScheme(scheme);
                    const sel = schemes.find((s) => s.id === selectedSchemeId);
                    if (sel && sel.paymentType !== scheme) setSelectedSchemeId(null);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
                    paymentScheme === scheme
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {scheme === 'POSTPAYMENT' ? FACT_LABEL : ADVANCE_LABEL}
                </button>
              ))}
            </div>
            {paymentScheme && (
              <select
                value={selectedSchemeId ?? ''}
                onChange={(e) => setSelectedSchemeId(e.target.value ? Number(e.target.value) : null)}
                className="mt-2 text-sm border border-gray-300 rounded px-2 py-1 text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">— выберите схему —</option>
                {schemes
                  .filter((s) => s.paymentType === paymentScheme)
                  .map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
              </select>
            )}
          </section>

          {/* Условия оплаты из договора */}
          {selectedContract && paymentScheme && (
            <section>
              <h3 className="text-xs font-semibold text-gray-700 mb-1.5">
                Условия оплаты из договора
              </h3>
              <div className="text-xs text-gray-800 bg-gray-50 border border-gray-200 rounded p-2 whitespace-pre-wrap break-words">
                {selectedContract.paymentTerms?.trim()
                  ? selectedContract.paymentTerms
                  : <span className="text-gray-400">Условия оплаты в договоре не указаны</span>}
              </div>
            </section>
          )}

          {/* Схема оплаты из договора */}
          {selectedContract && paymentScheme && (
            <section>
              <h3 className="text-xs font-semibold text-gray-700 mb-1.5">
                Схема оплаты из договора
              </h3>
              <div className="text-xs text-gray-800 bg-gray-50 border border-gray-200 rounded p-2 whitespace-pre-wrap break-words">
                {selectedContract.paymentScheme?.trim()
                  ? selectedContract.paymentScheme
                  : <span className="text-gray-400">Схема оплаты в договоре не указана</span>}
              </div>
            </section>
          )}

          {/* Срок поставки из договора */}
          {selectedContract && paymentScheme && (
            <section>
              <h3 className="text-xs font-semibold text-gray-700 mb-1.5">
                Срок поставки из договора
              </h3>
              <div className="text-xs text-gray-800 bg-gray-50 border border-gray-200 rounded p-2 whitespace-pre-wrap break-words">
                {selectedContract.deliveryTerm?.trim()
                  ? selectedContract.deliveryTerm
                  : <span className="text-gray-400">Срок поставки в договоре не указан</span>}
              </div>
            </section>
          )}

          {/* Срок поставки в рабочих днях (по умолчанию из договора) */}
          {selectedContract && paymentScheme && (
            <section>
              <h3 className="text-xs font-semibold text-gray-700 mb-1.5">
                Срок поставки (рабочих дней)
              </h3>
              <input
                type="number"
                min={0}
                value={deliveryTermDays}
                onChange={(e) => setDeliveryTermDays(e.target.value)}
                placeholder="Напр. 30"
                className="w-40 text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Дата поставки вычисляется автоматически: дата оплаты {paymentScheme === 'PREPAYMENT' ? 'аванса' : 'последнего платежа'} + срок (рабочие дни).
              </p>
            </section>
          )}

          {/* Шаг 3a: Аванс (только при выборе «Аванс») */}
          {selectedContract && paymentScheme === 'PREPAYMENT' && (
            <section>
              <h3 className="text-xs font-semibold text-gray-700 mb-1.5">
                3. Аванс <span className="text-gray-400 font-normal">(присвоить тип «Аванс»)</span>
              </h3>
              {renderPaymentsTable(
                advanceCandidates,
                advancePaymentIds,
                toggleAdvance,
                'Нет доступных оплат для типа «Аванс»',
              )}
            </section>
          )}

          {/* Шаг 3b: Оплаты (По факту) */}
          {selectedContract && (
            <section>
              <h3 className="text-xs font-semibold text-gray-700 mb-1.5">
                {paymentScheme === 'PREPAYMENT' ? '4. Оплаты' : '3. Оплаты'}{' '}
                <span className="text-gray-400 font-normal">(присвоить тип «По факту»)</span>
              </h3>
              {renderPaymentsTable(
                factCandidates,
                factPaymentIds,
                toggleFact,
                'Нет доступных оплат для типа «По факту»',
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
