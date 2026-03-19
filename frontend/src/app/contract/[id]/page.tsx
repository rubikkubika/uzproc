'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { getBackendUrl } from '@/utils/api';
import { ArrowLeft } from 'lucide-react';
import Sidebar from '../../_components/Sidebar';

interface ContractSupplier {
  id: number;
  name: string | null;
  inn: string | null;
  code: string | null;
}

interface ContractDetail {
  id: number;
  innerId: string | null;
  guid: string;
  contractCreationDate: string | null;
  name: string | null;
  title: string | null;
  cfo: string | null;
  mcc: string | null;
  documentForm: string | null;
  budgetAmount: number | null;
  currency: string | null;
  costType: string | null;
  contractType: string | null;
  contractDurationMonths: number | null;
  status: string | null;
  state: string | null;
  paymentTerms: string | null;
  suppliers: ContractSupplier[] | null;
  preparedBy: string | null;
  purchaseRequestId: number | null;
  purchaseRequestInnerId: number | null;
  parentContractId: number | null;
  parentContract: ContractDetail | null;
  plannedDeliveryStartDate: string | null;
  plannedDeliveryEndDate: string | null;
  excludedFromStatusCalculation: boolean | null;
  exclusionComment: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ChildContract {
  id: number;
  innerId: string | null;
  name: string | null;
  title: string | null;
  status: string | null;
  budgetAmount: number | null;
  currency: string | null;
}

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
        const data = await response.json();
        setContract(data);

        // Загрузим дочерние договоры (спецификации), если это основной договор
        try {
          const childRes = await fetch(`${getBackendUrl()}/api/contracts/by-parent/${data.id}`);
          if (childRes.ok) {
            const children = await childRes.json();
            setChildContracts(children);
          }
        } catch {
          // ignore
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

  const getStatusBadge = (status: string | null) => {
    if (!status) return <span className="px-2 py-1 text-xs font-medium bg-gray-50 text-gray-500 rounded-full">-</span>;
    const colorClass =
      status === 'Подписан' ? 'bg-green-100 text-green-800' :
      status === 'На согласовании' ? 'bg-yellow-100 text-yellow-800' :
      status === 'На регистрации' ? 'bg-blue-100 text-blue-800' :
      status === 'Не согласован' ? 'bg-red-100 text-red-800' :
      status === 'Проект' ? 'bg-gray-200 text-gray-700' :
      'bg-gray-100 text-gray-800';
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${colorClass}`}>{status}</span>;
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

      <div className="flex-1 flex flex-col min-h-0 overflow-auto">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={goBack}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Назад к списку
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Загрузка...</div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">Ошибка: {error}</div>
          ) : contract ? (
            <div className="space-y-4 max-w-5xl mx-auto">
              {/* Заголовок */}
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="text-lg font-bold text-gray-900">
                      Договор {contract.innerId || `#${contract.id}`}
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">{contract.name || contract.title || '-'}</p>
                  </div>
                  <div>{getStatusBadge(contract.status)}</div>
                </div>
              </div>

              {/* Основная информация */}
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h2 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">Основная информация</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-3">
                  <InfoField label="Внутренний номер" value={contract.innerId} />
                  <InfoField label="Номер заявки" value={contract.purchaseRequestInnerId != null ? String(contract.purchaseRequestInnerId) : null} />
                  <InfoField label="ЦФО" value={contract.cfo} />
                  <InfoField label="Форма документа" value={contract.documentForm} />
                  <InfoField label="Тип затрат" value={contract.costType} />
                  <InfoField label="Тип договора" value={contract.contractType} />
                  <InfoField label="МСС" value={contract.mcc} />
                  <InfoField label="Дата создания" value={formatDate(contract.contractCreationDate)} />
                  <InfoField label="Срок действия (мес.)" value={contract.contractDurationMonths != null ? String(contract.contractDurationMonths) : null} />
                  <InfoField label="Состояние" value={contract.state} />
                  <InfoField label="Подготовил" value={contract.preparedBy} />
                </div>
              </div>

              {/* Финансовая информация */}
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h2 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">Финансовая информация</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-3">
                  <InfoField label="Сумма бюджета" value={formatAmount(contract.budgetAmount, contract.currency)} />
                  <InfoField label="Валюта" value={contract.currency} />
                </div>
              </div>

              {/* Условия оплаты */}
              {contract.paymentTerms && (
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <h2 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">Условия оплаты</h2>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{contract.paymentTerms}</p>
                </div>
              )}

              {/* Поставщики */}
              {contract.suppliers && contract.suppliers.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <h2 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">Поставщики</h2>
                  <div className="space-y-2">
                    {contract.suppliers.map((s) => (
                      <div key={s.id} className="flex items-center gap-2 text-sm text-gray-900">
                        <span>{s.name || '-'}</span>
                        {s.inn && <span className="text-gray-500">(ИНН: {s.inn})</span>}
                        {s.code && <span className="text-gray-500">[{s.code}]</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Плановые сроки поставки */}
              {(contract.plannedDeliveryStartDate || contract.plannedDeliveryEndDate) && (
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <h2 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">Плановые сроки поставки</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                    <InfoField label="Начало" value={formatDate(contract.plannedDeliveryStartDate)} />
                    <InfoField label="Окончание" value={formatDate(contract.plannedDeliveryEndDate)} />
                  </div>
                </div>
              )}

              {/* Основной договор (если это спецификация) */}
              {contract.parentContract && (
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <h2 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">Основной договор</h2>
                  <button
                    onClick={() => router.push(`/contract/${contract.parentContract!.id}`)}
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {contract.parentContract.innerId || `#${contract.parentContract.id}`} — {contract.parentContract.name || contract.parentContract.title || '-'}
                  </button>
                </div>
              )}

              {/* Спецификации (дочерние договоры) */}
              {childContracts.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <h2 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">Спецификации ({childContracts.length})</h2>
                  <div className="space-y-2">
                    {childContracts.map((child) => (
                      <div key={child.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                        <button
                          onClick={() => router.push(`/contract/${child.id}`)}
                          className="text-sm text-blue-600 hover:text-blue-800 hover:underline text-left"
                        >
                          {child.innerId || `#${child.id}`} — {child.name || child.title || '-'}
                        </button>
                        <div className="flex items-center gap-2">
                          {child.budgetAmount != null && (
                            <span className="text-xs text-gray-500">
                              {formatAmount(child.budgetAmount, child.currency)}
                            </span>
                          )}
                          {getStatusBadge(child.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Исключение из расчёта статуса */}
              {contract.excludedFromStatusCalculation && (
                <div className="bg-yellow-50 rounded-lg shadow-sm p-4 border border-yellow-200">
                  <h2 className="text-sm font-semibold text-yellow-800 mb-2">Исключён из расчёта статуса заявки</h2>
                  {contract.exclusionComment && (
                    <p className="text-sm text-yellow-700">{contract.exclusionComment}</p>
                  )}
                </div>
              )}

              {/* Системная информация */}
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h2 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">Системная информация</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-3">
                  <InfoField label="ID" value={String(contract.id)} />
                  <InfoField label="GUID" value={contract.guid} />
                  <InfoField label="Создано" value={formatDate(contract.createdAt)} />
                  <InfoField label="Обновлено" value={formatDate(contract.updatedAt)} />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">Договор не найден</div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900 mt-0.5">{value || '-'}</dd>
    </div>
  );
}
