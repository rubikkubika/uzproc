'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { getBackendUrl } from '@/utils/api';
import Sidebar from '../../_components/Sidebar';
import type { Invoice } from '../../invoice-recognition/_components/types/invoice.types';
import ContractRedesign from './_components/ContractRedesign';
import { ChildContract, ContractApprovalItem, ContractDetail, PaymentItem } from './_components/types/contract-detail.types';


const SIDEBAR_COLLAPSED_KEY = 'sidebarCollapsed';

export default function ContractDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;

  const goBack = () => {
    const from = searchParams.get('from');
    if (from) {
      try {
        router.push(decodeURIComponent(from));
      } catch {
        router.back();
      }
    } else {
      router.back();
    }
  };

  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [childContracts, setChildContracts] = useState<ChildContract[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [contractApprovals, setContractApprovals] = useState<ContractApprovalItem[]>([]);
  const [approvalsLoading, setApprovalsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('contracts');

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (saved !== null) setIsSidebarCollapsed(saved === 'true');
  }, []);

  const handleSidebarCollapse = (collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
  };

  useEffect(() => {
    if (!id) return;
    const fetchContract = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${getBackendUrl()}/api/contracts/${id}`);
        if (!response.ok) throw new Error(`Ошибка загрузки: ${response.status}`);
        const data: ContractDetail = await response.json();
        setContract(data);

        // Три зависимых запроса зависят только от data.id — грузим параллельно (было: waterfall)
        const [childRes, payRes, approvalRes] = await Promise.allSettled([
          fetch(`${getBackendUrl()}/api/contracts/by-parent/${data.id}`),
          fetch(`${getBackendUrl()}/api/payments/by-contract/${data.id}`),
          fetch(`${getBackendUrl()}/api/contract-approvals/by-contract/${data.id}`),
        ]);

        // Дочерние договоры (спецификации)
        try {
          if (childRes.status === 'fulfilled' && childRes.value.ok) {
            setChildContracts(await childRes.value.json());
          }
        } catch {
          // ignore
        }

        // Оплаты по contractId
        try {
          if (payRes.status === 'fulfilled' && payRes.value.ok) {
            setPayments(await payRes.value.json());
          }
        } catch {
          // ignore
        }

        // Согласования по contractId
        try {
          if (approvalRes.status === 'fulfilled' && approvalRes.value.ok) {
            setContractApprovals((await approvalRes.value.json()) || []);
          }
        } catch {
          // ignore
        } finally {
          setApprovalsLoading(false);
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      } finally {
        setLoading(false);
      }
    };
    fetchContract();
  }, [id]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ru-RU');
  };

  const formatAmount = (amount: number | null, currency: string | null) => {
    if (amount == null) return '-';
    const formatted = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    return currency ? `${formatted} ${currency}` : formatted;
  };

  const isWorkingDay = (d: Date): boolean => {
    const w = d.getDay();
    return w !== 0 && w !== 6;
  };

  const calculateApprovalWorkingDays = (assignmentDate: string | null, completionDate: string | null): string => {
    if (!assignmentDate || String(assignmentDate).trim() === '') return '-';
    try {
      const hasCompletion = completionDate && String(completionDate).trim() !== '';
      const start = new Date(assignmentDate);
      start.setDate(start.getDate() + 1);
      const end = hasCompletion
        ? new Date(completionDate)
        : new Date(new Date().setHours(23, 59, 59, 999));
      if (start > end) return isWorkingDay(end) ? '1' : '0';
      let count = 0;
      const d = new Date(start);
      while (d <= end) {
        if (isWorkingDay(d)) count++;
        d.setDate(d.getDate() + 1);
      }
      return count.toString();
    } catch {
      return '-';
    }
  };

  const getApprovalStatusColor = (approval: { completionResult: string | null; completionDate: string | null; assignmentDate: string | null }): 'green' | 'yellow' | 'red' | 'orange' => {
    if (!approval.completionResult) {
      return approval.assignmentDate ? 'yellow' : 'yellow';
    }
    const result = approval.completionResult.toLowerCase().trim();
    if (result.includes('замечан')) return 'orange';
    if (result === 'согласовано' || result === 'утверждено') return 'green';
    if (result === 'в процессе' || result.includes('процесс')) return 'yellow';
    if (result === 'не согласовано' || result === 'не утверждено' ||
        result.includes('не согласован') || result.includes('не утвержден') ||
        result.includes('не утверждена')) return 'red';
    return approval.completionDate ? 'green' : 'yellow';
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === 'contracts') router.push('/');
          else if (tab === 'purchase-requests') router.push('/');
        }}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        isCollapsed={isMounted ? isSidebarCollapsed : false}
        setIsCollapsed={handleSidebarCollapse}
      />

      <main className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Загрузка...</div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">Ошибка: {error}</div>
        ) : contract ? (
          <ContractRedesign
            contract={contract}
            childContracts={childContracts}
            payments={payments}
            approvals={contractApprovals}
            goBack={goBack}
            onOpenContract={(cid) => router.push(`/contract/${cid}`)}
            formatDate={formatDate}
            formatAmount={formatAmount}
            calculateApprovalWorkingDays={calculateApprovalWorkingDays}
            getApprovalStatusColor={getApprovalStatusColor}
            invoiceSlot={<InvoiceBlock contractId={contract.id} />}
          />
        ) : (
          <div className="text-center py-12 text-gray-500">Договор не найден</div>
        )}
      </main>
    </div>
  );
}

const PARSER_URL = 'http://localhost:8020';

interface SavedInvoice {
  id: number;
  contractId: number;
  data: string;
  fileUrl: string | null;
  confirmed: boolean;
  arrivalNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

function InvoiceBlock({ contractId }: { contractId: number }) {
  const [savedInvoices, setSavedInvoices] = useState<SavedInvoice[]>([]);
  const [parsedInvoice, setParsedInvoice] = useState<Invoice | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Загрузка сохранённых счёт-фактур
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${getBackendUrl()}/api/invoices/by-contract/${contractId}`);
        if (res.ok) setSavedInvoices(await res.json());
      } catch { /* ignore */ }
      finally { setLoadingList(false); }
    };
    load();
  }, [contractId]);

  // Парсинг PDF
  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Файл должен быть в формате PDF');
      return;
    }
    setLoading(true);
    setError(null);
    setParsedInvoice(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${PARSER_URL}/parse`, { method: 'POST', body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || `Ошибка: ${res.status}`);
      }
      const parsed = await res.json();
      setParsedInvoice(parsed);
      setPendingFile(file);
      setShowAddModal(true);
    } catch (e: any) {
      setError(e.message?.includes('Failed to fetch')
        ? 'Сервис распознавания недоступен (порт 8020)'
        : e.message || 'Ошибка');
    } finally {
      setLoading(false);
    }
  }, []);

  // Сохранение в БД (загрузка файла + создание записи)
  const handleSave = useCallback(async () => {
    if (!parsedInvoice) return;
    setSaving(true);
    setError(null);
    try {
      let fileUrl: string | null = null;

      // Загружаем PDF на сервер
      if (pendingFile) {
        const uploadForm = new FormData();
        uploadForm.append('file', pendingFile);
        const uploadRes = await fetch(`${getBackendUrl()}/api/invoices/upload`, {
          method: 'POST',
          body: uploadForm,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          fileUrl = uploadData.fileUrl;
        }
      }

      const res = await fetch(`${getBackendUrl()}/api/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId, data: JSON.stringify(parsedInvoice), fileUrl }),
      });
      if (!res.ok) throw new Error(`Ошибка сохранения: ${res.status}`);
      const saved: SavedInvoice = await res.json();
      setSavedInvoices(prev => [...prev, saved]);
      setParsedInvoice(null);
      setPendingFile(null);
      setShowAddModal(false);
    } catch (e: any) {
      setError(e.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  }, [parsedInvoice, pendingFile, contractId]);

  // Удаление
  const handleDelete = useCallback(async (id: number) => {
    try {
      await fetch(`${getBackendUrl()}/api/invoices/${id}`, { method: 'DELETE' });
      setSavedInvoices(prev => prev.filter(i => i.id !== id));
    } catch { /* ignore */ }
  }, []);

  // Получить Invoice из JSON строки
  const parseInvoiceData = (data: string): Invoice | null => {
    try { return JSON.parse(data); } catch { return null; }
  };

  const getStatusBadgeInvoice = (status: string | null) => {
    if (!status) return <span className="text-xs text-gray-400">—</span>;
    const isConfirmed = status === 'ПОДТВЕРЖДЁН';
    return (
      <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${
        isConfirmed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
      }`}>{isConfirmed ? 'Да' : 'Нет'}</span>
    );
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between mb-3 border-b pb-2">
          <h2 className="text-sm font-semibold text-gray-700">
            Счёт-фактуры {savedInvoices.length > 0 && <span className="text-gray-400 font-normal">({savedInvoices.length})</span>}
          </h2>
          <button
            onClick={() => { setShowAddModal(true); setParsedInvoice(null); setPendingFile(null); setError(null); }}
            className="px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
          >
            + Добавить
          </button>
        </div>

        {/* Компактная таблица */}
        {loadingList ? (
          <p className="text-xs text-gray-400">Загрузка...</p>
        ) : savedInvoices.length === 0 ? (
          <p className="text-sm text-gray-400">Нет счёт-фактур</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-2 py-1.5 text-left text-gray-500 font-medium">Номер</th>
                  <th className="px-2 py-1.5 text-left text-gray-500 font-medium">Дата</th>
                  <th className="px-2 py-1.5 text-center text-gray-500 font-medium">Проведена</th>
                  <th className="px-2 py-1.5 text-left text-gray-500 font-medium">Поступление</th>
                  <th className="px-2 py-1.5 text-right text-gray-500 font-medium">Действия</th>
                </tr>
              </thead>
              <tbody>
                {savedInvoices.map((si) => {
                  const inv = parseInvoiceData(si.data);
                  return (
                    <tr key={si.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-2 py-1.5 text-gray-900">{inv?.number || '—'}</td>
                      <td className="px-2 py-1.5 text-gray-900">{inv?.date || '—'}</td>
                      <td className="px-2 py-1.5 text-center">
                        <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${
                          si.confirmed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>{si.confirmed ? 'Да' : 'Нет'}</span>
                      </td>
                      <td className="px-2 py-1.5 text-gray-900 text-xs">{si.arrivalNumber || '—'}</td>
                      <td className="px-2 py-1.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => { if (inv) setViewInvoice(inv); }}
                            className="px-1.5 py-0.5 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                            title="Просмотр данных"
                          >
                            Данные
                          </button>
                          {si.fileUrl && (
                            <a
                              href={`${getBackendUrl()}${si.fileUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-1.5 py-0.5 text-xs text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
                              title="Открыть оригинал PDF"
                            >
                              PDF
                            </a>
                          )}
                          <button
                            onClick={() => handleDelete(si.id)}
                            className="px-1.5 py-0.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                            title="Удалить"
                          >
                            X
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Модальное окно просмотра данных счёт-фактуры */}
      {viewInvoice && (
        <InvoiceViewModal invoice={viewInvoice} onClose={() => setViewInvoice(null)} />
      )}

      {/* Модальное окно добавления счёт-фактуры */}
      {showAddModal && (
        <InvoiceAddModal
          parsedInvoice={parsedInvoice}
          loading={loading}
          saving={saving}
          error={error}
          isDragging={isDragging}
          setIsDragging={setIsDragging}
          inputRef={inputRef}
          onFile={handleFile}
          onSave={handleSave}
          onClose={() => { setShowAddModal(false); setParsedInvoice(null); setPendingFile(null); setError(null); }}
        />
      )}
    </>
  );
}

