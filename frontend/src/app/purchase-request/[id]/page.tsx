'use client';

import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getBackendUrl } from '@/utils/api';
import { ArrowLeft } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

interface PurchaseRequest {
  id: number;
  idPurchaseRequest: number | null;
  guid: string;
  purchasePlanYear: number | null;
  company: string | null;
  cfo: string | null;
  mcc: string | null;
  purchaseInitiator: string | null;
  name: string | null;
  title: string | null;
  purchaseSubject: string | null;
  purchaseRequestCreationDate: string | null;
  budgetAmount: number | null;
  costType: string | null;
  contractType: string | null;
  contractDurationMonths: number | null;
  isPlanned: boolean | null;
  requiresPurchase: boolean | null;
  innerId: string | null;
  createdAt: string;
  updatedAt: string;
}

const SIDEBAR_COLLAPSED_KEY = 'sidebarCollapsed';
const ACTIVE_TAB_KEY = 'activeTab';

export default function PurchaseRequestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  
  const [purchaseRequest, setPurchaseRequest] = useState<PurchaseRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('backend-purchase-requests');
  
  // Защита от дублирующих запросов
  const abortControllerRef = useRef<AbortController | null>(null);
  const isFetchingRef = useRef<boolean>(false);
  const currentIdRef = useRef<string | null>(null);

  // Загружаем состояние сайдбара из localStorage
  useLayoutEffect(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      const shouldBeCollapsed = saved === 'true';
      if (shouldBeCollapsed) {
        setIsSidebarCollapsed(true);
        document.documentElement.classList.add('sidebar-collapsed');
        document.documentElement.style.setProperty('--sidebar-width', '5rem');
      } else {
        document.documentElement.style.setProperty('--sidebar-width', '16rem');
      }
      
      const savedTab = localStorage.getItem(ACTIVE_TAB_KEY);
      if (savedTab) {
        setActiveTab(savedTab);
      }
    } catch (err) {
      // Игнорируем ошибки
    }
    setIsMounted(true);
  }, []);

  // Сохраняем состояние сайдбара в localStorage при изменении
  const handleSidebarCollapse = (collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed);
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
      if (collapsed) {
        document.documentElement.classList.add('sidebar-collapsed');
        document.documentElement.style.setProperty('--sidebar-width', '5rem');
      } else {
        document.documentElement.classList.remove('sidebar-collapsed');
        document.documentElement.style.setProperty('--sidebar-width', '16rem');
      }
    } catch (err) {
      console.error('Error saving sidebar state:', err);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    try {
      localStorage.setItem(ACTIVE_TAB_KEY, tab);
    } catch (err) {
      console.error('Error saving active tab:', err);
    }
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    if (!id) return;

    // Проверяем, не идет ли уже запрос для этого же id
    if (isFetchingRef.current && currentIdRef.current === id) {
      // Запрос для этого id уже выполняется, не запускаем новый
      return;
    }

    // Отменяем предыдущий запрос, если он еще выполняется (для другого id)
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Атомарно устанавливаем флаги ДО начала запроса
    isFetchingRef.current = true;
    currentIdRef.current = id;

    // Создаем новый AbortController для этого запроса
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const fetchPurchaseRequest = async () => {
      // Проверяем, не был ли запрос уже отменен
      if (abortController.signal.aborted) {
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`${getBackendUrl()}/api/purchase-requests/${id}`, {
          signal: abortController.signal,
        });
        
        // Проверяем, не был ли запрос отменен
        if (abortController.signal.aborted) {
          return;
        }
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Заявка не найдена');
          }
          throw new Error('Ошибка загрузки данных');
        }
        const data = await response.json();
        
        // Проверяем еще раз перед установкой данных
        if (!abortController.signal.aborted && currentIdRef.current === id) {
          setPurchaseRequest(data);
        }
      } catch (err) {
        // Игнорируем ошибку отмены запроса
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        // Устанавливаем ошибку только если запрос не был отменен и id совпадает
        if (!abortController.signal.aborted && currentIdRef.current === id) {
          setError(err instanceof Error ? err.message : 'Произошла ошибка');
        }
      } finally {
        // Сбрасываем флаги только если это был текущий запрос
        if (abortControllerRef.current === abortController && currentIdRef.current === id) {
          isFetchingRef.current = false;
          setLoading(false);
          abortControllerRef.current = null;
          // Не сбрасываем currentIdRef здесь, чтобы избежать race condition
        }
      }
    };

    fetchPurchaseRequest();

    // Cleanup функция для отмены запроса при размонтировании или изменении id
    return () => {
      if (abortControllerRef.current === abortController) {
        abortController.abort();
        abortControllerRef.current = null;
        isFetchingRef.current = false;
        // Сбрасываем currentIdRef только если это был текущий запрос
        if (currentIdRef.current === id) {
          currentIdRef.current = null;
        }
      }
    };
  }, [id]);

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return '-';
    }
  };

  const formatCurrency = (amount: number | null): string => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatBoolean = (value: boolean | null): string => {
    if (value === true) return 'Да';
    if (value === false) return 'Нет';
    return '-';
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-100">
        <div className="w-full max-w-[1920px] mx-auto flex">
          <div suppressHydrationWarning>
            <Sidebar 
              activeTab={activeTab} 
              onTabChange={handleTabChange}
              isMobileMenuOpen={isMobileMenuOpen}
              setIsMobileMenuOpen={setIsMobileMenuOpen}
              isCollapsed={isSidebarCollapsed}
              setIsCollapsed={handleSidebarCollapse}
            />
          </div>
          
          <div className="lg:hidden fixed top-0 left-0 right-0 z-[60] bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center">
              <img 
                src="/images/logo-small.svg" 
                alt="Logo" 
                className="w-8 h-8 mr-2"
              />
              <span className="text-lg font-bold text-black">uzProc</span>
            </div>
          </div>

          <main className="flex-1 overflow-y-auto p-2 sm:p-3 lg:p-4 pt-16 sm:pt-20 lg:pt-4">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-500">Загрузка данных...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gray-100">
        <div className="w-full max-w-[1920px] mx-auto flex">
          <div suppressHydrationWarning>
            <Sidebar 
              activeTab={activeTab} 
              onTabChange={handleTabChange}
              isMobileMenuOpen={isMobileMenuOpen}
              setIsMobileMenuOpen={setIsMobileMenuOpen}
              isCollapsed={isSidebarCollapsed}
              setIsCollapsed={handleSidebarCollapse}
            />
          </div>
          
          <div className="lg:hidden fixed top-0 left-0 right-0 z-[60] bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center">
              <img 
                src="/images/logo-small.svg" 
                alt="Logo" 
                className="w-8 h-8 mr-2"
              />
              <span className="text-lg font-bold text-black">uzProc</span>
            </div>
          </div>

          <main className="flex-1 overflow-y-auto p-2 sm:p-3 lg:p-4 pt-16 sm:pt-20 lg:pt-4">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="text-center py-12">
                <p className="text-red-600 mb-4">Ошибка: {error}</p>
                <button
                  onClick={() => router.back()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Назад
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!purchaseRequest) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-full max-w-[1920px] mx-auto flex">
        <div suppressHydrationWarning>
          <Sidebar 
            activeTab={activeTab} 
            onTabChange={handleTabChange}
            isMobileMenuOpen={isMobileMenuOpen}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
            isCollapsed={isSidebarCollapsed}
            setIsCollapsed={handleSidebarCollapse}
          />
        </div>
        
        <div className="lg:hidden fixed top-0 left-0 right-0 z-[60] bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center">
            <img 
              src="/images/logo-small.svg" 
              alt="Logo" 
              className="w-8 h-8 mr-2"
            />
            <span className="text-lg font-bold text-black">uzProc</span>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-2 sm:p-3 lg:p-4 pt-16 sm:pt-20 lg:pt-4">
          <div className="space-y-3">
            {/* Кнопка назад */}
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Назад к списку</span>
            </button>

            {/* Раздел: Заявка на закупку */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-300 bg-gray-100">
                <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Заявка на закупку</h2>
              </div>
              <div className="p-3">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-0.5">
                      Номер заявки
                    </label>
                    <p className="text-xs text-gray-900">
                      {purchaseRequest.idPurchaseRequest || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-0.5">
                      Внутренний ID
                    </label>
                    <p className="text-xs text-gray-900">
                      {purchaseRequest.innerId || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-0.5">
                      Наименование
                    </label>
                    <p className="text-xs text-gray-900">
                      {purchaseRequest.name || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-0.5">
                      Заголовок
                    </label>
                    <p className="text-xs text-gray-900">
                      {purchaseRequest.title || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-0.5">
                      Дата создания заявки
                    </label>
                    <p className="text-xs text-gray-900">
                      {formatDate(purchaseRequest.purchaseRequestCreationDate)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-0.5">
                      Год плана закупок
                    </label>
                    <p className="text-xs text-gray-900">
                      {purchaseRequest.purchasePlanYear || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-0.5">
                      Компания
                    </label>
                    <p className="text-xs text-gray-900">
                      {purchaseRequest.company || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-0.5">
                      ЦФО
                    </label>
                    <p className="text-xs text-gray-900">
                      {purchaseRequest.cfo || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-0.5">
                      МЦЦ
                    </label>
                    <p className="text-xs text-gray-900">
                      {purchaseRequest.mcc || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-0.5">
                      Инициатор закупки
                    </label>
                    <p className="text-xs text-gray-900">
                      {purchaseRequest.purchaseInitiator || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-0.5">
                      Предмет закупки
                    </label>
                    <p className="text-xs text-gray-900">
                      {purchaseRequest.purchaseSubject || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-0.5">
                      Бюджет
                    </label>
                    <p className="text-xs text-gray-900">
                      {formatCurrency(purchaseRequest.budgetAmount ? Number(purchaseRequest.budgetAmount) : null)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-0.5">
                      Тип затрат
                    </label>
                    <p className="text-xs text-gray-900">
                      {purchaseRequest.costType || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-0.5">
                      Тип договора
                    </label>
                    <p className="text-xs text-gray-900">
                      {purchaseRequest.contractType || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-0.5">
                      Срок договора (месяцев)
                    </label>
                    <p className="text-xs text-gray-900">
                      {purchaseRequest.contractDurationMonths || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-0.5">
                      Плановая
                    </label>
                    <div className="text-xs">
                      {purchaseRequest.isPlanned === true ? (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          Да
                        </span>
                      ) : purchaseRequest.isPlanned === false ? (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                          Нет
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-50 text-gray-500 rounded-full">
                          -
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-0.5">
                      Требуется закупка
                    </label>
                    <div className="text-xs">
                      {purchaseRequest.requiresPurchase === true ? (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          Да
                        </span>
                      ) : purchaseRequest.requiresPurchase === false ? (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                          Нет
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-50 text-gray-500 rounded-full">
                          -
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-0.5">
                      Дата создания записи
                    </label>
                    <p className="text-xs text-gray-900">
                      {formatDate(purchaseRequest.createdAt)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-0.5">
                      Дата обновления записи
                    </label>
                    <p className="text-xs text-gray-900">
                      {formatDate(purchaseRequest.updatedAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Раздел: Закупка */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-300 bg-gray-100">
                <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Закупка</h2>
              </div>
              <div className="p-3">
                <div className="text-center py-4 text-xs text-gray-500">
                  <p>Раздел находится в разработке</p>
                </div>
              </div>
            </div>

            {/* Раздел: Договор */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-300 bg-gray-100">
                <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Договор</h2>
              </div>
              <div className="p-3">
                <div className="text-center py-4 text-xs text-gray-500">
                  <p>Раздел находится в разработке</p>
                </div>
              </div>
            </div>

            {/* Раздел: Спецификация */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-300 bg-gray-100">
                <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Спецификация</h2>
              </div>
              <div className="p-3">
                <div className="text-center py-4 text-xs text-gray-500">
                  <p>Раздел находится в разработке</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

