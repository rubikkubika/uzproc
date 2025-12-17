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
  purchaseNumber: number | null;
  purchaseCreationDate: string | null;
  innerId: string | null;
  name: string | null;
  title: string | null;
  cfo: string | null;
  mcc: string | null;
  purchaseInitiator: string | null;
  purchaseSubject: string | null;
  budgetAmount: number | null;
  costType: string | null;
  contractType: string | null;
  contractDurationMonths: number | null;
  purchaseRequestId: number | null;
  status: string | null;
  state: string | null;
  createdAt: string;
  updatedAt: string;
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

export default function PurchaseDetailPage() {
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
  const [activeTab, setActiveTab] = useState('purchases');
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [purchaseApprovals, setPurchaseApprovals] = useState<Approval[]>([]);
  const [contractApprovals, setContractApprovals] = useState<Approval[]>([]);
  const [specificationApprovals, setSpecificationApprovals] = useState<Approval[]>([]);
  const [specifications, setSpecifications] = useState<Contract[]>([]);
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
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([]);
  const [currentPurchaseIndex, setCurrentPurchaseIndex] = useState<number>(-1);
  
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

    const fetchPurchase = async () => {
      // Проверяем, не был ли запрос уже отменен
      if (abortController.signal.aborted) {
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`${getBackendUrl()}/api/purchases/${id}`, {
          signal: abortController.signal,
        });
        
        // Проверяем, не был ли запрос отменен
        if (abortController.signal.aborted) {
          return;
        }
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Закупка не найдена');
          }
          throw new Error('Ошибка загрузки данных');
        }
        const data = await response.json();
        
        // Проверяем еще раз перед установкой данных
        if (!abortController.signal.aborted && currentIdRef.current === id) {
          setPurchase(data);
          
          // Загружаем все необходимые данные параллельно и ждем их завершения
          const loadPromises: Promise<void>[] = [];
          
          // Загружаем договоры по purchaseRequestId закупки
          if (data && data.purchaseRequestId) {
            loadPromises.push(
              fetchContracts(data.purchaseRequestId).catch(() => {})
            );
            // Загружаем согласования закупки по purchaseRequestId
            loadPromises.push(
              fetchPurchaseApprovals(data.purchaseRequestId).catch(() => {})
            );
            // Загружаем согласования договора по purchaseRequestId
            loadPromises.push(
              fetchContractApprovals(data.purchaseRequestId).catch(() => {})
            );
            // Загружаем связанную заявку на закупку по purchaseRequestId (критично для отображения)
            loadPromises.push(
              fetchPurchaseRequest(data.purchaseRequestId).catch(() => {})
            );
          }
          
          // Ждем загрузки всех критичных данных перед установкой loading = false
          Promise.all(loadPromises).then(() => {
            // Проверяем, что запрос не был отменен
            if (!abortController.signal.aborted && currentIdRef.current === id) {
              // Устанавливаем loading = false только после загрузки всех критичных данных
              setLoading(false);
              
              // Загружаем спецификации для заказов (если есть основной договор)
              // Это делаем после загрузки договоров
              setTimeout(() => {
                if (contracts.length > 0) {
                  const contractWithParent = contracts.find((c: Contract) => c.parentContract);
                  if (contractWithParent && contractWithParent.parentContract) {
                    // Используем ID основного договора из parentContract
                    const parentContractId = contractWithParent.parentContract.id;
                    if (parentContractId) {
                      fetchSpecifications(parentContractId);
                    }
                  }
                }
              }, 100);
              
              // Обновляем индекс текущей закупки в списке для навигации
              if (filteredPurchases.length > 0) {
                const currentId = parseInt(id || '0');
                const index = filteredPurchases.findIndex((p: Purchase) => p.id === currentId);
                if (index !== currentPurchaseIndex) {
                  setCurrentPurchaseIndex(index);
                }
              }
            }
          }).catch(() => {
            // В случае ошибки тоже устанавливаем loading = false
            if (!abortController.signal.aborted && currentIdRef.current === id) {
              setLoading(false);
            }
          });
          
          // Если нет дополнительных данных для загрузки, устанавливаем loading = false сразу
          if (!data || !data.purchaseRequestId) {
            setLoading(false);
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
          setLoading(false);
        }
      } finally {
        // Сбрасываем только флаги запроса
        // loading = false устанавливается после загрузки всех критичных данных или в catch
        if (abortControllerRef.current === abortController && currentIdRef.current === id) {
          isFetchingRef.current = false;
          abortControllerRef.current = null;
          // Не сбрасываем currentIdRef здесь, чтобы избежать race condition
        }
      }
    };

    fetchPurchase();
    
    // Сбрасываем спецификации при изменении закупки
    setSpecifications([]);
    
    // Загружаем данные навигации из localStorage
    try {
      const savedNavData = localStorage.getItem('purchaseNavigation');
      if (savedNavData) {
        const navData = JSON.parse(savedNavData);
        console.log('Loading navigation data:', navData);
        setNavigationData(navData);
        // Загружаем список закупок с теми же фильтрами
        fetchFilteredPurchases(navData);
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

  // Обновляем индекс текущей закупки при изменении id или списка закупок
  useEffect(() => {
    if (filteredPurchases.length > 0 && id) {
      const currentId = parseInt(id || '0');
      const index = filteredPurchases.findIndex((p: Purchase) => p.id === currentId);
      if (index !== currentPurchaseIndex) {
        setCurrentPurchaseIndex(index >= 0 ? index : -1);
      }
    }
  }, [id, filteredPurchases, currentPurchaseIndex]);

  // Обработка клавиш-стрелок для навигации
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Проверяем, что не в поле ввода
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Стрелка влево - предыдущая закупка
      if (e.key === 'ArrowLeft') {
        if (navigationData && filteredPurchases.length > 0 && currentPurchaseIndex > 0) {
          e.preventDefault();
          const prevPurchase = filteredPurchases[currentPurchaseIndex - 1];
          if (prevPurchase) {
            console.log('Navigating to previous purchase:', prevPurchase.id);
            router.push(`/purchase/${prevPurchase.id}`);
          }
        }
      }
      
      // Стрелка вправо - следующая закупка
      if (e.key === 'ArrowRight') {
        if (navigationData && filteredPurchases.length > 0 && currentPurchaseIndex >= 0 && currentPurchaseIndex < filteredPurchases.length - 1) {
          e.preventDefault();
          const nextPurchase = filteredPurchases[currentPurchaseIndex + 1];
          if (nextPurchase) {
            console.log('Navigating to next purchase:', nextPurchase.id);
            router.push(`/purchase/${nextPurchase.id}`);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigationData, filteredPurchases, currentPurchaseIndex, router]);

  // Функция для загрузки договоров по purchaseRequestId
  const [contracts, setContracts] = useState<Contract[]>([]);
  
  const fetchContracts = async (purchaseRequestId: number): Promise<void> => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/contracts/by-purchase-request/${purchaseRequestId}`);
      if (response.ok) {
        const data = await response.json();
        setContracts(data || []);
      } else {
        setContracts([]);
      }
    } catch (err) {
      console.error('Error fetching contracts:', err);
      setContracts([]);
    }
  };

  // Функция для загрузки связанной заявки на закупку
  const fetchPurchaseRequest = async (purchaseRequestId: number): Promise<void> => {
    try {
      // Загружаем заявку напрямую по idPurchaseRequest через специальный API
      const response = await fetch(`${getBackendUrl()}/api/purchase-requests/by-id-purchase-request/${purchaseRequestId}`);
      if (response.ok) {
        const request = await response.json();
        if (request) {
          setPurchaseRequest(request);
          // Загружаем согласования заявки по idPurchaseRequest
          if (request.idPurchaseRequest) {
            await fetchApprovals(request.idPurchaseRequest);
          }
        } else {
          setPurchaseRequest(null);
          setApprovals([]);
        }
      } else {
        setPurchaseRequest(null);
        setApprovals([]);
      }
    } catch (err) {
      console.error('Error fetching purchase request:', err);
      setPurchaseRequest(null);
      setApprovals([]);
    }
  };

  // Функция для загрузки согласований закупки по purchaseRequestId
  const fetchPurchaseApprovals = async (purchaseRequestId: number): Promise<void> => {
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
  const fetchContractApprovals = async (purchaseRequestId: number): Promise<void> => {
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

  // Функция для загрузки списка закупок с фильтрами для навигации
  const fetchFilteredPurchases = async (navData: typeof navigationData) => {
    if (!navData) return;
    
    try {
      const params = new URLSearchParams();
      params.append('page', '0');
      params.append('size', '10000'); // Загружаем много закупок для навигации
      
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
      
      const response = await fetch(`${getBackendUrl()}/api/purchases?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        const purchases = data.content || [];
        setFilteredPurchases(purchases);
        
        // Находим текущую закупку в списке
        const currentId = parseInt(id || '0');
        const index = purchases.findIndex((p: Purchase) => p.id === currentId);
        setCurrentPurchaseIndex(index >= 0 ? index : -1);
        
        console.log('Filtered purchases loaded:', {
          total: purchases.length,
          currentId,
          currentIndex: index
        });
      }
    } catch (err) {
      console.error('Error fetching filtered purchases:', err);
      setFilteredPurchases([]);
    }
  };

  // Функция для перехода к следующей закупке
  const goToNext = () => {
    if (currentPurchaseIndex >= 0 && currentPurchaseIndex < filteredPurchases.length - 1) {
      const nextPurchase = filteredPurchases[currentPurchaseIndex + 1];
      if (nextPurchase) {
        router.push(`/purchase/${nextPurchase.id}`);
      }
    }
  };

  // Функция для перехода к предыдущей закупке
  const goToPrevious = () => {
    if (currentPurchaseIndex > 0) {
      const prevPurchase = filteredPurchases[currentPurchaseIndex - 1];
      if (prevPurchase) {
        router.push(`/purchase/${prevPurchase.id}`);
      }
    }
  };

  // Функция для загрузки согласований по idPurchaseRequest
  const fetchApprovals = async (idPurchaseRequest: number): Promise<void> => {
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

  if (!purchase) {
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
                  filteredPurchases.length > 0 && currentPurchaseIndex >= 0 ? (
                    <div className="flex items-center gap-1 border-l border-gray-300 pl-2">
                      <button
                        onClick={goToPrevious}
                        disabled={currentPurchaseIndex <= 0}
                        className="flex items-center justify-center w-7 h-7 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Предыдущая закупка (←)"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs text-gray-500 px-1 min-w-[60px] text-center">
                        {currentPurchaseIndex + 1} / {filteredPurchases.length}
                      </span>
                      <button
                        onClick={goToNext}
                        disabled={currentPurchaseIndex >= filteredPurchases.length - 1}
                        className="flex items-center justify-center w-7 h-7 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Следующая закупка (→)"
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
                  {/* Заявка - неактивна */}
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-3 h-3 rounded-full bg-gray-300 mt-0.5" title="Заявка"></div>
                    <span className="text-[10px] text-gray-500 whitespace-nowrap leading-none">Заявка</span>
                  </div>

                    {/* Закупка - активна */}
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="relative w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center" title="Закупка">
                        <Clock className="w-2.5 h-2.5 text-white" />
                      </div>
                      <span className="text-[10px] text-gray-600 whitespace-nowrap leading-none">Закупка</span>
                    </div>
                  
                  {/* Договор - неактивна */}
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-3 h-3 rounded-full bg-gray-300 mt-0.5" title="Договор"></div>
                    <span className="text-[10px] text-gray-500 whitespace-nowrap leading-none">Договор</span>
                  </div>
                  </div>
                </div>
                
                {/* Даты создания и обновления записи */}
                <div className="flex items-center gap-0 hidden sm:block">
                  <div>
                    <span className="text-[8px] text-gray-400 leading-tight">Создание </span>
                    <span className="text-[9px] text-gray-500 leading-tight">
                      {formatDate(purchase.createdAt)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] text-gray-400 leading-tight">Обновление </span>
                    <span className="text-[9px] text-gray-500 leading-tight">
                      {formatDate(purchase.updatedAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

              {/* Раздел: Закупка */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="px-2 py-1.5 border-b border-gray-300 bg-gray-100">
                <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Закупка</h2>
              </div>
              <div className="p-2">
                <div className="flex flex-col lg:flex-row gap-4 items-start">
                  {/* Левая часть с полями закупки */}
                  <div className="flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1.5">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-0">
                          Номер закупки
                        </label>
                        <p className="text-xs text-gray-900">
                          {purchase.purchaseNumber || '-'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-0">
                          Дата создания закупки
                        </label>
                        <p className="text-xs text-gray-900">
                          {formatDate(purchase.purchaseCreationDate)}
                        </p>
                      </div>
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
                          Наименование
                        </label>
                        <p className="text-xs text-gray-900">
                          {purchase.name || '-'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-0">
                          Заголовок
                        </label>
                        <p className="text-xs text-gray-900">
                          {purchase.title || '-'}
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
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-0">
                          МЦЦ
                        </label>
                        <p className="text-xs text-gray-900">
                          {purchase.mcc || '-'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-0">
                          Инициатор закупки
                        </label>
                        <p className="text-xs text-gray-900">
                          {purchase.purchaseInitiator || '-'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-0">
                          Предмет закупки
                        </label>
                        <p className="text-xs text-gray-900">
                          {purchase.purchaseSubject || '-'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-0">
                          Бюджет
                        </label>
                        <p className="text-xs text-gray-900">
                          {formatCurrency(purchase.budgetAmount ? Number(purchase.budgetAmount) : null)}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-0">
                          Тип затрат
                        </label>
                        <p className="text-xs text-gray-900">
                          {purchase.costType || '-'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-0">
                          Тип договора
                        </label>
                        <p className="text-xs text-gray-900">
                          {purchase.contractType || '-'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-0">
                          Срок договора (мес.)
                        </label>
                        <p className="text-xs text-gray-900">
                          {purchase.contractDurationMonths || '-'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-0">
                          Статус
                        </label>
                        <p className="text-xs text-gray-900">
                          {purchase.status || '-'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-0">
                          Состояние
                        </label>
                        <p className="text-xs text-gray-900">
                          {purchase.state || '-'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Правая часть с блоком согласований закупки */}
                  <div className="w-full lg:w-64 flex-shrink-0">
                    <div className="space-y-1.5">
                      {/* Этап: Согласование результатов ЗП */}
                      {purchaseResultsApprovalApprovals.length > 0 && (
                      <div className="border border-gray-200 rounded p-1.5">
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
                      <div className="border border-gray-200 rounded p-1.5">
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
                      <div className="border border-gray-200 rounded p-1.5">
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

            {/* Раздел: Заявка на закупку */}
            {purchaseRequest && (
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
                      <div className="border border-gray-200 rounded p-1.5">
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
            )}

            {/* Раздел: Договор */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="px-2 py-1.5 border-b border-gray-300 bg-gray-100">
                <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Договор</h2>
              </div>
              <div className="p-2">
                <div className="flex flex-col lg:flex-row gap-4 items-start">
                  {/* Левая часть с полями договора */}
                  <div className="flex-1">
                    {contracts.length > 0 ? (
                      <div className="space-y-3">
                        {contracts.map((contract) => (
                        <div key={contract.id} className="border border-gray-200 rounded p-2">
                          {contract.parentContract ? (
                            // Если договор является спецификацией, показываем основной договор
                            <>
                              <div className="mb-2">
                                <label className="block text-xs font-semibold text-gray-600 mb-1">
                                  Основной договор
                                </label>
                              </div>
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
                    ) : (
                      <div className="text-center py-2 text-xs text-gray-500">
                        <p>Нет данных о договоре</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Правая часть - согласования договора */}
                  <div className="w-full lg:w-64 flex-shrink-0">
                    <div className="space-y-1.5">
                      {/* Этап: Согласование договора */}
                      {contractApprovalStageApprovals.length > 0 && (
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
                      <div className="border border-gray-200 rounded p-1.5">
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
                        <div className="border border-gray-200 rounded p-1.5 text-center py-2 text-[10px] text-gray-500">
                          Нет согласований
                        </div>
                      )}
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