/* Модальное окно просмотра полных данных счёт-фактуры */
function InvoiceViewModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const fmt = (n: number | null) =>
    n != null ? new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) : '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-[90vw] max-w-5xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900">
              {invoice.document_type} № {invoice.number}
            </h3>
            {invoice.status && (
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                invoice.status === 'ПОДТВЕРЖДЁН' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>{invoice.status}</span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6 space-y-4">
          {/* Основная информация */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><p className="text-xs text-gray-500">Дата</p><p className="text-sm font-medium text-gray-900">{invoice.date || '—'}</p></div>
              <div><p className="text-xs text-gray-500">Договор</p><p className="text-sm font-medium text-gray-900">№ {invoice.contract_number || '—'} от {invoice.contract_date || '—'}</p></div>
              <div><p className="text-xs text-gray-500">Didox ID</p><p className="text-xs font-mono text-gray-700 break-all">{invoice.didox_id || '—'}</p></div>
              <div><p className="text-xs text-gray-500">Rouming ID</p><p className="text-xs font-mono text-gray-700 break-all">{invoice.rouming_id || '—'}</p></div>
            </div>
          </div>

          {/* Поставщик и покупатель */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {invoice.supplier && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Поставщик</h4>
                <div className="space-y-1 text-xs">
                  <p className="text-gray-900 font-medium">{invoice.supplier.name}</p>
                  {invoice.supplier.inn && <p className="text-gray-500">ИНН: {invoice.supplier.inn}</p>}
                  {invoice.supplier.address && <p className="text-gray-500">{invoice.supplier.address}</p>}
                  {invoice.supplier.bank_account && <p className="text-gray-500">Р/С: {invoice.supplier.bank_account}</p>}
                  {invoice.supplier.mfo && <p className="text-gray-500">МФО: {invoice.supplier.mfo}</p>}
                  {invoice.supplier.director && <p className="text-gray-500">Руководитель: {invoice.supplier.director}</p>}
                  {invoice.supplier.accountant && <p className="text-gray-500">Бухгалтер: {invoice.supplier.accountant}</p>}
                </div>
              </div>
            )}
            {invoice.buyer && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Покупатель</h4>
                <div className="space-y-1 text-xs">
                  <p className="text-gray-900 font-medium">{invoice.buyer.name}</p>
                  {invoice.buyer.inn && <p className="text-gray-500">ИНН: {invoice.buyer.inn}</p>}
                  {invoice.buyer.address && <p className="text-gray-500">{invoice.buyer.address}</p>}
                  {invoice.buyer.bank_account && <p className="text-gray-500">Р/С: {invoice.buyer.bank_account}</p>}
                  {invoice.buyer.mfo && <p className="text-gray-500">МФО: {invoice.buyer.mfo}</p>}
                  {invoice.buyer.director && <p className="text-gray-500">Руководитель: {invoice.buyer.director}</p>}
                  {invoice.buyer.accountant && <p className="text-gray-500">Бухгалтер: {invoice.buyer.accountant}</p>}
                </div>
              </div>
            )}
          </div>

          {/* Таблица позиций */}
          {invoice.items.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-2 py-2 text-left text-gray-500 font-medium">№</th>
                    <th className="px-2 py-2 text-left text-gray-500 font-medium">Наименование</th>
                    <th className="px-2 py-2 text-center text-gray-500 font-medium">Ед.</th>
                    <th className="px-2 py-2 text-right text-gray-500 font-medium">Кол-во</th>
                    <th className="px-2 py-2 text-right text-gray-500 font-medium">Цена</th>
                    <th className="px-2 py-2 text-right text-gray-500 font-medium">Сумма</th>
                    <th className="px-2 py-2 text-center text-gray-500 font-medium">НДС %</th>
                    <th className="px-2 py-2 text-right text-gray-500 font-medium">НДС</th>
                    <th className="px-2 py-2 text-right text-gray-500 font-medium">Итого</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item) => (
                    <tr key={item.index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-2 py-2 text-gray-900">{item.index}</td>
                      <td className="px-2 py-2 text-gray-900">{item.name || '—'}</td>
                      <td className="px-2 py-2 text-center text-gray-900">{item.unit || '—'}</td>
                      <td className="px-2 py-2 text-right text-gray-900">{item.quantity ?? '—'}</td>
                      <td className="px-2 py-2 text-right text-gray-900">{fmt(item.price)}</td>
                      <td className="px-2 py-2 text-right text-gray-900">{fmt(item.subtotal)}</td>
                      <td className="px-2 py-2 text-center text-gray-900">{item.vat_rate ?? '—'}%</td>
                      <td className="px-2 py-2 text-right text-gray-900">{fmt(item.vat_amount)}</td>
                      <td className="px-2 py-2 text-right font-medium text-gray-900">{fmt(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
                {invoice.totals && (
                  <tfoot>
                    <tr className="bg-gray-50 font-medium">
                      <td colSpan={5} className="px-2 py-2 text-right text-gray-700">Итого:</td>
                      <td className="px-2 py-2 text-right text-gray-900">{fmt(invoice.totals.subtotal)}</td>
                      <td />
                      <td className="px-2 py-2 text-right text-gray-900">{fmt(invoice.totals.vat_amount)}</td>
                      <td className="px-2 py-2 text-right text-gray-900 font-semibold">{fmt(invoice.totals.total)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* Итого текстом */}
          {invoice.totals?.total_text && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900"><span className="font-medium">Всего к оплате:</span> {invoice.totals.total_text}</p>
            </div>
          )}

          {/* Подписи */}
          {invoice.signatures && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {invoice.signatures.sent && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Отправлено</h4>
                  <dl className="space-y-1 text-xs">
                    <div className="flex gap-2"><dt className="text-gray-500 w-20">Номер:</dt><dd className="text-gray-900">{invoice.signatures.sent.number}</dd></div>
                    <div className="flex gap-2"><dt className="text-gray-500 w-20">Дата:</dt><dd className="text-gray-900">{invoice.signatures.sent.datetime}</dd></div>
                    <div className="flex gap-2"><dt className="text-gray-500 w-20">Подписант:</dt><dd className="text-gray-900">{invoice.signatures.sent.signer}</dd></div>
                  </dl>
                </div>
              )}
              {invoice.signatures.confirmed && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-green-800 mb-2">Подтверждено</h4>
                  <dl className="space-y-1 text-xs">
                    <div className="flex gap-2"><dt className="text-gray-500 w-20">Номер:</dt><dd className="text-gray-900">{invoice.signatures.confirmed.number}</dd></div>
                    <div className="flex gap-2"><dt className="text-gray-500 w-20">Дата:</dt><dd className="text-gray-900">{invoice.signatures.confirmed.datetime}</dd></div>
                    <div className="flex gap-2"><dt className="text-gray-500 w-20">Подписант:</dt><dd className="text-gray-900">{invoice.signatures.confirmed.signer}</dd></div>
                  </dl>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* Модальное окно добавления новой счёт-фактуры */
function InvoiceAddModal({
  parsedInvoice,
  loading,
  saving,
  error,
  isDragging,
  setIsDragging,
  inputRef,
  onFile,
  onSave,
  onClose,
}: {
  parsedInvoice: Invoice | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  isDragging: boolean;
  setIsDragging: (v: boolean) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (file: File) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const fmt = (n: number | null) =>
    n != null ? new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) : '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-[90vw] max-w-5xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Шапка */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h3 className="text-lg font-semibold text-gray-900">Добавление счёт-фактуры</h3>
          <div className="flex items-center gap-2">
            {parsedInvoice && (
              <button
                onClick={onSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 mb-4">{error}</div>
          )}

          {/* Зона загрузки — показываем если ещё нет распознанного документа */}
          {!parsedInvoice && !loading && (
            <div
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all ${
                isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
              }`}
            >
              <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); if (inputRef.current) inputRef.current.value = ''; }} />
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-gray-600">Перетащите PDF файл или нажмите для выбора</p>
              <p className="text-xs text-gray-400 mt-1">Поддерживаются счёт-фактуры Didox.uz</p>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <span className="ml-3 text-sm text-gray-500">Распознавание документа...</span>
            </div>
          )}

          {/* Распознанная счёт-фактура — полное отображение */}
          {parsedInvoice && (
            <div className="space-y-4">
              {/* Заголовок */}
              <div className="flex items-center gap-3">
                <h4 className="text-lg font-semibold text-gray-900">
                  {parsedInvoice.document_type} № {parsedInvoice.number}
                </h4>
                {parsedInvoice.status && (
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    parsedInvoice.status === 'ПОДТВЕРЖДЁН' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>{parsedInvoice.status}</span>
                )}
              </div>

              {/* Основная информация */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div><p className="text-xs text-gray-500">Дата</p><p className="text-sm font-medium text-gray-900">{parsedInvoice.date || '—'}</p></div>
                  <div><p className="text-xs text-gray-500">Договор</p><p className="text-sm font-medium text-gray-900">№ {parsedInvoice.contract_number || '—'} от {parsedInvoice.contract_date || '—'}</p></div>
                  <div><p className="text-xs text-gray-500">Didox ID</p><p className="text-xs font-mono text-gray-700 break-all">{parsedInvoice.didox_id || '—'}</p></div>
                  <div><p className="text-xs text-gray-500">Rouming ID</p><p className="text-xs font-mono text-gray-700 break-all">{parsedInvoice.rouming_id || '—'}</p></div>
                </div>
              </div>

              {/* Поставщик и покупатель */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {parsedInvoice.supplier && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Поставщик</h4>
                    <div className="space-y-1 text-xs">
                      <p className="text-gray-900 font-medium">{parsedInvoice.supplier.name}</p>
                      {parsedInvoice.supplier.inn && <p className="text-gray-500">ИНН: {parsedInvoice.supplier.inn}</p>}
                      {parsedInvoice.supplier.address && <p className="text-gray-500">{parsedInvoice.supplier.address}</p>}
                      {parsedInvoice.supplier.bank_account && <p className="text-gray-500">Р/С: {parsedInvoice.supplier.bank_account}</p>}
                      {parsedInvoice.supplier.mfo && <p className="text-gray-500">МФО: {parsedInvoice.supplier.mfo}</p>}
                    </div>
                  </div>
                )}
                {parsedInvoice.buyer && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Покупатель</h4>
                    <div className="space-y-1 text-xs">
                      <p className="text-gray-900 font-medium">{parsedInvoice.buyer.name}</p>
                      {parsedInvoice.buyer.inn && <p className="text-gray-500">ИНН: {parsedInvoice.buyer.inn}</p>}
                      {parsedInvoice.buyer.address && <p className="text-gray-500">{parsedInvoice.buyer.address}</p>}
                      {parsedInvoice.buyer.bank_account && <p className="text-gray-500">Р/С: {parsedInvoice.buyer.bank_account}</p>}
                      {parsedInvoice.buyer.mfo && <p className="text-gray-500">МФО: {parsedInvoice.buyer.mfo}</p>}
                    </div>
                  </div>
                )}
              </div>

              {/* Таблица позиций */}
              {parsedInvoice.items.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-2 py-2 text-left text-gray-500 font-medium">№</th>
                        <th className="px-2 py-2 text-left text-gray-500 font-medium">Наименование</th>
                        <th className="px-2 py-2 text-center text-gray-500 font-medium">Ед.</th>
                        <th className="px-2 py-2 text-right text-gray-500 font-medium">Кол-во</th>
                        <th className="px-2 py-2 text-right text-gray-500 font-medium">Цена</th>
                        <th className="px-2 py-2 text-right text-gray-500 font-medium">Сумма</th>
                        <th className="px-2 py-2 text-center text-gray-500 font-medium">НДС %</th>
                        <th className="px-2 py-2 text-right text-gray-500 font-medium">НДС</th>
                        <th className="px-2 py-2 text-right text-gray-500 font-medium">Итого</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedInvoice.items.map((item) => (
                        <tr key={item.index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-2 py-2 text-gray-900">{item.index}</td>
                          <td className="px-2 py-2 text-gray-900">{item.name || '—'}</td>
                          <td className="px-2 py-2 text-center text-gray-900">{item.unit || '—'}</td>
                          <td className="px-2 py-2 text-right text-gray-900">{item.quantity ?? '—'}</td>
                          <td className="px-2 py-2 text-right text-gray-900">{fmt(item.price)}</td>
                          <td className="px-2 py-2 text-right text-gray-900">{fmt(item.subtotal)}</td>
                          <td className="px-2 py-2 text-center text-gray-900">{item.vat_rate ?? '—'}%</td>
                          <td className="px-2 py-2 text-right text-gray-900">{fmt(item.vat_amount)}</td>
                          <td className="px-2 py-2 text-right font-medium text-gray-900">{fmt(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                    {parsedInvoice.totals && (
                      <tfoot>
                        <tr className="bg-gray-50 font-medium">
                          <td colSpan={5} className="px-2 py-2 text-right text-gray-700">Итого:</td>
                          <td className="px-2 py-2 text-right text-gray-900">{fmt(parsedInvoice.totals.subtotal)}</td>
                          <td />
                          <td className="px-2 py-2 text-right text-gray-900">{fmt(parsedInvoice.totals.vat_amount)}</td>
                          <td className="px-2 py-2 text-right text-gray-900 font-semibold">{fmt(parsedInvoice.totals.total)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}

              {/* Итого текстом */}
              {parsedInvoice.totals?.total_text && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-900"><span className="font-medium">Всего к оплате:</span> {parsedInvoice.totals.total_text}</p>
                </div>
              )}

              {/* Подписи */}
              {parsedInvoice.signatures && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {parsedInvoice.signatures.sent && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Отправлено</h4>
                      <dl className="space-y-1 text-xs">
                        <div className="flex gap-2"><dt className="text-gray-500 w-20">Подписант:</dt><dd className="text-gray-900">{parsedInvoice.signatures.sent.signer}</dd></div>
                        <div className="flex gap-2"><dt className="text-gray-500 w-20">Дата:</dt><dd className="text-gray-900">{parsedInvoice.signatures.sent.datetime}</dd></div>
                      </dl>
                    </div>
                  )}
                  {parsedInvoice.signatures.confirmed && (
                    <div className="bg-green-50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-green-800 mb-2">Подтверждено</h4>
                      <dl className="space-y-1 text-xs">
                        <div className="flex gap-2"><dt className="text-gray-500 w-20">Подписант:</dt><dd className="text-gray-900">{parsedInvoice.signatures.confirmed.signer}</dd></div>
                        <div className="flex gap-2"><dt className="text-gray-500 w-20">Дата:</dt><dd className="text-gray-900">{parsedInvoice.signatures.confirmed.datetime}</dd></div>
                      </dl>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
