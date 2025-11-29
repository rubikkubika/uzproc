'use client';

import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getBackendUrl } from '@/utils/api';
import { ArrowLeft, Clock, Check, X } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

interface PurchaseRequest {
  id: number;
  idPurchaseRequest: number | null;
  guid: string;
  purchaseRequestPlanYear: number | null;
  company: string | null;
  cfo: string | null;
  mcc: string | null;
  purchaseRequestInitiator: string | null;
  name: string | null;
  title: string | null;
  purchaseRequestSubject: string | null;
  purchaseRequestCreationDate: string | null;
  budgetAmount: number | null;
  costType: string | null;
  contractType: string | null;
  contractDurationMonths: number | null;
  isPlanned: boolean | null;
  requiresPurchase: boolean | null;
  innerId: string | null;
  purchaseIds: number[] | null;
  createdAt: string;
  updatedAt: string;
}

interface Purchase {
  id: number;
  innerId: string | null;
  cfo: string | null;
  purchaseRequestId: number | null;
}

interface Approval {
  id: number;
  idPurchaseRequest: number;
  stage: string;
  role: string;
  assignmentDate: string | null;
  completionDate: string | null;
  daysInWork: number | null;
  completionResult: string | null;
}

const SIDEBAR_COLLAPSED_KEY = 'sidebarCollapsed';
const ACTIVE_TAB_KEY = 'activeTab';

