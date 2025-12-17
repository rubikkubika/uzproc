'use client';

import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getBackendUrl } from '@/utils/api';
import { ArrowLeft, ArrowRight, Clock, Check, X } from 'lucide-react';
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
  purchaser: string | null;
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
  contracts: Contract[] | null;
  status: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Purchase {
  id: number;
  innerId: string | null;
  cfo: string | null;
  purchaseRequestId: number | null;
}

interface Contract {
  id: number;
  innerId: string | null;
  name: string | null;
  title: string | null;
  cfo: string | null;
  contractCreationDate: string | null;
  budgetAmount: number | null;
  purchaseRequestId: number | null;
  parentContractId: number | null;
  parentContract: Contract | null;
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
  const [purchaseApprovals, setPurchaseApprovals] = useState<Approval[]>([]);
  const [contractApprovals, setContractApprovals] = useState<Approval[]>([]);
  const [specificationApprovals, setSpecificationApprovals] = useState<Approval[]>([]);
  const [specifications, setSpecifications] = useState<Contract[]>([]);
  const [isSpecificationsExpanded, setIsSpecificationsExpanded] = useState(false);
  const [navigationData, setNavigationData] = useState<{
    currentIndex: number;
    page: number;
    pageSize: number;
    filters: Record<string, string>;
    localFilters: Record<string, string>;
    cfoFilter: string[];
    statusFilter: string[];
    selectedYear: number | null;
    sortField: string | null;
    sortDirection: string | null;
    totalElements: number;
  } | null>(null);
  const [filteredRequests, setFilteredRequests] = useState<PurchaseRequest[]>([]);
  const [currentRequestIndex, setCurrentRequestIndex] = useState<number>(-1);
  
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
            // Загружаем согласования договора и спецификации
            if (data.idPurchaseRequest) {
              fetchContractApprovals(data.idPurchaseRequest);
              fetchSpecificationApprovals(data.idPurchaseRequest);
            }
          }
          
          // Загружаем спецификации для заказов (если есть основной договор)
          if (data && data.requiresPurchase === false && data.contracts && data.contracts.length > 0) {
            const contractWithParent = data.contracts.find((c: Contract) => c.parentContract);
            if (contractWithParent && contractWithParent.parentContract) {
              // Используем ID основного договора из parentContract
              const parentContractId = contractWithParent.parentContract.id;
              if (parentContractId) {
                fetchSpecifications(parentContractId);
              }
            }
          }
          
          // Обновляем индекс текущей заявки в списке для навигации
          if (filteredRequests.length > 0) {
            const currentId = parseInt(id || '0');
            const index = filteredRequests.findIndex((req: PurchaseRequest) => req.id === currentId);
            if (index !== currentRequestIndex) {
              setCurrentRequestIndex(index);
            }
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
    
    // Сбрасываем спецификации при изменении заявки
    setSpecifications([]);
    
    // Загружаем данные навигации из localStorage
    try {
      const savedNavData = localStorage.getItem('purchaseRequestNavigation');
      if (savedNavData) {
        const navData = JSON.parse(savedNavData);
        console.log('Loading navigation data:', navData);
        setNavigationData(navData);
        // Загружаем список заявок с теми же фильтрами
        fetchFilteredRequests(navData);
      } else {
        console.log('No navigation data found in localStorage');
      }
    } catch (err) {
      console.error('Error loading navigation data:', err);
    }

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

  // Обновляем индекс текущей заявки при изменении id или списка заявок
  useEffect(() => {
    if (filteredRequests.length > 0 && id) {
      const currentId = parseInt(id || '0');
      const index = filteredRequests.findIndex((req: PurchaseRequest) => req.id === currentId);
      if (index !== currentRequestIndex) {
        setCurrentRequestIndex(index >= 0 ? index : -1);
      }
    }
  }, [id, filteredRequests, currentRequestIndex]);

  // Обработка клавиш-стрелок для навигации
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Проверяем, что не в поле ввода
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Стрелка влево - предыдущая заявка
      if (e.key === 'ArrowLeft') {
        if (navigationData && filteredRequests.length > 0 && currentRequestIndex > 0) {
          e.preventDefault();
          const prevRequest = filteredRequests[currentRequestIndex - 1];
          if (prevRequest) {
            console.log('Navigating to previous request:', prevRequest.id);
            router.push(`/purchase-request/${prevRequest.id}`);
          }
        }
      }
      
      // Стрелка вправо - следующая заявка
      if (e.key === 'ArrowRight') {
        if (navigationData && filteredRequests.length > 0 && currentRequestIndex >= 0 && currentRequestIndex < filteredRequests.length - 1) {
          e.preventDefault();
          const nextRequest = filteredRequests[currentRequestIndex + 1];
          if (nextRequest) {
            console.log('Navigating to next request:', nextRequest.id);
            router.push(`/purchase-request/${nextRequest.id}`);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigationData, filteredRequests, currentRequestIndex, router]);

  // Функция для загрузки связанной закупки
  const fetchPurchase = async (purchaseRequestId: number) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/purchases?purchaseRequestId=${purchaseRequestId}&page=0&size=1`);
      if (response.ok) {
        const data = await response.json();
        if (data.content && data.content.length > 0) {
          setPurchase(data.content[0]);
          // Загружаем согласования для закупки
          fetchPurchaseApprovals(purchaseRequestId);
        } else {
          setPurchase(null);
          setPurchaseApprovals([]);
        }
      }
    } catch (err) {
      console.error('Error fetching purchase:', err);
      setPurchase(null);
      setPurchaseApprovals([]);
    }
  };

  // Функция для загрузки согласований закупки по purchaseRequestId
  const fetchPurchaseApprovals = async (purchaseRequestId: number) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/purchase-approvals/by-purchase-request/${purchaseRequestId}`);
      if (response.ok) {
        const data = await response.json();
        setPurchaseApprovals(data || []);
      } else {
        setPurchaseApprovals([]);
      }
    } catch (err) {
      console.error('Error fetching purchase approvals:', err);
      setPurchaseApprovals([]);
    }
  };

  // Функция для загрузки согласований договора по purchaseRequestId
  const fetchContractApprovals = async (purchaseRequestId: number) => {
    // TODO: Реализовать на бэкенде
    setContractApprovals([]);
  };

  // Функция для загрузки согласований спецификации по purchaseRequestId
  const fetchSpecificationApprovals = async (purchaseRequestId: number) => {
    // TODO: Реализовать на бэкенде
    setSpecificationApprovals([]);
  };

  // Функция для загрузки спецификаций по parentContractId
  const fetchSpecifications = async (parentContractId: number) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/contracts/by-parent/${parentContractId}`);
      if (response.ok) {
        const data = await response.json();
        setSpecifications(data);
      } else {
        setSpecifications([]);
      }
    } catch (err) {
      console.error('Error fetching specifications:', err);
      setSpecifications([]);
    }
  };

  // Функция для загрузки списка заявок с фильтрами для навигации
  const fetchFilteredRequests = async (navData: typeof navigationData) => {
    if (!navData) return;
    
    try {
      const params = new URLSearchParams();
      params.append('page', '0');
      params.append('size', '10000'); // Загружаем много заявок для навигации
      
      if (navData.selectedYear !== null && navData.selectedYear !== undefined) {
        params.append('year', String(navData.selectedYear));
      }
      
      if (navData.sortField && navData.sortDirection) {
        params.append('sortBy', navData.sortField);
        params.append('sortDir', navData.sortDirection);
      }
      
      // Добавляем текстовые фильтры
      Object.entries(navData.filters).forEach(([key, value]) => {
        if (value && value.trim() !== '') {
          params.append(key, value);
        }
      });
      
      // Добавляем множественные фильтры
      if (navData.cfoFilter && navData.cfoFilter.length > 0) {
        navData.cfoFilter.forEach(cfo => {
          params.append('cfo', cfo);
        });
      }
      
      if (navData.statusFilter && navData.statusFilter.length > 0) {
        navData.statusFilter.forEach(status => {
          params.append('status', status);
        });
      }
      
      const response = await fetch(`${getBackendUrl()}/api/purchase-requests?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        const requests = data.content || [];
        setFilteredRequests(requests);
        
        // Находим текущую заявку в списке
        const currentId = parseInt(id || '0');
        const index = requests.findIndex((req: PurchaseRequest) => req.id === currentId);
        setCurrentRequestIndex(index >= 0 ? index : -1);
        
        console.log('Filtered requests loaded:', {
          total: requests.length,
          currentId,
          currentIndex: index
        });
      }
    } catch (err) {
      console.error('Error fetching filtered requests:', err);
      setFilteredRequests([]);
    }
  };

  // Функция для перехода к следующей заявке
  const goToNext = () => {
    if (currentRequestIndex >= 0 && currentRequestIndex < filteredRequests.length - 1) {
      const nextRequest = filteredRequests[currentRequestIndex + 1];
      if (nextRequest) {
        router.push(`/purchase-request/${nextRequest.id}`);
      }
    }
  };

  // Функция для перехода к предыдущей заявке
  const goToPrevious = () => {
    if (currentRequestIndex > 0) {
      const prevRequest = filteredRequests[currentRequestIndex - 1];
      if (prevRequest) {
        router.push(`/purchase-request/${prevRequest.id}`);
      }
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
  const getApprovalStatusColor = (approval: Approval): 'green' | 'yellow' | 'red' | 'orange' => {
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
    
    // Оранжевый: Согласовано с замечаниями
    if (result.includes('замечан') || result.includes('замечание')) {
      return 'orange';
    }
    
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
        result.includes('не согласован') || result.includes('не утвержден') ||
        result.includes('не утверждена')) {
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
  const isApprovalCompleted = (finalApprovalStageApprovals.length > 0 && 
    finalApprovalStageApprovals.some(a => a.completionDate !== null)) ||
    (finalApprovalNoZpStageApprovals.length > 0 && 
    finalApprovalNoZpStageApprovals.some(a => a.completionDate !== null)) ||
    (purchaseRequest?.status === 'Утверждена');

  // Фильтруем согласования закупки по этапам
  const purchaseResultsApprovalApprovals = purchaseApprovals.filter(a => 
    a.stage === 'Согласование результатов ЗП'
  );
  const purchaseCommissionApprovals = purchaseApprovals.filter(a => 
    a.stage === 'Закупочная комиссия'
  );
  const purchaseCommissionResultCheckApprovals = purchaseApprovals.filter(a => 
    a.stage === 'Проверка результата закупочной комиссии'
  );

  // Фильтруем согласования договора по этапам
  const contractApprovalStageApprovals = contractApprovals.filter(a => 
    a.stage === 'Согласование договора'
  );
  const contractManagerStageApprovals = contractApprovals.filter(a => 
    a.stage === 'Руководитель закупщика (договор)'
  );
  const contractFinalApprovalStageApprovals = contractApprovals.filter(a => 
    a.stage === 'Утверждение договора'
  );

  // Фильтруем согласования спецификации по этапам
  const specificationApprovalStageApprovals = specificationApprovals.filter(a => 
    a.stage === 'Согласование спецификации'
  );
  const specificationManagerStageApprovals = specificationApprovals.filter(a => 
    a.stage === 'Руководитель закупщика (спецификация)'
  );
  const specificationFinalApprovalStageApprovals = specificationApprovals.filter(a => 
    a.stage === 'Утверждение спецификации'
  );

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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.back()}
                  className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Назад к списку</span>
                </button>
                
                {/* Кнопки навигации */}
                {navigationData ? (
                  filteredRequests.length > 0 && currentRequestIndex >= 0 ? (
                    <div className="flex items-center gap-1 border-l border-gray-300 pl-2">
                      <button
                        onClick={goToPrevious}
                        disabled={currentRequestIndex <= 0}
                        className="flex items-center justify-center w-7 h-7 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Предыдущая заявка (←)"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs text-gray-500 px-1 min-w-[60px] text-center">
                        {currentRequestIndex + 1} / {filteredRequests.length}
                      </span>
                      <button
                        onClick={goToNext}
                        disabled={currentRequestIndex >= filteredRequests.length - 1}
                        className="flex items-center justify-center w-7 h-7 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Следующая заявка (→)"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 border-l border-gray-300 pl-2 text-xs text-gray-400">
                      Загрузка...
                    </div>
                  )
                ) : null}
              </div>

              {/* Трекер статусов и даты */}
              <div className="flex items-end gap-3 flex-wrap">
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

                    {/* Если закупка требуется: Заявка → Закупка → Договор */}
                    {purchaseRequest.requiresPurchase !== false ? (
                      <>
                        {/* Закупка - неактивна */}
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-3 h-3 rounded-full bg-gray-300 mt-0.5" title="Закупка"></div>
                    <span className="text-[10px] text-gray-500 whitespace-nowrap leading-none">Закупка</span>
                  </div>
                  {/* Договор - неактивна */}
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-3 h-3 rounded-full bg-gray-300 mt-0.5" title="Договор"></div>
                    <span className="text-[10px] text-gray-500 whitespace-nowrap leading-none">Договор</span>
                  </div>
                      </>
                    ) : (
                      /* Если закупка не требуется: Заявка → Заказ */
                  <div className="flex flex-col items-center gap-0.5">
                        <div className="w-3 h-3 rounded-full bg-gray-300 mt-0.5" title="Заказ"></div>
                        <span className="text-[10px] text-gray-500 whitespace-nowrap leading-none">Заказ</span>
                  </div>
                    )}
                  </div>
                </div>
                
                {/* Даты создания и обновления записи */}
                <div className="flex items-center gap-0 hidden sm:block">
                  <div>
                    <span className="text-[8px] text-gray-400 leading-tight">Создание </span>
                    <span className="text-[9px] text-gray-500 leading-tight">
                      {formatDate(purchaseRequest.createdAt)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] text-gray-400 leading-tight">Обновление </span>
                    <span className="text-[9px] text-gray-500 leading-tight">
                      {formatDate(purchaseRequest.updatedAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

              {/* Раздел: Заявка на закупку */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="px-2 py-1.5 border-b border-gray-300 bg-gray-100">
                <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Заявка на закупку</h2>
              </div>
              <div className="p-2">
                <div className="flex flex-col lg:flex-row gap-4 items-start">
                  {/* Левая часть с полями заявки */}
                  <div className="flex-1">
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
                      Закупщик
                    </label>
                    <p className="text-xs text-gray-900">
                      {purchaseRequest.purchaser || '-'}
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
              </div>
              </div>

                  {/* Правая часть с блоком согласований */}
              <div className="w-full lg:w-64 flex-shrink-0">
                    <div className="bg-white rounded p-2 space-y-1.5">
                      {/* Этап: Согласование */}
                      {approvalStageApprovals.length > 0 && (
                      <div className="bg-white rounded-lg shadow-md p-2">
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
                                        } else if (statusColor === 'orange') {
                                          return (
                                            <div className="w-3 h-3 rounded-full bg-orange-500 flex items-center justify-center" title={approval.completionResult || 'Согласовано с замечаниями'}>
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
                      <div className="bg-white rounded-lg shadow-md p-2">
                        <div className="flex items-start gap-1.5 mb-1">
                          <div className="text-[10px] font-semibold text-gray-900 flex-1 leading-tight">Руководитель закупок</div>
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
                      )}

                      {/* Этап: Утверждение */}
                      {finalApprovalStageApprovals.length > 0 && (
                      <div className="bg-white rounded-lg shadow-md p-2">
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
                      )}

                      {/* Этап: Утверждение заявки на ЗП (НЕ требуется ЗП) */}
                      {finalApprovalNoZpStageApprovals.length > 0 && (
                      <div className="bg-white rounded-lg shadow-md p-2">
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
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Раздел: Закупка - показываем только если требуется закупка */}
            {purchaseRequest.requiresPurchase !== false && (
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="px-2 py-1.5 border-b border-gray-300 bg-gray-100">
                  <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Закупка</h2>
                </div>
                <div className="p-2">
                <div className="flex flex-col lg:flex-row gap-4 items-start">
                  {/* Левая часть с полями закупки */}
                  <div className="flex-1">
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

                    {/* Правая часть с блоком согласований */}
              <div className="w-full lg:w-64 flex-shrink-0">
                    <div className="bg-white rounded p-2 space-y-1.5">
                      {/* Этап: Согласование результатов ЗП */}
                      {purchaseResultsApprovalApprovals.length > 0 && (
                      <div className="bg-white rounded-lg shadow-md p-2">
                        <div className="flex items-start gap-1.5 mb-1">
                          <div className="text-[10px] font-semibold text-gray-900 flex-1 leading-tight">Согласование результатов ЗП</div>
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
                          {purchaseResultsApprovalApprovals.length > 0 ? (
                            purchaseResultsApprovalApprovals.map((approval) => (
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
                                        } else if (statusColor === 'orange') {
                                          return (
                                            <div className="w-3 h-3 rounded-full bg-orange-500 flex items-center justify-center" title={approval.completionResult || 'Согласовано с замечаниями'}>
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

                      {/* Этап: Закупочная комиссия */}
                      {purchaseCommissionApprovals.length > 0 && (
                      <div className="bg-white rounded-lg shadow-md p-2">
                        <div className="flex items-start gap-1.5 mb-1">
                          <div className="text-[10px] font-semibold text-gray-900 flex-1 leading-tight">Закупочная комиссия</div>
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
                          {purchaseCommissionApprovals.length > 0 ? (
                            purchaseCommissionApprovals.map((approval) => (
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
                                        } else if (statusColor === 'orange') {
                                          return (
                                            <div className="w-3 h-3 rounded-full bg-orange-500 flex items-center justify-center" title={approval.completionResult || 'Согласовано с замечаниями'}>
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

                      {/* Этап: Проверка результата закупочной комиссии */}
                      {purchaseCommissionResultCheckApprovals.length > 0 && (
                      <div className="bg-white rounded-lg shadow-md p-2">
                        <div className="flex items-start gap-1.5 mb-1">
                          <div className="text-[10px] font-semibold text-gray-900 flex-1 leading-tight">Проверка результата закупочной комиссии</div>
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
                          {purchaseCommissionResultCheckApprovals.length > 0 ? (
                            purchaseCommissionResultCheckApprovals.map((approval) => (
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
                                        } else if (statusColor === 'orange') {
                                          return (
                                            <div className="w-3 h-3 rounded-full bg-orange-500 flex items-center justify-center" title={approval.completionResult || 'Согласовано с замечаниями'}>
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
                        
                        {/* Сообщение "Нет согласований" для закупок */}
                        {purchaseResultsApprovalApprovals.length === 0 && 
                         purchaseCommissionApprovals.length === 0 && 
                         purchaseCommissionResultCheckApprovals.length === 0 && (
                          <div className="border border-gray-200 rounded p-1.5 text-center py-2 text-[10px] text-gray-500">
                            Нет согласований
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* Раздел: Спецификация - показываем перед Договором, если закупка не требуется */}
            {purchaseRequest.requiresPurchase === false && (() => {
              // Проверяем, есть ли данные для отображения
              const hasContracts = purchaseRequest.contracts && purchaseRequest.contracts.length > 0 && 
                purchaseRequest.contracts.some(contract => 
                  contract.innerId || contract.name || contract.title || contract.cfo || 
                  contract.contractCreationDate || contract.budgetAmount
                );
              const hasApprovals = specificationApprovals.length > 0;
              
              // Показываем блок только если есть данные
              return (hasContracts || hasApprovals) ? (
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="px-2 py-1.5 border-b border-gray-300 bg-gray-100">
                <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Спецификация</h2>
                </div>
                <div className="p-2">
                <div className="flex flex-col lg:flex-row gap-4 items-start">
                  {/* Левая часть с полями спецификации (договоры) */}
                  <div className="flex-1">
                  {purchaseRequest.contracts && purchaseRequest.contracts.length > 0 ? (
                    <div className="space-y-3">
                      {purchaseRequest.contracts.map((contract) => (
                        <div key={contract.id} className="border border-gray-200 rounded p-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-0">
                                Внутренний ID
                              </label>
                              <p className="text-xs text-gray-900">
                                {contract.innerId || '-'}
                              </p>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-0">
                                Наименование
                              </label>
                              <p className="text-xs text-gray-900">
                                {contract.name || '-'}
                              </p>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-0">
                                Заголовок
                              </label>
                              <p className="text-xs text-gray-900">
                                {contract.title || '-'}
                              </p>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-0">
                                ЦФО
                              </label>
                              <p className="text-xs text-gray-900">
                                {contract.cfo || '-'}
                              </p>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-0">
                                Дата создания
                              </label>
                              <p className="text-xs text-gray-900">
                                {contract.contractCreationDate ? new Date(contract.contractCreationDate).toLocaleDateString('ru-RU') : '-'}
                              </p>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-0">
                                Сумма договора
                              </label>
                              <p className="text-xs text-gray-900">
                                {contract.budgetAmount ? new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'UZS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(contract.budgetAmount) : '-'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                  <div className="text-center py-2 text-xs text-gray-500">
                      <p>Нет данных о договоре</p>
                  </div>
                  )}
                </div>

                  {/* Правая часть с блоком согласований */}
              <div className="w-full lg:w-64 flex-shrink-0">
                    <div className="bg-white rounded p-2 space-y-1.5">
                      {/* Этап: Согласование спецификации */}
                      {specificationApprovalStageApprovals.length > 0 && (
                      <div className="bg-white rounded-lg shadow-md p-2">
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
                          {specificationApprovalStageApprovals.length > 0 ? (
                            specificationApprovalStageApprovals.map((approval) => (
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
                                        } else if (statusColor === 'orange') {
                                          return (
                                            <div className="w-3 h-3 rounded-full bg-orange-500 flex items-center justify-center" title={approval.completionResult || 'Согласовано с замечаниями'}>
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

                      {/* Этап: Руководитель закупщика (спецификация) */}
                      {specificationManagerStageApprovals.length > 0 && (
                      <div className="bg-white rounded-lg shadow-md p-2">
                        <div className="flex items-start gap-1.5 mb-1">
                          <div className="text-[10px] font-semibold text-gray-900 flex-1 leading-tight">Руководитель закупок</div>
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
                        
                        {specificationManagerStageApprovals.length > 0 ? (
                          specificationManagerStageApprovals.map((approval) => (
                            <div key={approval.id} className="flex gap-x-1 items-end">
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
                      )}

                      {/* Этап: Утверждение спецификации */}
                      {specificationFinalApprovalStageApprovals.length > 0 && (
                      <div className="bg-white rounded-lg shadow-md p-2">
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
                        
                        <div className="space-y-1">
                          {specificationFinalApprovalStageApprovals.length > 0 ? (
                            specificationFinalApprovalStageApprovals.map((approval) => (
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
                                        } else if (statusColor === 'orange') {
                                          return (
                                            <div className="w-3 h-3 rounded-full bg-orange-500 flex items-center justify-center" title={approval.completionResult || 'Согласовано с замечаниями'}>
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

                      {/* Если нет согласований */}
                      {specificationApprovals.length === 0 && (
                        <div className="bg-white rounded-lg shadow-md p-2 text-center py-2 text-[10px] text-gray-500">
                          Нет согласований
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            ) : null;
            })()}

            {/* Раздел: Договор */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="px-2 py-1.5 border-b border-gray-300 bg-gray-100">
                <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Договор</h2>
              </div>
              <div className="p-2">
                <div className="flex flex-col lg:flex-row gap-4 items-start">
                  {/* Левая часть с полями договора */}
                  <div className="flex-1">
                    {/* Для заказов показываем основной договор, если договор является спецификацией */}
                    {purchaseRequest.requiresPurchase === false && purchaseRequest.contracts && purchaseRequest.contracts.length > 0 && purchaseRequest.contracts.some(c => c.parentContract) ? (
                      <div className="w-full">
                        {/* Содержимое: основной договор и спецификации */}
                      <div className="flex flex-col lg:flex-row gap-4 items-start w-full">
                        {/* Основной договор слева */}
                          <div className="flex-shrink-0 w-full lg:w-auto">
                            <div className="mb-2">
                              <label className="block text-xs font-semibold text-gray-600">
                                Основной договор
                              </label>
                            </div>
                          {purchaseRequest.contracts
                            .filter(contract => contract.parentContract)
                            .map((contract) => (
                              <div key={contract.id} className="bg-white rounded-lg shadow-md p-2">
                                  <div className="space-y-2">
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-0">
                                      Внутренний ID
                                    </label>
                                    <p className="text-xs text-gray-900">
                                      {contract.parentContract!.innerId || '-'}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-0">
                                      Наименование
                                    </label>
                                    <p className="text-xs text-gray-900">
                                      {contract.parentContract!.name || '-'}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-0">
                                      Заголовок
                                    </label>
                                    <p className="text-xs text-gray-900">
                                      {contract.parentContract!.title || '-'}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-0">
                                      ЦФО
                                    </label>
                                    <p className="text-xs text-gray-900">
                                      {contract.parentContract!.cfo || '-'}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-0">
                                      Дата создания
                                    </label>
                                    <p className="text-xs text-gray-900">
                                      {contract.parentContract!.contractCreationDate ? new Date(contract.parentContract!.contractCreationDate).toLocaleDateString('ru-RU') : '-'}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-0">
                                      Сумма договора
                                    </label>
                                    <p className="text-xs text-gray-900">
                                      {contract.parentContract!.budgetAmount ? new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'UZS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(contract.parentContract!.budgetAmount) : '-'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                        
                        {/* Спецификации справа в виде таблицы */}
                        <div className="flex-1 w-full lg:w-auto">
                          {(() => {
                            // Фильтруем пустые спецификации (у которых все поля пустые)
                            const nonEmptySpecs = specifications.filter((spec) => {
                              return spec.innerId || spec.name || spec.title || spec.cfo || spec.contractCreationDate || spec.budgetAmount;
                            });
                            
                            // Сортируем по внутреннему номеру по убыванию
                            const sortedSpecs = [...nonEmptySpecs].sort((a, b) => {
                              const aId = a.innerId || '';
                              const bId = b.innerId || '';
                              return bId.localeCompare(aId);
                            });
                            
                            // Показываем блок только если есть непустые спецификации
                            return sortedSpecs.length > 0 ? (
                              <div className="w-full">
                                <div className="mb-2 flex items-center justify-between">
                                  <label className="block text-xs font-semibold text-gray-600">
                                    Спецификации
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-600">
                                      Спецификаций: {sortedSpecs.length}
                                    </span>
                                    {sortedSpecs.length > 5 && (
                                      <button
                                        onClick={() => setIsSpecificationsExpanded(!isSpecificationsExpanded)}
                                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                                      >
                                        {isSpecificationsExpanded ? 'Свернуть' : 'Развернуть'}
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <div className="bg-white rounded-lg shadow-md p-3">
                                <div className="overflow-x-auto w-full">
                                  <table className="w-full text-[10px] border-collapse" style={{ tableLayout: 'fixed', width: '100%' }}>
                                    <thead>
                                      <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="text-left py-1 px-2 font-semibold text-gray-600 border-r border-gray-200" style={{ width: '15%' }}>Внутренний ID</th>
                                        <th className="text-left py-1 px-2 font-semibold text-gray-600 border-r border-gray-200" style={{ width: '20%' }}>Наименование</th>
                                        <th className="text-left py-1 px-2 font-semibold text-gray-600 border-r border-gray-200" style={{ width: '20%' }}>Заголовок</th>
                                        <th className="text-left py-1 px-2 font-semibold text-gray-600 border-r border-gray-200" style={{ width: '10%' }}>ЦФО</th>
                                        <th className="text-left py-1 px-2 font-semibold text-gray-600 border-r border-gray-200" style={{ width: '15%' }}>Дата создания</th>
                                        <th className="text-right py-1 px-2 font-semibold text-gray-600" style={{ width: '20%' }}>Сумма</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(isSpecificationsExpanded ? sortedSpecs : sortedSpecs.slice(0, 5)).map((spec) => (
                                        <tr key={spec.id} className="border-b border-gray-100 hover:bg-gray-50">
                                          <td className="py-1 px-2 text-gray-900 border-r border-gray-100">{spec.innerId || '-'}</td>
                                          <td className="py-1 px-2 text-gray-900 border-r border-gray-100">{spec.name || '-'}</td>
                                          <td className="py-1 px-2 text-gray-900 border-r border-gray-100">{spec.title || '-'}</td>
                                          <td className="py-1 px-2 text-gray-900 border-r border-gray-100">{spec.cfo || '-'}</td>
                                          <td className="py-1 px-2 text-gray-900 border-r border-gray-100">
                                            {spec.contractCreationDate ? new Date(spec.contractCreationDate).toLocaleDateString('ru-RU') : '-'}
                                          </td>
                                          <td className="py-1 px-2 text-gray-900 text-right">
                                            {spec.budgetAmount ? new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'UZS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(spec.budgetAmount) : '-'}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                                </div>
                              </div>
                            ) : null;
                          })()}
                          </div>
                        </div>
                      </div>
                    ) : (purchaseRequest.requiresPurchase === true || purchaseRequest.requiresPurchase === null) && purchaseRequest.contracts && purchaseRequest.contracts.length > 0 ? (
                      // Для закупок показываем договоры (если договор является спецификацией, показываем основной договор)
                      <div className="space-y-3">
                        {purchaseRequest.contracts.map((contract) => (
                          <div key={contract.id} className="border border-gray-200 rounded p-2">
                            {contract.parentContract ? (
                              // Если договор является спецификацией, показываем основной договор
                              <>
                                <div className="mb-2">
                                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                                    Основной договор
                                  </label>
                                </div>
                                <div className="bg-white rounded-lg shadow-md p-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-0">
                                      Внутренний ID
                                    </label>
                                    <p className="text-xs text-gray-900">
                                      {contract.parentContract.innerId || '-'}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-0">
                                      Наименование
                                    </label>
                                    <p className="text-xs text-gray-900">
                                      {contract.parentContract.name || '-'}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-0">
                                      Заголовок
                                    </label>
                                    <p className="text-xs text-gray-900">
                                      {contract.parentContract.title || '-'}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-0">
                                      ЦФО
                                    </label>
                                    <p className="text-xs text-gray-900">
                                      {contract.parentContract.cfo || '-'}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-0">
                                      Дата создания
                                    </label>
                                    <p className="text-xs text-gray-900">
                                      {contract.parentContract.contractCreationDate ? new Date(contract.parentContract.contractCreationDate).toLocaleDateString('ru-RU') : '-'}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-0">
                                      Сумма договора
                                    </label>
                                    <p className="text-xs text-gray-900">
                                      {contract.parentContract.budgetAmount ? new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'UZS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(contract.parentContract.budgetAmount) : '-'}
                                    </p>
                                  </div>
                                </div>
                                </div>
                              </>
                            ) : (
                              // Если договор не является спецификацией, показываем сам договор
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                                <div>
                                  <label className="block text-xs font-semibold text-gray-600 mb-0">
                                    Внутренний ID
                                  </label>
                                  <p className="text-xs text-gray-900">
                                    {contract.innerId || '-'}
                                  </p>
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-600 mb-0">
                                    Наименование
                                  </label>
                                  <p className="text-xs text-gray-900">
                                    {contract.name || '-'}
                                  </p>
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-600 mb-0">
                                    Заголовок
                                  </label>
                                  <p className="text-xs text-gray-900">
                                    {contract.title || '-'}
                                  </p>
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-600 mb-0">
                                    ЦФО
                                  </label>
                                  <p className="text-xs text-gray-900">
                                    {contract.cfo || '-'}
                                  </p>
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-600 mb-0">
                                    Дата создания
                                  </label>
                                  <p className="text-xs text-gray-900">
                                    {contract.contractCreationDate ? new Date(contract.contractCreationDate).toLocaleDateString('ru-RU') : '-'}
                                  </p>
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-600 mb-0">
                                    Сумма договора
                                  </label>
                                  <p className="text-xs text-gray-900">
                                    {contract.budgetAmount ? new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'UZS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(contract.budgetAmount) : '-'}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (purchaseRequest.requiresPurchase === true || purchaseRequest.requiresPurchase === null) ? (
                      // Для закупок показываем сообщение, если нет договоров
                      <div className="text-center py-2 text-xs text-gray-500">
                        <p>Нет данных о договоре</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-0">
                            Наименование
                          </label>
                          <p className="text-xs text-gray-900">
                            -
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-0">
                            Контрагент
                          </label>
                          <p className="text-xs text-gray-900">
                            -
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-0">
                            Сумма договора
                          </label>
                          <p className="text-xs text-gray-900">
                            -
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Правая часть - согласования */}
                  {(purchaseRequest.requiresPurchase === true || purchaseRequest.requiresPurchase === null) && (
                    /* Блок согласований, если закупка требуется - справа фиксированной ширины */
                    <div className="w-full lg:w-64 flex-shrink-0">
                    <div className="bg-white rounded p-2 space-y-1.5">
                      {/* Этап: Согласование договора */}
                      {contractApprovalStageApprovals.length > 0 && (
                      <div className="bg-white rounded-lg shadow-md p-2">
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
                          {contractApprovalStageApprovals.length > 0 ? (
                            contractApprovalStageApprovals.map((approval) => (
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
                                        } else if (statusColor === 'orange') {
                                          return (
                                            <div className="w-3 h-3 rounded-full bg-orange-500 flex items-center justify-center" title={approval.completionResult || 'Согласовано с замечаниями'}>
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

                      {/* Этап: Руководитель закупщика (договор) */}
                      {contractManagerStageApprovals.length > 0 && (
                      <div className="bg-white rounded-lg shadow-md p-2">
                        <div className="flex items-start gap-1.5 mb-1">
                          <div className="text-[10px] font-semibold text-gray-900 flex-1 leading-tight">Руководитель закупок</div>
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
                        
                        {contractManagerStageApprovals.length > 0 ? (
                          contractManagerStageApprovals.map((approval) => (
                            <div key={approval.id} className="flex gap-x-1 items-end">
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
                      )}

                      {/* Этап: Утверждение договора */}
                      {contractFinalApprovalStageApprovals.length > 0 && (
                      <div className="bg-white rounded-lg shadow-md p-2">
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
                        
                        <div className="space-y-1">
                          {contractFinalApprovalStageApprovals.length > 0 ? (
                            contractFinalApprovalStageApprovals.map((approval) => (
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
                                        } else if (statusColor === 'orange') {
                                          return (
                                            <div className="w-3 h-3 rounded-full bg-orange-500 flex items-center justify-center" title={approval.completionResult || 'Согласовано с замечаниями'}>
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

                      {/* Если нет согласований */}
                      {contractApprovals.length === 0 && (
                        <div className="bg-white rounded-lg shadow-md p-2 text-center py-2 text-[10px] text-gray-500">
                          Нет согласований
                        </div>
                      )}
                    </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Раздел: Спецификация - показываем после Договора, если закупка требуется */}
            {purchaseRequest.requiresPurchase !== false && (
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="px-2 py-1.5 border-b border-gray-300 bg-gray-100">
                  <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Спецификация</h2>
                </div>
                <div className="p-2">
                <div className="flex flex-col lg:flex-row gap-4 items-start">
                  {/* Левая часть с полями спецификации */}
                  <div className="flex-1">
                  <div className="text-center py-2 text-xs text-gray-500">
                    <p>Раздел находится в разработке</p>
                </div>
              </div>

                  {/* Правая часть с блоком согласований */}
              <div className="w-full lg:w-64 flex-shrink-0">
                    <div className="bg-white rounded p-2 space-y-1.5">
                      {/* Этап: Согласование спецификации */}
                      {specificationApprovalStageApprovals.length > 0 && (
                      <div className="bg-white rounded-lg shadow-md p-2">
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
                          {specificationApprovalStageApprovals.length > 0 ? (
                            specificationApprovalStageApprovals.map((approval) => (
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
                                        } else if (statusColor === 'orange') {
                                          return (
                                            <div className="w-3 h-3 rounded-full bg-orange-500 flex items-center justify-center" title={approval.completionResult || 'Согласовано с замечаниями'}>
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

                      {/* Этап: Руководитель закупщика (спецификация) */}
                      {specificationManagerStageApprovals.length > 0 && (
                      <div className="bg-white rounded-lg shadow-md p-2">
                        <div className="flex items-start gap-1.5 mb-1">
                          <div className="text-[10px] font-semibold text-gray-900 flex-1 leading-tight">Руководитель закупок</div>
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
                        
                        {specificationManagerStageApprovals.length > 0 ? (
                          specificationManagerStageApprovals.map((approval) => (
                            <div key={approval.id} className="flex gap-x-1 items-end">
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
                      )}

                      {/* Этап: Утверждение спецификации */}
                      {specificationFinalApprovalStageApprovals.length > 0 && (
                      <div className="bg-white rounded-lg shadow-md p-2">
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
                        
                        <div className="space-y-1">
                          {specificationFinalApprovalStageApprovals.length > 0 ? (
                            specificationFinalApprovalStageApprovals.map((approval) => (
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
                                        } else if (statusColor === 'orange') {
                                          return (
                                            <div className="w-3 h-3 rounded-full bg-orange-500 flex items-center justify-center" title={approval.completionResult || 'Согласовано с замечаниями'}>
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

                      {/* Если нет согласований */}
                      {specificationApprovals.length === 0 && (
                        <div className="bg-white rounded-lg shadow-md p-2 text-center py-2 text-[10px] text-gray-500">
                          Нет согласований
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

