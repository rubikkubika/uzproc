'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { getBackendUrl } from '@/utils/api';
import type { Delivery } from '../types/delivery.types';
import {
  getPaymentSchemeLabel,
  getPaymentsStatus,
  SHIPMENT_STATUS_OPTIONS,
  STATUS_BADGE_CLASSES,
} from '../types/delivery.types';

interface DeliveryDetailsModalProps {
  delivery: Delivery | null;
  onClose: () => void;
  onSaved: () => void;
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

const ADVANCE_LABEL = 'Аванс';
const FACT_LABEL = 'По факту';

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[11px] uppercase tracking-wide text-gray-400">{label}</span>
      <span className="block min-w-0 text-sm text-gray-900 [overflow-wrap:anywhere] break-words">{value ?? '—'}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-gray-50 border border-gray-200 rounded-lg p-3 min-w-0">
      <h3 className="text-xs font-semibold text-gray-700 mb-3 border-b border-gray-200 pb-1.5">{title}</h3>
      {children}
    </section>
  );
}

function formatAmount(amount: number | null, currency: string | null): string {
  if (amount == null) return '—';
  const formatted = Number(amount).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency ? `${formatted} ${currency}` : formatted;
}

export default function DeliveryDetailsModal({ delivery, onClose, onSaved }: DeliveryDetailsModalProps) {
  const [paymentScheme, setPaymentScheme] = useState<PaymentScheme | null>(null);
  const [contractPayments, setContractPayments] = useState<ContractPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [advancePaymentIds, setAdvancePaymentIds] = useState<Set<number>>(new Set());
  const [factPaymentIds, setFactPaymentIds] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [shipmentStatus, setShipmentStatus] = useState<string | null>(null);
  const [shipmentStatusSaving, setShipmentStatusSaving] = useState(false);
  const [deliveryTermDays, setDeliveryTermDays] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const contractId = delivery?.contractId ?? null;

  // Инициализация схемы оплаты при открытии карточки
  useEffect(() => {
    if (!delivery) return;
    setPaymentScheme(delivery.paymentScheme ?? null);
    const matched = SHIPMENT_STATUS_OPTIONS.find((o) => o.label === delivery.shipmentStatus);
    setShipmentStatus(matched?.value ?? 'EXPECTED');
    setShipmentStatusSaving(false);
    setDeliveryTermDays(delivery.deliveryTermWorkingDays != null ? String(delivery.deliveryTermWorkingDays) : '');
    setError(null);
    setSubmitting(false);
    setResetting(false);
  }, [delivery]);

  // Загрузка оплат договора и преднастройка распределения по текущим типам оплат
  useEffect(() => {
    if (!delivery || contractId == null) {
      setContractPayments([]);
      setAdvancePaymentIds(new Set());
      setFactPaymentIds(new Set());
      return;
    }
    setPaymentsLoading(true);
    fetch(`${getBackendUrl()}/api/deliveries/contracts/${contractId}/payments`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((json: ContractPayment[]) => {
        setContractPayments(json);
        setAdvancePaymentIds(new Set(json.filter((p) => p.paymentType === ADVANCE_LABEL).map((p) => p.id)));
        setFactPaymentIds(new Set(json.filter((p) => p.paymentType === FACT_LABEL).map((p) => p.id)));
      })
      .catch(() => {
        setContractPayments([]);
        setAdvancePaymentIds(new Set());
        setFactPaymentIds(new Set());
      })
      .finally(() => setPaymentsLoading(false));
  }, [delivery, contractId]);

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

  const advanceCandidates = useMemo(
    () => contractPayments.filter((p) => p.paymentType !== FACT_LABEL && !factPaymentIds.has(p.id)),
    [contractPayments, factPaymentIds]
  );

  const factCandidates = useMemo(
    () => contractPayments.filter((p) => p.paymentType !== ADVANCE_LABEL && !advancePaymentIds.has(p.id)),
    [contractPayments, advancePaymentIds]
  );

  const canSubmit = useMemo(() => !!paymentScheme && !submitting && !resetting, [paymentScheme, submitting, resetting]);

  const handleSubmit = async () => {
    if (!delivery || !paymentScheme) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${getBackendUrl()}/api/deliveries/${delivery.id}/payments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentScheme,
          advancePaymentIds: Array.from(advancePaymentIds),
          factPaymentIds: Array.from(factPaymentIds),
          deliveryTermWorkingDays: deliveryTermDays.trim() !== '' ? Number(deliveryTermDays) : null,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async () => {
    if (!delivery) return;
    setResetting(true);
    setError(null);
    try {
      const res = await fetch(`${getBackendUrl()}/api/deliveries/${delivery.id}/payments/reset`, {
        method: 'POST',
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сброса распределения');
    } finally {
      setResetting(false);
    }
  };

  const handleShipmentStatusChange = async (value: string) => {
    if (!delivery) return;
    const prev = shipmentStatus;
    setShipmentStatus(value);
    setShipmentStatusSaving(true);
    setError(null);
    try {
      const res = await fetch(`${getBackendUrl()}/api/deliveries/${delivery.id}/shipment-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentStatus: value }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      onSaved();
    } catch (e) {
      setShipmentStatus(prev);
      setError(e instanceof Error ? e.message : 'Ошибка сохранения статуса поставки');
    } finally {
      setShipmentStatusSaving(false);
    }
  };

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
      <div className="border border-gray-200 rounded max-h-56 overflow-auto bg-white">
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
                  <td className="px-2 py-1 text-right text-gray-800 tabular-nums">
                    {p.amount != null
                      ? Number(p.amount).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      : '—'}
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

  if (!delivery) return null;

  const payments = getPaymentsStatus(delivery.paymentsCount, delivery.paymentsDistributed);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-800">
            Поставка № {delivery.innerId ?? delivery.id}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
            aria-label="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
          {/* Блоки договора, поставки и оплат — слева направо */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          {/* Информация по договору */}
          <Section title="Информация по договору">
            <div className="grid grid-cols-1 gap-3 min-w-0">
              <InfoRow label="Договор №" value={delivery.contractInnerId ?? '—'} />
              <InfoRow label="Наименование договора" value={delivery.contractName ?? '—'} />
              <InfoRow label="Поставщик" value={delivery.supplierName ?? '—'} />
              <InfoRow label="ИНН поставщика" value={delivery.supplierInn ?? '—'} />
              <InfoRow label="Сумма" value={formatAmount(delivery.amount, delivery.currency)} />
              <InfoRow label="Валюта" value={delivery.currency ?? '—'} />
              <InfoRow
                label="Схема оплаты (договор)"
                value={
                  delivery.contractPaymentScheme?.trim()
                    ? delivery.contractPaymentScheme
                    : <span className="text-gray-400">Не указана</span>
                }
              />
              <div className="min-w-0">
                <InfoRow
                  label="Условия оплаты (договор)"
                  value={
                    delivery.contractPaymentTerms?.trim()
                      ? <span className="whitespace-pre-wrap">{delivery.contractPaymentTerms}</span>
                      : <span className="text-gray-400">Не указаны</span>
                  }
                />
              </div>
              <div className="min-w-0">
                <InfoRow
                  label="Срок поставки (договор)"
                  value={
                    delivery.contractDeliveryTerm?.trim()
                      ? <span className="whitespace-pre-wrap">{delivery.contractDeliveryTerm}</span>
                      : <span className="text-gray-400">Не указан</span>
                  }
                />
              </div>
            </div>
          </Section>

          {/* Информация по поставке */}
          <Section title="Информация по поставке">
            <div className="grid grid-cols-1 gap-3 min-w-0">
              <InfoRow label="№ поставки" value={delivery.innerId ?? delivery.id} />
              <InfoRow
                label="Статус оплаты"
                value={
                  delivery.status ? (
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        STATUS_BADGE_CLASSES[delivery.statusColor ?? 'gray'] ?? STATUS_BADGE_CLASSES.gray
                      }`}
                    >
                      {delivery.status}
                    </span>
                  ) : '—'
                }
              />
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] uppercase tracking-wide text-gray-400">Статус поставки</span>
                <select
                  value={shipmentStatus ?? 'EXPECTED'}
                  onChange={(e) => handleShipmentStatusChange(e.target.value)}
                  disabled={shipmentStatusSaving}
                  className="text-sm border border-gray-300 rounded px-2 py-1 text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                >
                  {SHIPMENT_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <InfoRow label="Дата поставки" value={delivery.deliveryDeadline ?? '—'} />
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] uppercase tracking-wide text-gray-400">Срок поставки (рабочих дней)</span>
                <input
                  type="number"
                  min={0}
                  value={deliveryTermDays}
                  onChange={(e) => setDeliveryTermDays(e.target.value)}
                  placeholder="Напр. 30"
                  className="text-sm border border-gray-300 rounded px-2 py-1 text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-[11px] text-gray-400">
                  Дата поставки = дата оплаты {paymentScheme === 'PREPAYMENT' ? 'аванса' : paymentScheme === 'POSTPAYMENT' ? 'последнего платежа' : 'оплаты'} + срок. Сохраните, чтобы пересчитать.
                </span>
              </div>
              <InfoRow label="Ответственный" value={delivery.responsibleDisplayName ?? '—'} />
              <InfoRow
                label="Оплаты (текущее)"
                value={
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${payments.badgeClass}`}>
                    {payments.label}
                  </span>
                }
              />
              <div className="min-w-0">
                <InfoRow label="Комментарий" value={delivery.comment ?? '—'} />
              </div>
            </div>
          </Section>

          {/* Оплаты: схема и распределение */}
          <Section title="Оплаты">
            {/* Схема оплаты — выбор */}
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-1.5">
                Схема оплаты <span className="text-red-500">*</span>
              </h4>
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
                    {scheme === 'POSTPAYMENT' ? FACT_LABEL : ADVANCE_LABEL}
                  </button>
                ))}
              </div>
              {!paymentScheme && (
                <p className="text-[11px] text-gray-400 mt-1">
                  {getPaymentSchemeLabel(null)} — выберите схему, чтобы сохранить.
                </p>
              )}
            </div>

            {/* Распределение: Аванс (только при выборе «Аванс») */}
            {paymentScheme === 'PREPAYMENT' && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold text-gray-700 mb-1.5">
                  Аванс <span className="text-gray-400 font-normal">(присвоить тип «Аванс»)</span>
                </h4>
                {renderPaymentsTable(advanceCandidates, advancePaymentIds, toggleAdvance, 'Нет доступных оплат для типа «Аванс»')}
              </div>
            )}

            {/* Распределение: Оплаты (По факту) */}
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-gray-700 mb-1.5">
                Оплаты <span className="text-gray-400 font-normal">(присвоить тип «По факту»)</span>
              </h4>
              {renderPaymentsTable(factCandidates, factPaymentIds, toggleFact, 'Нет доступных оплат для типа «По факту»')}
            </div>
          </Section>
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-4 py-2 border-t border-gray-200 bg-gray-50">
          <div>
            {(delivery.paymentScheme || delivery.paymentsDistributed) && (
              <button
                onClick={handleReset}
                disabled={resetting || submitting}
                className={`px-3 py-1 text-xs font-medium rounded border transition-colors ${
                  resetting || submitting
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-white text-red-600 border-red-300 hover:bg-red-50'
                }`}
                title="Снять схему оплаты и типы оплат — оплаты вернутся к «нераспределённым»"
              >
                {resetting ? 'Сброс...' : 'Отменить тип оплат'}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
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
            {submitting ? 'Сохранение...' : 'Сохранить'}
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}
