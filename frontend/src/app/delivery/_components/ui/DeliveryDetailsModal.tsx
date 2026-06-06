'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { getBackendUrl } from '@/utils/api';
import type { Delivery } from '../types/delivery.types';
import {
  getPaymentsStatus,
  SHIPMENT_STATUS_OPTIONS,
  STATUS_BADGE_CLASSES,
} from '../types/delivery.types';
import type { PaymentSchemeOption } from '../types/delivery.types';

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
  // Справочник схем оплаты и выбранная конкретная схема
  const [schemes, setSchemes] = useState<PaymentSchemeOption[]>([]);
  const [selectedSchemeId, setSelectedSchemeId] = useState<number | null>(null);
  const [contractPayments, setContractPayments] = useState<ContractPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [advancePaymentIds, setAdvancePaymentIds] = useState<Set<number>>(new Set());
  const [factPaymentIds, setFactPaymentIds] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [shipmentStatus, setShipmentStatus] = useState<string | null>(null);
  const [shipmentStatusSaving, setShipmentStatusSaving] = useState(false);
  // Запрос фактической даты поставки при переводе статуса в «Поставлено»
  const [awaitingDeliveredDate, setAwaitingDeliveredDate] = useState(false);
  const [deliveredDate, setDeliveredDate] = useState<string>('');
  const [deliveryTermDays, setDeliveryTermDays] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const contractId = delivery?.contractId ?? null;

  // Загрузка справочника схем оплаты (один раз)
  useEffect(() => {
    fetch(`${getBackendUrl()}/api/deliveries/payment-schemes`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((json: PaymentSchemeOption[]) => setSchemes(json))
      .catch(() => setSchemes([]));
  }, []);

  // Инициализация схемы оплаты при открытии карточки
  useEffect(() => {
    if (!delivery) return;
    setPaymentScheme(delivery.paymentScheme ?? null);
    setSelectedSchemeId(delivery.paymentSchemeId ?? null);
    const matched = SHIPMENT_STATUS_OPTIONS.find((o) => o.label === delivery.shipmentStatus);
    setShipmentStatus(matched?.value ?? null);
    setShipmentStatusSaving(false);
    setAwaitingDeliveredDate(false);
    setDeliveredDate(delivery.actualDeliveryDate ?? new Date().toISOString().slice(0, 10));
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

  const canSubmit = useMemo(
    () => selectedSchemeId != null && !submitting && !resetting,
    [selectedSchemeId, submitting, resetting]
  );

  const handleSubmit = async () => {
    if (!delivery || selectedSchemeId == null) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${getBackendUrl()}/api/deliveries/${delivery.id}/payments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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

  const sendShipmentStatus = async (value: string, actualDeliveryDate: string | null) => {
    if (!delivery) return;
    const prev = shipmentStatus;
    setShipmentStatus(value);
    setShipmentStatusSaving(true);
    setError(null);
    try {
      const res = await fetch(`${getBackendUrl()}/api/deliveries/${delivery.id}/shipment-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentStatus: value, actualDeliveryDate }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      setAwaitingDeliveredDate(false);
      onSaved();
    } catch (e) {
      setShipmentStatus(prev);
      setError(e instanceof Error ? e.message : 'Ошибка сохранения статуса поставки');
    } finally {
      setShipmentStatusSaving(false);
    }
  };

  const handleShipmentStatusChange = async (value: string) => {
    if (!delivery) return;
    // При переводе в «Поставлено» сначала запрашиваем фактическую дату поставки.
    if (value === 'DELIVERED') {
      setShipmentStatus('DELIVERED');
      setDeliveredDate(delivery.actualDeliveryDate ?? new Date().toISOString().slice(0, 10));
      setAwaitingDeliveredDate(true);
      return;
    }
    setAwaitingDeliveredDate(false);
    await sendShipmentStatus(value, null);
  };

  const confirmDeliveredDate = async () => {
    if (!deliveredDate) {
      setError('Укажите фактическую дату поставки');
      return;
    }
    await sendShipmentStatus('DELIVERED', deliveredDate);
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
            <div className="flex flex-col gap-2.5">
              {/* Блок 1: договор */}
              <div className="grid grid-cols-1 gap-2 min-w-0 rounded-md border border-gray-200 bg-white p-2.5 shadow-sm">
                <InfoRow label="Номер" value={delivery.contractInnerId ?? '—'} />
                <InfoRow label="Наименование" value={delivery.contractName ?? '—'} />
              </div>
              {/* Блок 2: поставщик */}
              <div className="grid grid-cols-1 gap-2 min-w-0 rounded-md border border-gray-200 bg-white p-2.5 shadow-sm">
                <InfoRow label="Поставщик" value={delivery.supplierName ?? '—'} />
                <InfoRow label="ИНН поставщика" value={delivery.supplierInn ?? '—'} />
              </div>
              {/* Блок 3: оплата */}
              <div className="grid grid-cols-1 gap-2 min-w-0 rounded-md border border-gray-200 bg-white p-2.5 shadow-sm">
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
              </div>
              {/* Блок 4: срок поставки */}
              <div className="grid grid-cols-1 gap-2 min-w-0 rounded-md border border-gray-200 bg-white p-2.5 shadow-sm">
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
              {/* Блок 5: даты согласований */}
              <div className="grid grid-cols-1 gap-2 min-w-0 rounded-md border border-gray-200 bg-white p-2.5 shadow-sm">
                <InfoRow
                  label="Дата регистрации (договор)"
                  value={
                    delivery.contractRegistrationDate
                      ? new Date(delivery.contractRegistrationDate).toLocaleDateString('ru-RU')
                      : <span className="text-gray-400">—</span>
                  }
                />
                <InfoRow
                  label="Дата синхронизации (договор)"
                  value={
                    delivery.contractSynchronizationDate
                      ? new Date(delivery.contractSynchronizationDate).toLocaleDateString('ru-RU')
                      : <span className="text-gray-400">—</span>
                  }
                />
              </div>
            </div>
          </Section>

          {/* Информация по поставке */}
          <Section title="Информация по поставке">
            <div className="flex flex-col gap-2.5">
              {/* Блок 1: основное */}
              <div className="grid grid-cols-1 gap-2 min-w-0 rounded-md border border-gray-200 bg-white p-2.5 shadow-sm">
                <InfoRow label="№ поставки" value={delivery.innerId ?? delivery.id} />
                <InfoRow label="Ответственный" value={delivery.responsibleDisplayName ?? '—'} />
              </div>

              {/* Блок 2: оплата */}
              <div className="grid grid-cols-1 gap-2.5 min-w-0 rounded-md border border-gray-200 bg-white p-2.5 shadow-sm">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] uppercase tracking-wide text-gray-400">
                    Схема оплаты <span className="text-red-500">*</span>
                  </span>
                  {/* Шаг 1: выбор типа — Аванс / По факту */}
                  <div className="flex flex-wrap gap-2">
                    {(['PREPAYMENT', 'POSTPAYMENT'] as PaymentScheme[]).map((scheme) => (
                      <button
                        key={scheme}
                        onClick={() => {
                          setPaymentScheme(scheme);
                          // Сбрасываем выбранную схему, если она другого типа
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
                  {/* Шаг 2: выбор конкретной схемы выбранного типа */}
                  {paymentScheme && (
                    <select
                      value={selectedSchemeId ?? ''}
                      onChange={(e) => setSelectedSchemeId(e.target.value ? Number(e.target.value) : null)}
                      className="mt-1 text-sm border border-gray-300 rounded px-2 py-1 text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">— выберите схему —</option>
                      {schemes
                        .filter((s) => s.paymentType === paymentScheme)
                        .map((s) => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                    </select>
                  )}
                  {!paymentScheme && (
                    <p className="text-[11px] text-gray-400">Выберите тип, затем схему — чтобы сохранить.</p>
                  )}
                  {paymentScheme && selectedSchemeId == null && (
                    <p className="text-[11px] text-gray-400">Выберите конкретную схему из списка.</p>
                  )}
                </div>
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
                <InfoRow
                  label="Оплаты (текущее)"
                  value={
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${payments.badgeClass}`}>
                      {payments.label}
                    </span>
                  }
                />
              </div>

              {/* Блок 3: поставка */}
              <div className="grid grid-cols-1 gap-2.5 min-w-0 rounded-md border border-gray-200 bg-white p-2.5 shadow-sm">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] uppercase tracking-wide text-gray-400">Статус поставки</span>
                  <select
                    value={shipmentStatus ?? ''}
                    onChange={(e) => handleShipmentStatusChange(e.target.value)}
                    disabled={shipmentStatusSaving}
                    className="text-sm border border-gray-300 rounded px-2 py-1 text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                  >
                    <option value="" disabled>—</option>
                    {SHIPMENT_STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  {awaitingDeliveredDate && (
                    <div className="mt-1 flex flex-col gap-1 rounded border border-yellow-300 bg-yellow-50 p-2">
                      <span className="text-[11px] text-gray-600">Укажите фактическую дату поставки</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={deliveredDate}
                          onChange={(e) => setDeliveredDate(e.target.value)}
                          className="text-sm border border-gray-300 rounded px-2 py-1 text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={confirmDeliveredDate}
                          disabled={shipmentStatusSaving || !deliveredDate}
                          className="px-2 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
                        >
                          Сохранить
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAwaitingDeliveredDate(false);
                            const matched = SHIPMENT_STATUS_OPTIONS.find((o) => o.label === delivery.shipmentStatus);
                            setShipmentStatus(matched?.value ?? null);
                          }}
                          disabled={shipmentStatusSaving}
                          className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-60"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] uppercase tracking-wide text-gray-400">Даты поставки</span>
                  <div className="flex flex-col gap-0.5 text-sm">
                    <span className="flex items-baseline gap-1">
                      <span className="text-[11px] uppercase tracking-wide text-gray-400 w-12 flex-shrink-0">Дедлайн</span>
                      <span className={delivery.deliveryDeadline ? 'text-gray-900' : 'text-gray-400'}>
                        {delivery.deliveryDeadline ? new Date(delivery.deliveryDeadline).toLocaleDateString('ru-RU') : '—'}
                      </span>
                    </span>
                    <span className="flex items-baseline gap-1">
                      <span className="text-[11px] uppercase tracking-wide text-gray-400 w-12 flex-shrink-0">План</span>
                      <span className={delivery.contractPlannedDeliveryStartDate ? 'text-gray-900' : 'text-gray-400'}>
                        {delivery.contractPlannedDeliveryStartDate ? new Date(delivery.contractPlannedDeliveryStartDate).toLocaleDateString('ru-RU') : '—'}
                      </span>
                    </span>
                    <span className="flex items-baseline gap-1">
                      <span className="text-[11px] uppercase tracking-wide text-gray-400 w-12 flex-shrink-0">Факт</span>
                      <span className={delivery.actualDeliveryDate ? 'text-gray-900' : 'text-gray-400'}>
                        {delivery.actualDeliveryDate ? new Date(delivery.actualDeliveryDate).toLocaleDateString('ru-RU') : '—'}
                      </span>
                    </span>
                  </div>
                </div>
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
                    Дедлайн = {paymentScheme === 'PREPAYMENT' ? 'дата оплаты аванса' : paymentScheme === 'POSTPAYMENT' ? 'дата регистрации (или синхронизации) договора' : 'базовая дата'} + срок. Сохраните, чтобы пересчитать.
                  </span>
                </div>
              </div>

              {/* Блок 4: комментарий */}
              <div className="grid grid-cols-1 gap-2 min-w-0 rounded-md border border-gray-200 bg-white p-2.5 shadow-sm">
                <InfoRow label="Комментарий" value={delivery.comment ?? '—'} />
              </div>
            </div>
          </Section>

          {/* Оплаты: распределение */}
          <Section title="Оплаты">
            {/* Распределение: Аванс (только при выборе «Аванс») */}
            {paymentScheme === 'PREPAYMENT' && (
              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-1.5">
                  Аванс <span className="text-gray-400 font-normal">(присвоить тип «Аванс»)</span>
                </h4>
                {renderPaymentsTable(advanceCandidates, advancePaymentIds, toggleAdvance, 'Нет доступных оплат для типа «Аванс»')}
              </div>
            )}

            {/* Распределение: Оплаты (По факту) */}
            <div className={paymentScheme === 'PREPAYMENT' ? 'mt-4' : ''}>
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