export default function PurchaseRequestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  
  const [purchaseRequest, setPurchaseRequest] = useState<PurchaseRequest | null>(null);
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('purchase-requests');
  const [approvals, setApprovals] = useState<Approval[]>([]);
  
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
          
          // Загружаем связанную закупку по idPurchaseRequest (не по id!)
          if (data && data.idPurchaseRequest) {
            fetchPurchase(data.idPurchaseRequest);
          }
          
          // Загружаем согласования по idPurchaseRequest
          if (data && data.idPurchaseRequest) {
            fetchApprovals(data.idPurchaseRequest);
          }
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

  // Функция для загрузки связанной закупки
  const fetchPurchase = async (purchaseRequestId: number) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/purchases?purchaseRequestId=${purchaseRequestId}&page=0&size=1`);
      if (response.ok) {
        const data = await response.json();
        if (data.content && data.content.length > 0) {
          setPurchase(data.content[0]);
        } else {
          setPurchase(null);
        }
      }
    } catch (err) {
      console.error('Error fetching purchase:', err);
      setPurchase(null);
    }
  };

  // Функция для загрузки согласований по idPurchaseRequest
  const fetchApprovals = async (idPurchaseRequest: number) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/purchase-request-approvals/by-purchase-request/${idPurchaseRequest}`);
      if (response.ok) {
        const data = await response.json();
        setApprovals(data || []);
      } else {
        setApprovals([]);
      }
    } catch (err) {
      console.error('Error fetching approvals:', err);
      setApprovals([]);
    }
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = String(date.getFullYear()).slice(-2);
      return `${day}.${month}.${year}`;
    } catch {
      return '-';
    }
  };

  const calculateDays = (assignedDate: string | null, completedDate: string | null, daysInWork: number | null): string => {
    // Если есть daysInWork из бэкенда, используем его
    if (daysInWork !== null && daysInWork !== undefined) {
      return daysInWork.toString();
    }
    // Иначе вычисляем из дат
    if (!assignedDate || !completedDate) return '-';
    try {
      const assigned = new Date(assignedDate);
      const completed = new Date(completedDate);
      const diffTime = Math.abs(completed.getTime() - assigned.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays.toString();
    } catch {
      return '-';
    }
  };

  // Функция для определения цвета круга на основе результата выполнения
  const getApprovalStatusColor = (approval: Approval): 'green' | 'yellow' | 'red' => {
    if (!approval.completionResult) {
      // Если нет результата, проверяем даты
      if (approval.completionDate) {
        return 'green'; // Есть дата завершения - считаем выполненным
      }
      if (approval.assignmentDate) {
        return 'yellow'; // Есть дата назначения, но нет завершения - в процессе
      }
      return 'yellow'; // Нет данных - считаем в процессе
    }

    const result = approval.completionResult.toLowerCase().trim();
    
    // Зеленый: Согласовано или Утверждено
    if (result === 'согласовано' || result === 'утверждено') {
      return 'green';
    }
    
    // Желтый: В процессе
    if (result === 'в процессе' || result.includes('процесс')) {
      return 'yellow';
    }
    
    // Красный: Не согласовано или Не утверждено
    if (result === 'не согласовано' || result === 'не утверждено' || 
        result.includes('не согласован') || result.includes('не утвержден')) {
      return 'red';
    }
    
    // По умолчанию: если есть дата завершения - зеленый, иначе желтый
    return approval.completionDate ? 'green' : 'yellow';
  };

  // Фильтруем согласования по этапам
  const approvalStageApprovals = approvals.filter(a => 
    a.stage === 'Согласование Заявки на ЗП'
  );
  const managerStageApprovals = approvals.filter(a => 
    a.stage === 'Руководитель закупщика'
  );
  const finalApprovalStageApprovals = approvals.filter(a => 
    a.stage === 'Утверждение заявки на ЗП'
  );
  const finalApprovalNoZpStageApprovals = approvals.filter(a => 
    a.stage === 'Утверждение заявки на ЗП (НЕ требуется ЗП)'
  );
  
  // Проверяем, выполнено ли утверждение заявки
  const isApprovalCompleted = finalApprovalStageApprovals.length > 0 && 
    finalApprovalStageApprovals.some(a => a.completionDate !== null);

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
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="text-center py-6">
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
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="text-center py-6">
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
          <div className="space-y-2">
            {/* Верхняя панель с кнопкой назад и трекером статусов */}
            <div className="space-y-2">
              {/* Кнопка назад */}
              <button
                onClick={() => router.back()}
                className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Назад к списку</span>
              </button>

              {/* Трекер статусов */}
              <div className="bg-white rounded-lg shadow-lg p-2 border border-gray-200 hidden sm:block w-fit">
                <div className="flex items-end gap-2">
                  {/* Заявка - активна */}
                  <div className="flex flex-col items-center gap-0.5">
                    {isApprovalCompleted ? (
                      <div className="relative w-4 h-4 rounded-full bg-green-500 flex items-center justify-center" title="Заявка утверждена">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    ) : (
                      <div className="relative w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center" title="Заявка">
                        <Clock className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                    <span className="text-[10px] text-gray-600 whitespace-nowrap leading-none">Заявка</span>
                  </div>

                  {/* Закупка - показываем только если требуется закупка */}
                  {purchaseRequest.requiresPurchase !== false && (
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-3 h-3 rounded-full bg-gray-300 mt-0.5" title="Закупка"></div>
                    <span className="text-[10px] text-gray-500 whitespace-nowrap leading-none">Закупка</span>
                  </div>
                  )}

                  {/* Договор - неактивна */}
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-3 h-3 rounded-full bg-gray-300 mt-0.5" title="Договор"></div>
                    <span className="text-[10px] text-gray-500 whitespace-nowrap leading-none">Договор</span>
                  </div>

                  {/* Спецификация - неактивна */}
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-3 h-3 rounded-full bg-gray-300 mt-0.5" title="Спецификация"></div>
                    <span className="text-[10px] text-gray-500 whitespace-nowrap leading-none">Спецификация</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Контейнер для Заявки на закупку и Статуса - выравнивание по высоте */}
            <div className="flex flex-col lg:flex-row gap-2 lg:gap-4 items-stretch">
              {/* Раздел: Заявка на закупку */}
              <div className="flex-1 bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="px-2 py-1.5 border-b border-gray-300 bg-gray-100">
                <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Заявка на закупку</h2>
              </div>
              <div className="p-2">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1.5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-0">
                      Номер заявки
                    </label>
                    <p className="text-xs text-gray-900">
                      {purchaseRequest.idPurchaseRequest || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-0">
                      Внутренний ID
                    </label>
                    <p className="text-xs text-gray-900">
                      {purchaseRequest.innerId || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-0">
                      Наименование
                    </label>
                    <p className="text-xs text-gray-900">
                      {purchaseRequest.name || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-0">
                      Заголовок
                    </label>
                    <p className="text-xs text-gray-900">
                      {purchaseRequest.title || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-0">
                      Дата создания заявки
                    </label>
                    <p className="text-xs text-gray-900">
                      {formatDate(purchaseRequest.purchaseRequestCreationDate)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-0">
                      Год плана закупок
                    </label>
                    <p className="text-xs text-gray-900">
                      {purchaseRequest.purchaseRequestPlanYear || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-0">
                      Компания
                    </label>
                    <p className="text-xs text-gray-900">
                      {purchaseRequest.company || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-0">
                      ЦФО
                    </label>
                    <p className="text-xs text-gray-900">
                      {purchaseRequest.cfo || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-0">
                      МЦЦ
                    </label>
                    <p className="text-xs text-gray-900">
                      {purchaseRequest.mcc || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-0">
                      Инициатор закупки
                    </label>
                    <p className="text-xs text-gray-900">
                      {purchaseRequest.purchaseRequestInitiator || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-0">
                      Предмет закупки
                    </label>
                    <p className="text-xs text-gray-900">
                      {purchaseRequest.purchaseRequestSubject || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-0">
                      Бюджет
                    </label>
                    <p className="text-xs text-gray-900">
                      {formatCurrency(purchaseRequest.budgetAmount ? Number(purchaseRequest.budgetAmount) : null)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-0">
                      Тип затрат
                    </label>
                    <p className="text-xs text-gray-900">
                      {purchaseRequest.costType || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-0">
                      Тип договора
                    </label>
                    <p className="text-xs text-gray-900">
                      {purchaseRequest.contractType || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-0">
                      Срок договора (месяцев)
                    </label>
                    <p className="text-xs text-gray-900">
                      {purchaseRequest.contractDurationMonths || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-0">
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
                    <label className="block text-xs font-semibold text-gray-600 mb-0">
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
                    <label className="block text-xs font-semibold text-gray-600 mb-0">
                      Дата создания записи
                    </label>
                    <p className="text-xs text-gray-900">
                      {formatDate(purchaseRequest.createdAt)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-0">
                      Дата обновления записи
                    </label>
                    <p className="text-xs text-gray-900">
                      {formatDate(purchaseRequest.updatedAt)}
                    </p>
                  </div>
                </div>
              </div>
              </div>

              {/* Правая колонка с блоком Статус */}
              <div className="w-full lg:w-64 flex-shrink-0">
                {/* Блок: Статус */}
                <div className="bg-white rounded-lg shadow-lg overflow-hidden h-full flex flex-col">
                  <div className="p-1.5 flex-1">
                    {/* Раздел: Этапы */}
                    <div className="space-y-1.5">
                      {/* Этап: Согласование */}
                      {approvalStageApprovals.length > 0 && (
                      <div className="border border-gray-200 rounded p-1.5">
                        <div className="flex items-start gap-1.5 mb-1">
                          <div className="text-[10px] font-semibold text-gray-900 flex-1 leading-tight">Согласование</div>
                        </div>
                        
                        {/* Заголовки колонок */}
                        <div className="flex gap-x-1 items-end mb-1 pb-1 border-b border-gray-200">
                          <div className="flex-[2] min-w-0">
                          </div>
                          <div className="flex-shrink-0" style={{ width: '50px' }}>
                            <label className="block text-[9px] font-semibold text-gray-600 leading-tight">
                              Назначено
                            </label>
                          </div>
                          <div className="flex-shrink-0" style={{ width: '35px' }}>
                            <label className="block text-[9px] font-semibold text-gray-600 leading-tight">
                              Дней
                            </label>
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          {approvalStageApprovals.length > 0 ? (
                            approvalStageApprovals.map((approval) => (
                              <div key={approval.id} className="flex gap-x-1 items-end border-b border-gray-200 pb-1 last:border-b-0 last:pb-0">
                                <div className="flex-[2] min-w-0">
                                  <div className="flex items-center gap-1">
                                    {/* Индикатор статуса */}
                                    <div className="flex-shrink-0">
                                      {(() => {
                                        const statusColor = getApprovalStatusColor(approval);
                                        if (statusColor === 'green') {
                                          return (
                                            <div className="w-3 h-3 rounded-full bg-green-500 flex items-center justify-center" title={approval.completionResult || 'Согласовано'}>
                                              <Check className="w-2 h-2 text-white" />
                                            </div>
                                          );
                                        } else if (statusColor === 'yellow') {
                                          return (
                                            <div className="w-3 h-3 rounded-full bg-yellow-500 flex items-center justify-center" title={approval.completionResult || 'В процессе'}>
                                              <Clock className="w-2 h-2 text-white" />
                                            </div>
                                          );
                                        } else {
                                          return (
                                            <div className="w-3 h-3 rounded-full bg-red-500 flex items-center justify-center" title={approval.completionResult || 'Не согласовано'}>
                                              <X className="w-2 h-2 text-white" />
                                            </div>
                                          );
                                        }
                                      })()}
                                    </div>
                                    <p className="text-[10px] text-gray-900 truncate leading-tight">
                                      {approval.role || '-'}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex-shrink-0" style={{ width: '50px' }}>
                                  <p className="text-[10px] text-gray-900 truncate leading-tight">
                                    {formatDate(approval.assignmentDate)}
                                  </p>
                                </div>
                                <div className="flex-shrink-0" style={{ width: '35px' }}>
                                  <p className="text-[10px] text-gray-900 truncate leading-tight">
                                    {calculateDays(approval.assignmentDate, approval.completionDate, approval.daysInWork)}
                                  </p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-[10px] text-gray-500 text-center py-1">Нет данных</div>
                          )}
                        </div>
                      </div>
                      )}

                      {/* Этап: Руководитель закупок */}
                      {managerStageApprovals.length > 0 && (
                      <div className="border border-gray-200 rounded p-1.5">
                        <div className="flex items-start gap-1.5 mb-1">
                          <div className="text-[10px] font-semibold text-gray-900 flex-1 leading-tight">Руководитель закупок</div>
                          {/* Индикатор статуса */}
                          <div className="flex-shrink-0">
                            {managerStageApprovals.length > 0 && (() => {
                              const approval = managerStageApprovals[0];
                              const statusColor = getApprovalStatusColor(approval);
                              if (statusColor === 'green') {
                                return (
                                  <div className="w-3 h-3 rounded-full bg-green-500 flex items-center justify-center" title={approval.completionResult || 'Согласовано'}>
                                    <Check className="w-2 h-2 text-white" />
                                  </div>
                                );
                              } else if (statusColor === 'yellow') {
                                return (
                                  <div className="w-3 h-3 rounded-full bg-yellow-500 flex items-center justify-center" title={approval.completionResult || 'В процессе'}>
                                    <Clock className="w-2 h-2 text-white" />
                                  </div>
                                );
                              } else {
                                return (
                                  <div className="w-3 h-3 rounded-full bg-red-500 flex items-center justify-center" title={approval.completionResult || 'Не согласовано'}>
                                    <X className="w-2 h-2 text-white" />
                                  </div>
                                );
                              }
                            })()}
                          </div>
                        </div>
                        
                        {/* Заголовки колонок */}
                        <div className="flex gap-x-1 items-end mb-1 pb-1 border-b border-gray-200">
                          <div className="flex-[2] min-w-0">
                          </div>
                          <div className="flex-shrink-0" style={{ width: '50px' }}>
                            <label className="block text-[9px] font-semibold text-gray-600 leading-tight">
                              Назначено
                            </label>
                          </div>
                          <div className="flex-shrink-0" style={{ width: '35px' }}>
                            <label className="block text-[9px] font-semibold text-gray-600 leading-tight">
                              Дней
                            </label>
                          </div>
                        </div>
                        
                        {managerStageApprovals.length > 0 ? (
                          managerStageApprovals.map((approval) => (
                            <div key={approval.id} className="flex gap-x-1 items-end">
                              <div className="flex-[2] min-w-0">
                                <div className="flex items-center gap-1">
                                  {/* Индикатор статуса */}
                                  <div className="flex-shrink-0">
                                    {approval.completionDate ? (
                                      <div className="w-3 h-3 rounded-full bg-green-500 flex items-center justify-center" title="Согласовано">
                                        <Check className="w-2 h-2 text-white" />
                                      </div>
                                    ) : approval.assignmentDate ? (
                                      <div className="w-3 h-3 rounded-full bg-yellow-500 flex items-center justify-center" title="В работе">
                                        <Clock className="w-2 h-2 text-white" />
                                      </div>
                                    ) : null}
                                  </div>
                                  <p className="text-[10px] text-gray-900 truncate leading-tight">
                                    {approval.role || '-'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex-shrink-0" style={{ width: '50px' }}>
                                <p className="text-[10px] text-gray-900 truncate leading-tight">
                                  {formatDate(approval.assignmentDate)}
                                </p>
                              </div>
                              <div className="flex-shrink-0" style={{ width: '35px' }}>
                                <p className="text-[10px] text-gray-900 truncate leading-tight">
                                  {calculateDays(approval.assignmentDate, approval.completionDate, approval.daysInWork)}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-[10px] text-gray-500 text-center py-1">Нет данных</div>
                        )}
                      </div>
                      )}

                      {/* Этап: Утверждение */}
                      {finalApprovalStageApprovals.length > 0 && (
                      <div className="border border-gray-200 rounded p-1.5">
                        <div className="flex items-start gap-1.5 mb-1">
                          <div className="text-[10px] font-semibold text-gray-900 flex-1 leading-tight">Утверждение</div>
                        </div>
                        
                        {/* Заголовки колонок */}
                        <div className="flex gap-x-1 items-end mb-1 pb-1 border-b border-gray-200">
                          <div className="flex-[2] min-w-0">
                          </div>
                          <div className="flex-shrink-0" style={{ width: '50px' }}>
                            <label className="block text-[9px] font-semibold text-gray-600 leading-tight">
                              Назначено
                            </label>
                          </div>
                          <div className="flex-shrink-0" style={{ width: '35px' }}>
                            <label className="block text-[9px] font-semibold text-gray-600 leading-tight">
                              Дней
                            </label>
                          </div>
                        </div>
                        
                        {finalApprovalStageApprovals.length > 0 ? (
                          finalApprovalStageApprovals.map((approval) => (
                            <div key={approval.id} className="flex gap-x-1 items-end border-b border-gray-200 pb-1 last:border-b-0 last:pb-0">
                              <div className="flex-[2] min-w-0">
                                <div className="flex items-center gap-1">
                                  {/* Индикатор статуса */}
                                  <div className="flex-shrink-0">
                                    {approval.completionDate ? (
                                      <div className="w-3 h-3 rounded-full bg-green-500 flex items-center justify-center" title="Согласовано">
                                        <Check className="w-2 h-2 text-white" />
                                      </div>
                                    ) : approval.assignmentDate ? (
                                      <div className="w-3 h-3 rounded-full bg-yellow-500 flex items-center justify-center" title="В работе">
                                        <Clock className="w-2 h-2 text-white" />
                                      </div>
                                    ) : null}
                                  </div>
                                  <p className="text-[10px] text-gray-900 truncate leading-tight">
                                    {approval.role || '-'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex-shrink-0" style={{ width: '50px' }}>
                                <p className="text-[10px] text-gray-900 truncate leading-tight">
                                  {formatDate(approval.assignmentDate)}
                                </p>
                              </div>
                              <div className="flex-shrink-0" style={{ width: '35px' }}>
                                <p className="text-[10px] text-gray-900 truncate leading-tight">
                                  {calculateDays(approval.assignmentDate, approval.completionDate, approval.daysInWork)}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-[10px] text-gray-500 text-center py-1">Нет данных</div>
                        )}
                      </div>
                      )}

                      {/* Этап: Утверждение заявки на ЗП (НЕ требуется ЗП) */}
                      {finalApprovalNoZpStageApprovals.length > 0 && (
                      <div className="border border-gray-200 rounded p-1.5">
                        <div className="flex items-start gap-1.5 mb-1">
                          <div className="text-[10px] font-semibold text-gray-900 flex-1 leading-tight">Утверждение заявки на ЗП (НЕ требуется ЗП)</div>
                        </div>
                        
                        {/* Заголовки колонок */}
                        <div className="flex gap-x-1 items-end mb-1 pb-1 border-b border-gray-200">
                          <div className="flex-[2] min-w-0">
                          </div>
                          <div className="flex-shrink-0" style={{ width: '50px' }}>
                            <label className="block text-[9px] font-semibold text-gray-600 leading-tight">
                              Назначено
                            </label>
                          </div>
                          <div className="flex-shrink-0" style={{ width: '35px' }}>
                            <label className="block text-[9px] font-semibold text-gray-600 leading-tight">
                              Дней
                            </label>
                          </div>
                        </div>
                        
                        {finalApprovalNoZpStageApprovals.length > 0 ? (
                          finalApprovalNoZpStageApprovals.map((approval) => (
                            <div key={approval.id} className="flex gap-x-1 items-end border-b border-gray-200 pb-1 last:border-b-0 last:pb-0">
                              <div className="flex-[2] min-w-0">
                                <div className="flex items-center gap-1">
                                  {/* Индикатор статуса */}
                                  <div className="flex-shrink-0">
                                    {approval.completionDate ? (
                                      <div className="w-3 h-3 rounded-full bg-green-500 flex items-center justify-center" title="Согласовано">
                                        <Check className="w-2 h-2 text-white" />
                                      </div>
                                    ) : approval.assignmentDate ? (
                                      <div className="w-3 h-3 rounded-full bg-yellow-500 flex items-center justify-center" title="В работе">
                                        <Clock className="w-2 h-2 text-white" />
                                      </div>
                                    ) : null}
                                  </div>
                                  <p className="text-[10px] text-gray-900 truncate leading-tight">
                                    {approval.role || '-'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex-shrink-0" style={{ width: '50px' }}>
                                <p className="text-[10px] text-gray-900 truncate leading-tight">
                                  {formatDate(approval.assignmentDate)}
                                </p>
                              </div>
                              <div className="flex-shrink-0" style={{ width: '35px' }}>
                                <p className="text-[10px] text-gray-900 truncate leading-tight">
                                  {calculateDays(approval.assignmentDate, approval.completionDate, approval.daysInWork)}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-[10px] text-gray-500 text-center py-1">Нет данных</div>
                        )}
                      </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Раздел: Закупка - показываем только если требуется закупка */}
            {purchaseRequest.requiresPurchase !== false && (
            <div className="flex flex-col lg:flex-row gap-2 lg:gap-4 items-stretch">
              <div className="flex-1 bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="px-2 py-1.5 border-b border-gray-300 bg-gray-100">
                  <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Закупка</h2>
                </div>
                <div className="p-2">
                  {purchase ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1.5">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-0">
                          Внутренний ID
                        </label>
                        <p className="text-xs text-gray-900">
                          {purchase.innerId || '-'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-0">
                          ЦФО
                        </label>
                        <p className="text-xs text-gray-900">
                          {purchase.cfo || '-'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-2 text-xs text-gray-500">
                      <p>Связанная закупка не найдена</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Правая колонка с блоком Статус для Закупки */}
              <div className="w-full lg:w-64 flex-shrink-0">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden h-full flex flex-col">
                  <div className="p-1.5 flex-1">
                    <div className="space-y-1.5">
                      {/* Пустые этапы согласования пока не реализованы */}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* Раздел: Договор */}
            <div className="flex flex-col lg:flex-row gap-2 lg:gap-4 items-stretch">
              <div className="flex-1 bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="px-2 py-1.5 border-b border-gray-300 bg-gray-100">
                  <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Договор</h2>
                </div>
                <div className="p-2">
                  <div className="text-center py-2 text-xs text-gray-500">
                    <p>Раздел находится в разработке</p>
                  </div>
                </div>
              </div>

              {/* Правая колонка с блоком Статус для Договора */}
              <div className="w-full lg:w-64 flex-shrink-0">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden h-full flex flex-col">
                  <div className="p-1.5 flex-1">
                    <div className="space-y-1.5">
                      {/* Пустые этапы согласования пока не реализованы */}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Раздел: Спецификация */}
            <div className="flex flex-col lg:flex-row gap-2 lg:gap-4 items-stretch">
              <div className="flex-1 bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="px-2 py-1.5 border-b border-gray-300 bg-gray-100">
                  <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Спецификация</h2>
                </div>
                <div className="p-2">
                  <div className="text-center py-2 text-xs text-gray-500">
                    <p>Раздел находится в разработке</p>
                  </div>
                </div>
              </div>

              {/* Правая колонка с блоком Статус для Спецификации */}
              <div className="w-full lg:w-64 flex-shrink-0">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden h-full flex flex-col">
                  <div className="p-1.5 flex-1">
                    <div className="space-y-1.5">
                      {/* Пустые этапы согласования пока не реализованы */}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

