'use client';

import { useState, useEffect, useLayoutEffect, useRef, ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { getBackendUrl } from '@/utils/api';
import { copyToClipboard } from '@/utils/clipboard';
import { purchaserDisplayName, initiatorDisplayName } from '@/utils/purchaser';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Clock, Check, X, Eye, EyeOff, Copy, Star, History, MessageSquare } from 'lucide-react';
import Sidebar from '../../_components/Sidebar';

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
  currency: string | null;
  costType: string | null;
  contractType: string | null;
  contractDurationMonths: number | null;
  expenseItem: string | null;
  isPlanned: boolean | null;
  requiresPurchase: boolean | null;
  innerId: string | null;
  purchaseIds: number[] | null;
  contracts: Contract[] | null;
  status: string | null;
  statusGroup: string | null;
  excludeFromInWork: boolean | null;
  csiLink: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Purchase {
  id: number;
  innerId: string | null;
  cfo: string | null;
  purchaseRequestId: number | null;
  status: string | null;
  purchaseMethod: string | null; // Способ закупки (mcc)
  purchaseCreationDate: string | null;
}

interface Contract {
  id: number;
  innerId: string | null;
  name: string | null;
  title: string | null;
  cfo: string | null;
  contractCreationDate: string | null;
  budgetAmount: number | null;
  currency: string | null;
  purchaseRequestId: number | null;
  parentContractId: number | null;
  parentContract: Contract | null;
  status: string | null;
  state: string | null;
  preparedBy: string | null;
  excludedFromStatusCalculation?: boolean | null;
  exclusionComment?: string | null;
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

/** Согласование договора (contract_approvals) — для отображения в блоке Договор/Спецификация */
interface ContractApprovalItem {
  id: number;
  contractId: number;
  documentForm?: string | null;
  stage: string;
  role: string;
  executorName?: string | null;
  assignmentDate: string | null;
  completionDate: string | null;
  completionResult: string | null;
  commentText?: string | null;
}

interface CsiFeedback {
  id: number;
  purchaseRequestId: number;
  idPurchaseRequest: number | null;
  purchaseRequestInnerId: string;
  usedUzproc?: boolean;
  uzprocRating?: number;
  speedRating: number;
  qualityRating: number;
  satisfactionRating: number;
  comment?: string;
  recipient?: string;
  createdAt: string;
  updatedAt: string;
}

interface PurchaseRequestChangeItem {
  id: number;
  purchaseRequestId: number;
  fieldName: string;
  valueBefore: string | null;
  valueAfter: string | null;
  changeDate: string;
  createdAt: string;
  /** Источник: PARSING | USER */
  changeSource?: string | null;
  /** Кто изменил: "Система (парсинг)" или ФИО/email пользователя */
  changedByDisplayName?: string | null;
}

const SIDEBAR_COLLAPSED_KEY = 'sidebarCollapsed';
const ACTIVE_TAB_KEY = 'activeTab';

/** Email из cookie user-email (запасной вариант, если контекст ещё не подгрузился) */
function getAuthEmailFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/user-email=([^;]*)/);
  return match ? decodeURIComponent(match[1].trim()) || null : null;
}

export default function PurchaseRequestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;

  // Кнопка «Назад»: если есть from (URL списка) — переходим туда, иначе history.back()
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
  /** Согласования по каждому договору: contractId -> список согласований (из contract_approvals) */
  const [contractApprovalsByContractId, setContractApprovalsByContractId] = useState<Record<number, ContractApprovalItem[]>>({});
  const [specifications, setSpecifications] = useState<Contract[]>([]);
  const [isSpecificationsExpanded, setIsSpecificationsExpanded] = useState(false);
  // Используем глобальный контекст аутентификации
  const { userRole, userEmail } = useAuth();
  const [csiFeedback, setCsiFeedback] = useState<CsiFeedback | null>(null);
  const [csiFeedbackLoading, setCsiFeedbackLoading] = useState(false);
  const [contractExclusionModal, setContractExclusionModal] = useState<Contract | null>(null);
  const [exclusionForm, setExclusionForm] = useState<{ excludedFromStatusCalculation: boolean; exclusionComment: string }>({ excludedFromStatusCalculation: false, exclusionComment: '' });
  const [isSavingExclusion, setIsSavingExclusion] = useState(false);
  const [showChanges, setShowChanges] = useState(false);
  const [changesList, setChangesList] = useState<PurchaseRequestChangeItem[]>([]);
  const [changesLoading, setChangesLoading] = useState(false);
  /** Данные попапа комментария (рендер в портале, чтобы не обрезался). */
  const [commentPopoverData, setCommentPopoverData] = useState<{ id: number; commentText: string; left: number; top: number } | null>(null);

  // Закрытие попапа комментария при клике вне его (слушатель ставим в следующем тике)
  useEffect(() => {
    if (commentPopoverData == null) return;
    const onDocumentClick = (e: MouseEvent) => {
      const target = e.target instanceof Node ? e.target : null;
      if (target && (target as Element).closest?.('[data-comment-popover], [data-comment-popover-portal]')) return;
      setCommentPopoverData(null);
    };
    const t = setTimeout(() => document.addEventListener('click', onDocumentClick), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('click', onDocumentClick);
    };
  }, [commentPopoverData]);

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

  const handleSaveContractExclusion = async () => {
    if (!contractExclusionModal || !purchaseRequest) return;
    setIsSavingExclusion(true);
    try {
      const res = await fetch(`${getBackendUrl()}/api/contracts/${contractExclusionModal.id}/exclusion`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          excludedFromStatusCalculation: exclusionForm.excludedFromStatusCalculation,
          exclusionComment: exclusionForm.exclusionComment.trim() || null,
        }),
      });
      if (!res.ok) throw new Error('Ошибка сохранения');
      if (purchaseRequest.idPurchaseRequest) {
        await fetch(`${getBackendUrl()}/api/purchase-requests/update-status/${purchaseRequest.idPurchaseRequest}`, { method: 'POST' });
      }
      const dataRes = await fetch(`${getBackendUrl()}/api/purchase-requests/${id}`);
      if (dataRes.ok) {
        const data = await dataRes.json();
        setPurchaseRequest(data);
      }
      setContractExclusionModal(null);
    } catch (err) {
      console.error('Error saving contract exclusion:', err);
    } finally {
      setIsSavingExclusion(false);
    }
  };

  // Синхронизируем форму исключения договора при открытии модального окна
  useEffect(() => {
    if (contractExclusionModal) {
      setExclusionForm({
        excludedFromStatusCalculation: contractExclusionModal.excludedFromStatusCalculation ?? false,
        exclusionComment: contractExclusionModal.exclusionComment ?? '',
      });
    }
  }, [contractExclusionModal]);

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
            // Загружаем согласования договоров по каждому contract.id
            if (data.contracts?.length) {
              data.contracts.forEach((c: Contract) => {
                if (c.id) fetchContractApprovalsByContractId(c.id);
                if (c.parentContract?.id) fetchContractApprovalsByContractId(c.parentContract.id);
              });
            }
          }
          // Загружаем оценку CSI по id заявки (используем id, а не idPurchaseRequest)
          if (data.id) {
            fetchCsiFeedback(data.id);
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

  // Нормализация элемента согласования договора (поддержка executorName и executor_name из API)
  const normalizeContractApprovalItem = (item: Record<string, unknown>): ContractApprovalItem => ({
    id: Number(item.id),
    contractId: Number(item.contractId),
    documentForm: (item.documentForm as string) ?? null,
    stage: String(item.stage ?? ''),
    role: String(item.role ?? ''),
    executorName: (item.executorName ?? item.executor_name) as string | null | undefined,
    assignmentDate: (item.assignmentDate as string) ?? null,
    completionDate: (item.completionDate as string) ?? null,
    completionResult: (item.completionResult as string) ?? null,
    commentText: (item.commentText as string) ?? null,
  });

  // Загрузка согласований договора по id договора (contract_approvals)
  const fetchContractApprovalsByContractId = async (contractId: number) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/contract-approvals/by-contract/${contractId}`);
      if (response.ok) {
        const data = await response.json();
        const rawList = Array.isArray(data) ? data : [];
        const list = rawList.map((item: Record<string, unknown>) => normalizeContractApprovalItem(item));
        setContractApprovalsByContractId((prev) => ({ ...prev, [contractId]: list }));
      } else {
        setContractApprovalsByContractId((prev) => ({ ...prev, [contractId]: [] }));
      }
    } catch (err) {
      console.error('Error fetching contract approvals:', err);
      setContractApprovalsByContractId((prev) => ({ ...prev, [contractId]: [] }));
    }
  };

  // Функция для загрузки оценки CSI по id заявки
  const fetchCsiFeedback = async (purchaseRequestId: number) => {
    try {
      setCsiFeedbackLoading(true);
      const response = await fetch(`${getBackendUrl()}/api/csi-feedback/by-purchase-request/${purchaseRequestId}`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setCsiFeedback(data[0]); // Берем первую оценку
        } else {
          setCsiFeedback(null);
        }
      } else {
        setCsiFeedback(null);
      }
    } catch (err) {
      console.error('Error fetching CSI feedback:', err);
      setCsiFeedback(null);
    } finally {
      setCsiFeedbackLoading(false);
    }
  };

  // Загрузка истории изменений заявки (только при нажатии «Показать изменения»)
  const fetchChanges = async (requestId: number) => {
    try {
      setChangesLoading(true);
      const response = await fetch(`${getBackendUrl()}/api/purchase-requests/${requestId}/changes?page=0&size=100`);
      if (response.ok) {
        const data = await response.json();
        const content = data.content ?? [];
        setChangesList(Array.isArray(content) ? content : []);
      } else {
        setChangesList([]);
      }
    } catch (err) {
      console.error('Error fetching changes:', err);
      setChangesList([]);
    } finally {
      setChangesLoading(false);
    }
  };

  // Функция для загрузки спецификаций по parentContractId
  const fetchSpecifications = async (parentContractId: number) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/contracts/by-parent/${parentContractId}`);
      if (response.ok) {
        const data = await response.json();
        setSpecifications(data);
        // Загружаем согласования по каждому спецификации
        const list = Array.isArray(data) ? data : [];
        list.forEach((spec: { id?: number }) => {
          if (spec.id) fetchContractApprovalsByContractId(spec.id);
        });
      } else {
        setSpecifications([]);
      }
    } catch (err) {
      console.error('Error fetching specifications:', err);
      setSpecifications([]);
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

  const formatDateTime = (dateString: string | null): string => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
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

  // Рабочие дни для согласований договора. День назначения не считаем.
  // Выполненные: день выполнения считаем. Назначено и выполнено в один день → 1 день.
  // Не выполненные: считаем от (день после назначения) до сегодня включительно; если назначено сегодня — 0 дней.
  const calculateContractApprovalWorkingDays = (assignmentDate: string | null, completionDate: string | null): string => {
    if (!assignmentDate || String(assignmentDate).trim() === '') return '-';
    try {
      const hasCompletion = completionDate && String(completionDate).trim() !== '';
      const start = new Date(assignmentDate);
      start.setDate(start.getDate() + 1); // следующий день после назначения
      const end = hasCompletion ? new Date(completionDate) : new Date();
      if (start > end) {
        // Назначение и выполнение в один день (выполненные) или назначено сегодня (не выполненные): считаем этот день как 1, если рабочий
        const day = end.getDay();
        return (day !== 0 && day !== 6) ? '1' : '0';
      }
      let count = 0;
      const d = new Date(start);
      while (d <= end) {
        const day = d.getDay();
        if (day !== 0 && day !== 6) count++;
        d.setDate(d.getDate() + 1);
      }
      return count.toString();
    } catch {
      return '-';
    }
  };

  // Функция для определения цвета круга на основе результата выполнения
  const getApprovalStatusColor = (approval: Approval): 'green' | 'yellow' | 'red' | 'orange' => {
    if (!approval.completionResult) {
      if (approval.completionDate) {
        return 'green';
      }
      if (approval.assignmentDate) {
        return 'yellow';
      }
      return 'yellow';
    }
    const result = approval.completionResult.toLowerCase().trim();
    if (result.includes('замечан') || result.includes('замечание')) {
      return 'orange';
    }
    if (result === 'согласовано' || result === 'утверждено') {
      return 'green';
    }
    if (result === 'в процессе' || result.includes('процесс')) {
      return 'yellow';
    }
    if (result === 'не согласовано' || result === 'не утверждено' ||
        result.includes('не согласован') || result.includes('не утвержден') ||
        result.includes('не утверждена')) {
      return 'red';
    }
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

  // Логика трэка «Заявка» как в таблице: зелёный = этап пройден, жёлтый = в процессе (на согласовании, утверждена, и т.д.)
  const isOnCoordination = purchaseRequest?.statusGroup === 'Заявка на согласовании';
  const isAtBuyer = purchaseRequest?.statusGroup === 'Заявка у закупщика';
  const isSpecificationInProgress = purchaseRequest?.statusGroup === 'Спецификация в работе';
  const isContractInProgress = purchaseRequest?.statusGroup === 'Договор в работе';
  const isRequestStepGreen = isAtBuyer || isSpecificationInProgress || isContractInProgress ||
    purchaseRequest?.status === 'Спецификация подписана' ||
    purchaseRequest?.status === 'Договор подписан' ||
    purchaseRequest?.status === 'Договор создан' ||
    purchaseRequest?.status === 'Закупка создана';

  // Логика трэка «Закупка»: зелёный = этап пройден (спец/договор в работе или уже подписаны), жёлтый = в процессе
  const isPurchaseStepGreen = isSpecificationInProgress || isContractInProgress ||
    purchaseRequest?.status === 'Спецификация подписана' ||
    purchaseRequest?.status === 'Договор подписан' ||
    purchaseRequest?.statusGroup === 'Договор подписан';
  const isPurchaseStepYellow = (
    isAtBuyer ||
    (purchase && (purchase.status === 'Закупка создана' || purchase.status === 'Завершена'))
  ) && !isPurchaseStepGreen;
  const isPurchaseStepRed = purchase && purchase.status === 'Закупка не согласована';

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

  // Порядок этапов для согласований договора и спецификаций: Согласование договора → Этап 2 → ... → Синхронизация → Регистрация → Принятие на хранение
  const CONTRACT_SPEC_STAGE_ORDER = [
    'Согласование договора',
    'Этап 2',
    'Согласование договора - Этап 1',
    'Согласование договора - Этап 2',
    'Синхронизация',
    'Регистрация',
    'Регистрация договора',
    'Принятие на хранение',
  ];
  const getContractSpecStageOrder = (stages: string[]) =>
    [...stages].sort((a, b) => {
      const i = CONTRACT_SPEC_STAGE_ORDER.indexOf(a);
      const j = CONTRACT_SPEC_STAGE_ORDER.indexOf(b);
      return (i === -1 ? 999 : i) - (j === -1 ? 999 : j);
    });

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

  // Функция для расчета средней оценки
  const getAverageRating = (feedback: CsiFeedback) => {
    const ratings = [
      feedback.speedRating,
      feedback.qualityRating,
      feedback.satisfactionRating,
    ];
    if (feedback.uzprocRating) {
      ratings.push(feedback.uzprocRating);
    }
    const sum = ratings.reduce((acc, rating) => acc + (rating || 0), 0);
    return sum / ratings.length;
  };

  // Функция для отображения звезд
  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: fullStars }).map((_, i) => (
          <Star key={`full-${i}`} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
        ))}
        {hasHalfStar && (
          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 opacity-50" />
        )}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <Star key={`empty-${i}`} className="w-3 h-3 text-gray-300" />
        ))}
        <span className="ml-1 text-xs text-gray-600">{rating.toFixed(1)}</span>
      </div>
    );
  };

  const getCurrencyIcon = (currency: string | null) => {
    if (!currency) return null;
    const currencyUpper = currency.toUpperCase();
    if (currencyUpper === 'USD' || currencyUpper === 'ДОЛЛАР' || currencyUpper === '$') {
      return <span className="ml-0.5">$</span>;
    } else if (currencyUpper === 'EUR' || currencyUpper === 'ЕВРО' || currencyUpper === '€') {
      return <span className="ml-0.5">€</span>;
    } else if (currencyUpper === 'UZS' || currencyUpper === 'СУМ' || currencyUpper === 'СУММ') {
      return <span className="ml-0.5 text-xs">UZS</span>;
    }
    return <span className="ml-0.5 text-xs">{currency}</span>;
  };

  const formatCurrency = (amount: number | null, currency: string | null = null): string | ReactElement => {
    if (amount === null) return '-';
    const formatted = new Intl.NumberFormat('ru-RU', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
    if (currency) {
      return (
        <span className="flex items-center">
          {formatted}
          {getCurrencyIcon(currency)}
        </span>
      );
    }
    return formatted;
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

          <main className="flex-1 overflow-y-auto p-1.5 sm:p-2 lg:p-2 pt-16 sm:pt-20 lg:pt-4">
            <div className="bg-white rounded-lg shadow-lg p-2">
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

          <main className="flex-1 overflow-y-auto p-1.5 sm:p-2 lg:p-2 pt-16 sm:pt-20 lg:pt-4">
            <div className="bg-white rounded-lg shadow-lg p-2">
              <div className="text-center py-6">
                <p className="text-red-600 mb-4">Ошибка: {error}</p>
                <button
                  onClick={goBack}
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

        <main className="flex-1 overflow-y-auto p-1.5 sm:p-2 lg:p-2 pt-16 sm:pt-20 lg:pt-4">
          <div className="space-y-1">
            {/* Верхняя панель с кнопкой назад и трекером статусов */}
            <div className="space-y-1">
              {/* Кнопка назад */}
              <div className="flex items-center gap-2">
                <button
                  onClick={goBack}
                  className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Назад к списку</span>
                </button>
              </div>

              {/* Трекер статусов — на всю ширину, круги соединены линиями */}
              <div className="flex items-end gap-2 flex-wrap w-full">
              <div className="bg-white rounded-lg shadow-lg px-4 py-2 border border-gray-200 hidden sm:block w-full min-w-0 overflow-visible">
                {/* Верхний ряд: круги и линии (цвет линий и неактивных кругов — как в таблице: gray-300) */}
                <div className="flex items-center w-full">
                  {/* Потребность — всегда зелёный (первый этап) */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className="relative w-6 h-6 rounded-full bg-green-500 flex items-center justify-center" title="Потребность">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-[12px] h-0.5 border-t-2 border-gray-300" aria-hidden />
                  {/* Заявка — логика как в таблице: зелёный = этап пройден, жёлтый = в процессе */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    {isRequestStepGreen ? (
                      <div className="relative w-6 h-6 rounded-full bg-green-500 flex items-center justify-center" title="Заявка">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    ) : (
                      <div className="relative w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center animate-yellow-circle-pulse" title={isOnCoordination ? 'Заявка на согласовании' : 'Заявка'}>
                        <Clock className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>

                    {purchaseRequest.requiresPurchase !== false ? (
                      <>
                        <div className="flex-1 min-w-[12px] h-0.5 border-t-2 border-gray-300" aria-hidden />
                        <div className="flex flex-col items-center flex-shrink-0">
                          {isPurchaseStepRed ? (
                            <div className="relative w-6 h-6 rounded-full bg-red-500 flex items-center justify-center" title="Закупка: Закупка не согласована">
                              <X className="w-4 h-4 text-white" />
                            </div>
                          ) : isPurchaseStepGreen ? (
                            <div className="relative w-6 h-6 rounded-full bg-green-500 flex items-center justify-center" title={isSpecificationInProgress ? 'Закупка: Спецификация в работе' : 'Закупка: Договор в работе'}>
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          ) : isPurchaseStepYellow ? (
                            <div className="relative w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center animate-yellow-circle-pulse" title={purchase?.status === 'Закупка создана' ? 'Закупка: Закупка создана' : purchase?.status === 'Завершена' ? 'Закупка: Завершена' : 'Закупка: Заявка у закупщика'}>
                              <Clock className="w-4 h-4 text-white" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-gray-300" title="Закупка"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-[12px] h-0.5 border-t-2 border-gray-300" aria-hidden />
                        <div className="flex flex-col items-center flex-shrink-0">
                          {purchaseRequest?.status === 'Договор подписан' || purchaseRequest?.statusGroup === 'Договор подписан' ? (
                            <div className="relative w-6 h-6 rounded-full bg-green-500 flex items-center justify-center" title="Договор: Договор подписан">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          ) : purchase && purchase.status === 'Завершена' ? (
                            <div className="relative w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center animate-yellow-circle-pulse" title="Договор: Закупка завершена">
                              <Clock className="w-4 h-4 text-white" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-gray-300" title="Договор"></div>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 min-w-[12px] h-0.5 border-t-2 border-gray-300" aria-hidden />
                        <div className="flex flex-col items-center flex-shrink-0">
                          {purchaseRequest.status === 'Спецификация подписана' ? (
                            <div className="relative w-6 h-6 rounded-full bg-green-500 flex items-center justify-center" title="Заказ: Спецификация подписана">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          ) : purchaseRequest.requiresPurchase === false && (isAtBuyer || isSpecificationInProgress || isContractInProgress) ? (
                            <div className="relative w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center animate-yellow-circle-pulse" title="Заказ: в работе">
                              <Clock className="w-4 h-4 text-white" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-gray-300" title="Заказ"></div>
                          )}
                        </div>
                      </>
                    )}
                </div>
                {/* Нижний ряд: названия строго под кругами (та же сетка: круг w-6, линия flex-1) */}
                <div className="flex w-full mt-1 items-center">
                  <div className="flex flex-col items-center flex-shrink-0 w-6">
                    <span className="text-[10px] text-gray-600 whitespace-nowrap leading-none">Потребность</span>
                  </div>
                  <div className="flex-1 min-w-[12px]" aria-hidden />
                  <div className="flex flex-col items-center flex-shrink-0 w-6">
                    <span className="text-[10px] text-gray-600 whitespace-nowrap leading-none">Заявка</span>
                  </div>
                  {purchaseRequest.requiresPurchase !== false ? (
                    <>
                      <div className="flex-1 min-w-[12px]" aria-hidden />
                      <div className="flex flex-col items-center flex-shrink-0 w-6">
                        <span className="text-[10px] text-gray-500 whitespace-nowrap leading-none">Закупка</span>
                      </div>
                      <div className="flex-1 min-w-[12px]" aria-hidden />
                      <div className="flex flex-col items-center flex-shrink-0 w-6">
                        <span className="text-[10px] text-gray-500 whitespace-nowrap leading-none">Договор</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 min-w-[12px]" aria-hidden />
                      <div className="flex flex-col items-center flex-shrink-0 w-6">
                        <span className="text-[10px] text-gray-500 whitespace-nowrap leading-none">Заказ</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
              </div>
            </div>

              {/* Раздел: Заявка на закупку */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="px-2 py-1 border-b border-gray-300 bg-gray-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Заявка на закупку</span>
                {purchaseRequest && (
                  <div className="flex items-center gap-1">
                    {/* Кнопка «Показать изменения» — запрос к бэку только при нажатии */}
                    <button
                      onClick={() => {
                        if (showChanges) {
                          setShowChanges(false);
                        } else {
                          setShowChanges(true);
                          fetchChanges(purchaseRequest.id);
                        }
                      }}
                      className={`flex items-center justify-center rounded p-1 transition-colors hover:bg-gray-200 cursor-pointer ${showChanges ? 'bg-gray-200' : ''}`}
                      title={showChanges ? 'Скрыть изменения и вернуться к заявке' : 'Показать изменения'}
                    >
                      <History className="w-4 h-4 text-gray-600" />
                      <span className="ml-1 text-xs text-gray-700 hidden sm:inline">{showChanges ? 'Скрыть изменения' : 'Показать изменения'}</span>
                    </button>
                    {/* Кнопка CSI - копирование ссылки */}
                    {purchaseRequest.csiLink && (
                      <button
                        onClick={async () => {
                          try {
                            // Используем полный URL, который приходит с бэкенда (уже учитывает окружение)
                            const fullUrl = purchaseRequest.csiLink || '';
                            if (!fullUrl) return;
                            await copyToClipboard(fullUrl);
                            alert('Ссылка на форму CSI скопирована в буфер обмена');
                          } catch (error) {
                            console.error('Error copying to clipboard:', error);
                            alert(error instanceof Error ? error.message : 'Не удалось скопировать ссылку');
                          }
                        }}
                        className="flex items-center justify-center rounded p-1 transition-colors hover:bg-gray-200 cursor-pointer"
                        title="Скопировать ссылку на форму CSI"
                      >
                        <Copy className="w-4 h-4 text-gray-600" />
                      </button>
                    )}
                    {/* Кнопка скрыть из в работе */}
                    <button
                      onClick={async () => {
                      if (userRole !== 'admin') {
                        alert('Только администратор может изменять видимость заявки в работе');
                        return;
                      }
                      const newValue = !purchaseRequest.excludeFromInWork;
                      try {
                        const response = await fetch(`${getBackendUrl()}/api/purchase-requests/${purchaseRequest.idPurchaseRequest}/exclude-from-in-work`, {
                          method: 'PATCH',
                          headers: {
                            'Content-Type': 'application/json',
                            'X-User-Role': userRole || 'user',
                            ...((userEmail ?? getAuthEmailFromCookie()) ? { 'X-User-Name': (userEmail ?? getAuthEmailFromCookie())! } : {}),
                          },
                          body: JSON.stringify({ excludeFromInWork: newValue }),
                        });
                        if (response.ok) {
                          const updated = await response.json();
                          setPurchaseRequest(prev => prev ? { ...prev, excludeFromInWork: updated.excludeFromInWork } : null);
                        } else {
                          const errorData = await response.json().catch(() => ({ message: 'Ошибка сервера' }));
                          alert(errorData.message || 'Не удалось обновить видимость заявки');
                        }
                      } catch (error) {
                        console.error('Error updating excludeFromInWork:', error);
                        alert('Ошибка при обновлении видимости заявки');
                      }
                    }}
                    className={`flex items-center justify-center rounded p-1 transition-colors ${userRole === 'admin' ? 'hover:bg-gray-200 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                    title={userRole === 'admin' 
                      ? (purchaseRequest.excludeFromInWork 
                          ? "Скрыто из вкладки 'В работе' (кликните для изменения)" 
                          : "Отображается во вкладке 'В работе' (кликните для изменения)")
                      : "Только администратор может изменить видимость заявки"}
                    disabled={userRole !== 'admin'}
                  >
                      {purchaseRequest.excludeFromInWork ? (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-600" />
                    )}
                  </button>
                  </div>
                )}
              </div>
              <div className="p-1.5">
                {showChanges ? (
                  /* Список изменений (запрос к бэку только при первом нажатии «Показать изменения») */
                  <div className="space-y-1">
                    {changesLoading ? (
                      <p className="text-xs text-gray-500">Загрузка изменений...</p>
                    ) : changesList.length === 0 ? (
                      <p className="text-xs text-gray-500">Нет записей об изменениях.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-xs">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="text-left py-1 px-2 font-medium text-gray-600">Дата</th>
                              <th className="text-left py-1 px-2 font-medium text-gray-600">Поле</th>
                              <th className="text-left py-1 px-2 font-medium text-gray-600">Было</th>
                              <th className="text-left py-1 px-2 font-medium text-gray-600">Стало</th>
                              <th className="text-left py-1 px-2 font-medium text-gray-600">Кто изменил</th>
                            </tr>
                          </thead>
                          <tbody>
                            {changesList.map((ch) => (
                              <tr key={ch.id} className="border-b border-gray-100">
                                <td className="py-1 px-2 text-gray-900 whitespace-nowrap">
                                  {ch.changeDate ? new Date(ch.changeDate).toLocaleString('ru-RU') : '-'}
                                </td>
                                <td className="py-1 px-2 text-gray-900">{ch.fieldName}</td>
                                <td className="py-1 px-2 text-gray-700 max-w-[200px] truncate" title={ch.valueBefore ?? ''}>{ch.valueBefore ?? '—'}</td>
                                <td className="py-1 px-2 text-gray-700 max-w-[200px] truncate" title={ch.valueAfter ?? ''}>{ch.valueAfter ?? '—'}</td>
                                <td className="py-1 px-2 text-gray-700">{ch.changedByDisplayName ?? (ch.changeSource === 'PARSING' ? 'Система (парсинг)' : '—')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : (
                <>
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto_auto_minmax(32rem,36rem)] gap-x-1.5 gap-y-1 items-stretch">
                  {/* Левая часть с полями заявки */}
                  <div className="min-w-0">
                <div className="flex items-baseline gap-1 pb-1 mb-1 border-b border-gray-200">
                  <span className="text-xs font-semibold text-gray-600">Номер:</span>
                  <span className="text-xs text-gray-900">{purchaseRequest.idPurchaseRequest ?? '—'}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-0">
                      Наименование
                    </label>
                    <p className="text-xs text-gray-900">
                      {purchaseRequest.name || '-'}
                    </p>
                  </div>
              </div>
              </div>

                  {/* Блок План, Требуется закупка — слева от ЦФО/Бюджет */}
                  <div className="flex-shrink-0 w-full lg:w-auto h-full flex flex-col">
                    <div className="bg-white rounded-lg border border-gray-200 px-2 py-1.5 space-y-1 flex-1 min-h-0">
                      <div className="flex items-baseline gap-1 text-xs whitespace-nowrap min-w-0 overflow-hidden">
                        <span className="font-semibold text-gray-600 flex-shrink-0">План:</span>
                        <span className="text-gray-900 truncate">{purchaseRequest.isPlanned === true ? 'В плане' : purchaseRequest.isPlanned === false ? 'Не в плане' : '—'}</span>
                      </div>
                      <div className="flex items-baseline gap-1 text-xs whitespace-nowrap min-w-0 overflow-hidden">
                        <span className="font-semibold text-gray-600 flex-shrink-0">Требуется закупка:</span>
                        <span className="truncate">
                          {purchaseRequest.requiresPurchase === true ? (
                            <span className="inline-flex px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                              Да
                            </span>
                          ) : purchaseRequest.requiresPurchase === false ? (
                            <span className="inline-flex px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                              Нет
                            </span>
                          ) : (
                            <span className="inline-flex px-1.5 py-0.5 text-xs font-medium bg-gray-50 text-gray-500 rounded-full">
                              —
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Блок ЦФО, Бюджет, Статья расходов — слева от инициатора/закупщика */}
                  <div className="flex-shrink-0 w-full lg:w-auto h-full flex flex-col">
                    <div className="bg-white rounded-lg border border-gray-200 px-2 py-1.5 space-y-1 flex-1 min-h-0">
                      <div className="flex items-baseline gap-1 text-xs whitespace-nowrap min-w-0 overflow-hidden">
                        <span className="font-semibold text-gray-600 flex-shrink-0">ЦФО:</span>
                        <span className="text-gray-900 truncate">{purchaseRequest.cfo || '-'}</span>
                      </div>
                      <div className="flex items-baseline gap-1 text-xs whitespace-nowrap min-w-0 overflow-hidden">
                        <span className="font-semibold text-gray-600 flex-shrink-0">Бюджет:</span>
                        <span className="text-gray-900 truncate">{formatCurrency(purchaseRequest.budgetAmount ? Number(purchaseRequest.budgetAmount) : null, purchaseRequest.currency)}</span>
                      </div>
                      <div className="flex items-baseline gap-1 text-xs whitespace-nowrap min-w-0 overflow-hidden">
                        <span className="font-semibold text-gray-600 flex-shrink-0">Статья расходов:</span>
                        <span className="text-gray-900 truncate">{purchaseRequest.expenseItem || '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Блок инициатор — слева от согласований (закупщик перенесён в серую плашку слева от даты) */}
                  <div className="flex-shrink-0 w-full lg:w-auto h-full flex flex-col">
                    <div className="bg-white rounded-lg border border-gray-200 px-2 py-1.5 space-y-1 flex-1 min-h-0">
                      <div className="flex items-baseline gap-1 text-xs whitespace-nowrap min-w-0 overflow-hidden">
                        <span className="font-semibold text-gray-600 flex-shrink-0">Инициатор:</span>
                        <span className="text-gray-900 truncate">{initiatorDisplayName(purchaseRequest.purchaseRequestInitiator)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Правая часть: закупщик + дата создания в серой плашке, блок согласований */}
              <div className="w-full min-w-0 flex flex-col min-h-0">
                    <div className="bg-white rounded px-1.5 py-1 space-y-1 flex-1 min-h-0">
                      <div className="flex flex-wrap items-baseline gap-2 pb-1 mb-1 border-b border-gray-200">
                        <div className="inline-flex items-baseline gap-1.5 px-2 py-1 rounded bg-gray-200">
                          <span className="text-xs font-semibold text-gray-700">Закупщик:</span>
                          <span className="text-xs text-gray-900">{purchaserDisplayName(purchaseRequest.purchaser)}</span>
                        </div>
                        <div className="inline-flex items-baseline gap-1.5 px-2 py-1 rounded bg-gray-200">
                          <span className="text-xs font-semibold text-gray-700">Дата создания заявки:</span>
                          <span className="text-xs text-gray-900">{formatDate(purchaseRequest.purchaseRequestCreationDate)}</span>
                        </div>
                      </div>
                      {/* Этап: Согласование */}
                      {approvalStageApprovals.length > 0 && (
                      <div className="bg-white rounded-lg shadow-md p-1.5">
                        <div className="flex items-start gap-1 mb-0.5">
                          <div className="text-[10px] font-semibold text-gray-900 flex-1 leading-tight">Согласование</div>
                        </div>
                        
                        {/* Заголовки колонок */}
                        <div className="flex gap-x-1 items-end mb-0.5 pb-0.5 border-b border-gray-200">
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
                        
                        <div className="space-y-0.5">
                          {approvalStageApprovals.length > 0 ? (
                            approvalStageApprovals.map((approval) => (
                              <div key={approval.id} className="flex gap-x-1 items-end border-b border-gray-200 pb-0.5 last:border-b-0 last:pb-0">
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
                                            <div className="w-3 h-3 rounded-full bg-yellow-500 flex items-center justify-center animate-yellow-circle-pulse-fast" title={approval.completionResult || 'В процессе'}>
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
                            <div className="text-[10px] text-gray-500 text-center py-0">Нет данных</div>
                          )}
                        </div>
                      </div>
                      )}

                      {/* Этап: Руководитель закупок */}
                      {managerStageApprovals.length > 0 && (
                      <div className="bg-white rounded-lg shadow-md p-1.5">
                        <div className="flex items-start gap-1 mb-0.5">
                          <div className="text-[10px] font-semibold text-gray-900 flex-1 leading-tight">Руководитель закупок</div>
                        </div>
                        
                        {/* Заголовки колонок */}
                        <div className="flex gap-x-1 items-end mb-0.5 pb-0.5 border-b border-gray-200">
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
                                          <div className="w-3 h-3 rounded-full bg-yellow-500 flex items-center justify-center animate-yellow-circle-pulse-fast" title={approval.completionResult || 'В процессе'}>
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
                          <div className="text-[10px] text-gray-500 text-center py-0">Нет данных</div>
                        )}
                      </div>
                      )}

                      {/* Этап: Утверждение */}
                      {finalApprovalStageApprovals.length > 0 && (
                      <div className="bg-white rounded-lg shadow-md p-1.5">
                        <div className="flex items-start gap-1 mb-0.5">
                          <div className="text-[10px] font-semibold text-gray-900 flex-1 leading-tight">Утверждение</div>
                        </div>
                        
                        {/* Заголовки колонок */}
                        <div className="flex gap-x-1 items-end mb-0.5 pb-0.5 border-b border-gray-200">
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
                            <div key={approval.id} className="flex gap-x-1 items-end border-b border-gray-200 pb-0.5 last:border-b-0 last:pb-0">
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
                                          <div className="w-3 h-3 rounded-full bg-yellow-500 flex items-center justify-center animate-yellow-circle-pulse-fast" title={approval.completionResult || 'В процессе'}>
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
                          <div className="text-[10px] text-gray-500 text-center py-0">Нет данных</div>
                        )}
                      </div>
                      )}

                      {/* Этап: Утверждение заявки на ЗП (НЕ требуется ЗП) */}
                      {finalApprovalNoZpStageApprovals.length > 0 && (
                      <div className="bg-white rounded-lg shadow-md p-1.5">
                        <div className="flex items-start gap-1 mb-0.5">
                          <div className="text-[10px] font-semibold text-gray-900 flex-1 leading-tight">Утверждение заявки на ЗП (НЕ требуется ЗП)</div>
                        </div>
                        
                        {/* Заголовки колонок */}
                        <div className="flex gap-x-1 items-end mb-0.5 pb-0.5 border-b border-gray-200">
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
                            <div key={approval.id} className="flex gap-x-1 items-end border-b border-gray-200 pb-0.5 last:border-b-0 last:pb-0">
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
                                          <div className="w-3 h-3 rounded-full bg-yellow-500 flex items-center justify-center animate-yellow-circle-pulse-fast" title={approval.completionResult || 'В процессе'}>
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
                          <div className="text-[10px] text-gray-500 text-center py-0">Нет данных</div>
                        )}
                      </div>
                      )}
                    </div>
                  </div>
                </div>
                </>
                )
              }
              </div>
            </div>

            {/* Раздел: Закупка - показываем только если требуется закупка */}
            {purchaseRequest.requiresPurchase !== false && (
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="px-2 py-1 border-b border-gray-300 bg-gray-100">
                  <span className="text-sm font-semibold text-gray-700">Закупка</span>
                </div>
                <div className="p-1.5">
                <div className="flex flex-col lg:flex-row gap-2 items-start">
                  {/* Левая часть с полями закупки */}
                  <div className="flex-1">
                  {purchase ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1">
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
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-0">
                          Способ закупки
                        </label>
                        <p className="text-xs text-gray-900">
                          {purchase.purchaseMethod || '-'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-0">
                          Статус
                        </label>
                        {purchase.status ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            purchase.status === 'Завершена'
                              ? 'bg-green-100 text-green-800'
                              : purchase.status === 'Не согласовано' 
                              ? 'bg-red-100 text-red-800' 
                              : purchase.status === 'Проект'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {purchase.status}
                          </span>
                        ) : (
                          <p className="text-xs text-gray-500">-</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-1 text-xs text-gray-500">
                      <p>Связанная закупка не найдена</p>
                    </div>
                  )}
              </div>

                    {/* Блок оценки CSI - между закупкой и согласованиями */}
                    <div className="w-full lg:w-80 flex-shrink-0">
                      {csiFeedbackLoading ? (
                        <div className="border border-gray-200 rounded p-2 bg-gray-50 text-center">
                          <div className="text-xs text-gray-400">Загрузка...</div>
                        </div>
                      ) : csiFeedback ? (
                        <div className="border border-gray-200 rounded p-1.5 bg-gray-50">
                          <div className="flex items-start justify-between mb-0.5">
                            <div className="flex-1 min-w-0 flex items-center gap-2">
                              <div className="text-xs font-medium text-gray-900">
                                {csiFeedback.idPurchaseRequest || '-'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatDateTime(csiFeedback.createdAt)}
                              </div>
                            </div>
                            <div className="ml-2 flex-shrink-0">
                              {renderStars(getAverageRating(csiFeedback))}
                            </div>
                          </div>

                          {csiFeedback.comment && (
                            <div className="mt-1">
                              <div className="text-xs text-gray-700 bg-white rounded p-1 border border-gray-200">
                                {csiFeedback.comment}
                              </div>
                            </div>
                          )}

                          <div className="mt-1 flex flex-wrap gap-1 text-xs text-gray-500">
                            <span>Скорость: {csiFeedback.speedRating.toFixed(1)}</span>
                            <span>Качество: {csiFeedback.qualityRating.toFixed(1)}</span>
                            <span>Закупщик: {csiFeedback.satisfactionRating.toFixed(1)}</span>
                            {csiFeedback.uzprocRating && (
                              <span>Узпрок: {csiFeedback.uzprocRating.toFixed(1)}</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="border border-gray-200 rounded p-2 bg-gray-50 text-center">
                          <div className="text-xs text-gray-400">Оценки пока нет</div>
                          <div className="text-xs text-gray-400 mt-1">Она появится после получения отзыва</div>
                        </div>
                      )}
                    </div>

                    {/* Правая часть с блоком согласований */}
              <div className="w-full lg:min-w-[32rem] lg:w-[36rem] flex-shrink-0 min-w-0 max-w-full">
                    <div className="bg-white rounded px-1.5 py-1 space-y-1">
                      {purchase && purchase.purchaseCreationDate != null && (
                        <div className="inline-flex items-baseline gap-1.5 px-2 py-1 rounded bg-gray-200 pb-1 mb-1 border-b border-gray-200">
                          <span className="text-xs font-semibold text-gray-700">Дата создания закупки:</span>
                          <span className="text-xs text-gray-900">{formatDate(purchase.purchaseCreationDate)}</span>
                        </div>
                      )}
                      {/* Этап: Согласование результатов ЗП */}
                      {purchaseResultsApprovalApprovals.length > 0 && (
                      <div className="bg-white rounded-lg shadow-md p-1.5">
                        <div className="flex items-start gap-1 mb-0.5">
                          <div className="text-[10px] font-semibold text-gray-900 flex-1 leading-tight">Согласование результатов ЗП</div>
                        </div>
                        
                        {/* Заголовки колонок */}
                        <div className="flex gap-x-1 items-end mb-0.5 pb-0.5 border-b border-gray-200">
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
                        
                        <div className="space-y-0.5">
                          {purchaseResultsApprovalApprovals.length > 0 ? (
                            purchaseResultsApprovalApprovals.map((approval) => (
                              <div key={approval.id} className="flex gap-x-1 items-end border-b border-gray-200 pb-0.5 last:border-b-0 last:pb-0">
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
                                            <div className="w-3 h-3 rounded-full bg-yellow-500 flex items-center justify-center animate-yellow-circle-pulse-fast" title={approval.completionResult || 'В процессе'}>
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
                            <div className="text-[10px] text-gray-500 text-center py-0">Нет данных</div>
                          )}
                        </div>
                      </div>
                      )}

                      {/* Этап: Закупочная комиссия */}
                      {purchaseCommissionApprovals.length > 0 && (
                      <div className="bg-white rounded-lg shadow-md p-1.5">
                        <div className="flex items-start gap-1 mb-0.5">
                          <div className="text-[10px] font-semibold text-gray-900 flex-1 leading-tight">Закупочная комиссия</div>
                        </div>
                        
                        {/* Заголовки колонок */}
                        <div className="flex gap-x-1 items-end mb-0.5 pb-0.5 border-b border-gray-200">
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
                        
                        <div className="space-y-0.5">
                          {purchaseCommissionApprovals.length > 0 ? (
                            purchaseCommissionApprovals.map((approval) => (
                              <div key={approval.id} className="flex gap-x-1 items-end border-b border-gray-200 pb-0.5 last:border-b-0 last:pb-0">
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
                                            <div className="w-3 h-3 rounded-full bg-yellow-500 flex items-center justify-center animate-yellow-circle-pulse-fast" title={approval.completionResult || 'В процессе'}>
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
                            <div className="text-[10px] text-gray-500 text-center py-0">Нет данных</div>
                          )}
                        </div>
                      </div>
                      )}

                      {/* Этап: Проверка результата закупочной комиссии */}
                      {purchaseCommissionResultCheckApprovals.length > 0 && (
                      <div className="bg-white rounded-lg shadow-md p-1.5">
                        <div className="flex items-start gap-1 mb-0.5">
                          <div className="text-[10px] font-semibold text-gray-900 flex-1 leading-tight">Проверка результата закупочной комиссии</div>
                        </div>
                        
                        {/* Заголовки колонок */}
                        <div className="flex gap-x-1 items-end mb-0.5 pb-0.5 border-b border-gray-200">
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
                        
                        <div className="space-y-0.5">
                          {purchaseCommissionResultCheckApprovals.length > 0 ? (
                            purchaseCommissionResultCheckApprovals.map((approval) => (
                              <div key={approval.id} className="flex gap-x-1 items-end border-b border-gray-200 pb-0.5 last:border-b-0 last:pb-0">
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
                                            <div className="w-3 h-3 rounded-full bg-yellow-500 flex items-center justify-center animate-yellow-circle-pulse-fast" title={approval.completionResult || 'В процессе'}>
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
                            <div className="text-[10px] text-gray-500 text-center py-0">Нет данных</div>
                          )}
                        </div>
                      </div>
                      )}
                        
                        {/* Сообщение "Нет согласований" для закупок */}
                        {purchaseResultsApprovalApprovals.length === 0 && 
                         purchaseCommissionApprovals.length === 0 && 
                         purchaseCommissionResultCheckApprovals.length === 0 && (
                          <div className="border border-gray-200 rounded p-1.5 text-center py-1 text-[10px] text-gray-500">
                            Нет согласований
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* Раздел: Спецификация — сетка как у Заявка/Закупка/Договор, колонка согласований minmax(32rem,36rem) */}
            {purchaseRequest.requiresPurchase === false && (() => {
              // Проверяем, есть ли данные для отображения
              const hasContracts = purchaseRequest.contracts && purchaseRequest.contracts.length > 0 && 
                purchaseRequest.contracts.some(contract => 
                  contract.innerId || contract.name || contract.title || contract.cfo || 
                  contract.contractCreationDate || contract.budgetAmount
                );
              const hasApprovals = purchaseRequest.contracts?.some(c => (contractApprovalsByContractId[c.id]?.length ?? 0) > 0) ?? false;
              
              // Показываем блок только если есть данные
              return (hasContracts || hasApprovals) ? (
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="px-2 py-1 border-b border-gray-300 bg-gray-100">
                  <span className="text-sm font-semibold text-gray-700">Спецификация</span>
                </div>
                <div className="p-1.5">
                <div className="space-y-1.5">
                  {/* Каждая строка = один договор (спецификация) + его Договорник + его согласования */}
                  {purchaseRequest.contracts && purchaseRequest.contracts.length > 0 ? (
                    (purchaseRequest.contracts ?? []).map((contract) => {
                      const list = contractApprovalsByContractId[contract.id] ?? [];
                      const stages = [...new Set(list.map((a) => a.stage || 'Без этапа'))];
                      const stageOrder = getContractSpecStageOrder(stages);
                      return (
                        <div key={contract.id} className={`grid grid-cols-1 lg:grid-cols-[1fr_auto_minmax(32rem,36rem)] gap-x-1.5 gap-y-1 items-start ${contract.excludedFromStatusCalculation ? 'opacity-50' : ''}`}>
                          <div className="min-w-0">
                            <div className="relative border border-gray-200 rounded p-1.5 min-w-0">
                              <button type="button" className="absolute top-1 right-1 p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700" onClick={() => setContractExclusionModal(contract)} title={contract.excludedFromStatusCalculation ? 'Включить в расчёт статуса заявки' : 'Исключить из расчёта статуса заявки'}>
                                {contract.excludedFromStatusCalculation ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-1 min-w-0">
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
                                ЦФО
                              </label>
                              <p className="text-xs text-gray-900">
                                {contract.cfo || '-'}
                              </p>
                            </div>
                          </div>
                            </div>
                          </div>
                          <div className="flex-shrink-0 w-full lg:w-auto">
                            <div className="bg-white rounded-lg border border-gray-200 px-2 py-1.5 space-y-1">
                              <div className="flex items-baseline gap-1 text-xs whitespace-nowrap min-w-0 overflow-hidden">
                                <span className="font-semibold text-gray-600 flex-shrink-0">Статус:</span>
                                <span className="text-gray-900 truncate">
                                  {contract.status ? (
                                    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                                      contract.status === 'Подписан' ? 'bg-green-100 text-green-800'
                                      : contract.status === 'Проект' ? 'bg-gray-100 text-gray-800'
                                      : contract.status === 'На согласовании' ? 'bg-yellow-100 text-yellow-800'
                                      : contract.status === 'На регистрации' ? 'bg-blue-100 text-blue-800'
                                      : contract.status === 'Не согласован' ? 'bg-red-100 text-red-800'
                                      : 'bg-gray-100 text-gray-800'
                                    }`}>
                                      {contract.status}
                                    </span>
                                  ) : '-'}
                                </span>
                              </div>
                              <div className="flex items-baseline gap-1 text-xs whitespace-nowrap min-w-0 overflow-hidden">
                                <span className="font-semibold text-gray-600 flex-shrink-0">Сумма:</span>
                                <span className="text-gray-900 truncate">
                                  {contract.budgetAmount ? (
                                    <span className="flex items-center">
                                      {new Intl.NumberFormat('ru-RU', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(contract.budgetAmount)}
                                      {getCurrencyIcon(contract.currency)}
                                    </span>
                                  ) : '-'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="min-w-0">
                            <div className="bg-white rounded-lg shadow-md p-0.5 min-w-0 overflow-hidden">
                              <div className="flex flex-wrap items-baseline gap-2 pb-px mb-px border-b border-gray-200">
                                <div className="inline-flex items-baseline gap-1.5 px-2 py-0.5 rounded bg-gray-200">
                                  <span className="text-xs font-semibold text-gray-700">Договорник:</span>
                                  <span className="text-xs text-gray-900 truncate" title={contract.preparedBy ?? undefined}>{contract.preparedBy || '-'}</span>
                                </div>
                                <div className="inline-flex items-baseline gap-1.5 px-2 py-0.5 rounded bg-gray-200">
                                  <span className="text-xs font-semibold text-gray-700">Дата создания договора:</span>
                                  <span className="text-xs text-gray-900">{contract.contractCreationDate ? formatDate(contract.contractCreationDate) : '-'}</span>
                                </div>
                              </div>
                              <div className="space-y-0 min-w-0">
                                {list.length > 0 ? (
                                  stageOrder.map((stage) => {
                                    const stageItems = list.filter((a) => (a.stage || 'Без этапа') === stage);
                                    return (
                                      <div key={stage} className="py-px mb-px border-b border-gray-200 last:border-b-0 last:mb-0 last:pb-0 first:pt-0">
                                        <div className="text-[10px] font-semibold text-gray-900 mb-px leading-tight">{stage}</div>
                                        <table className="w-full border-collapse min-w-0 table-fixed">
                                          <colgroup>
                                            <col style={{ width: '33%' }} />
                                            <col style={{ width: '17%' }} />
                                            <col style={{ width: '13%' }} />
                                            <col style={{ width: '13%' }} />
                                            <col style={{ width: '10%' }} />
                                          </colgroup>
                                          <thead>
                                            <tr className="border-b border-gray-200">
                                              <th className="pl-0 pr-0.5 py-px text-left text-[9px] font-semibold text-gray-500 uppercase min-w-0"></th>
                                              <th className="px-0.5 py-px text-left text-[9px] font-semibold text-gray-500 uppercase truncate min-w-0">ФИО</th>
                                              <th className="px-0.5 py-px text-left text-[9px] font-semibold text-gray-500 uppercase whitespace-nowrap min-w-[4rem]">Назначено</th>
                                              <th className="px-0.5 py-px text-left text-[9px] font-semibold text-gray-500 uppercase whitespace-nowrap min-w-[4rem]">Выполнено</th>
                                              <th className="px-0.5 py-px text-left text-[9px] font-semibold text-gray-500 uppercase whitespace-nowrap min-w-[2.5rem]">Дней</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {stageItems.map((approval) => {
                                              const hasAssignment = approval.assignmentDate != null && String(approval.assignmentDate).trim() !== '';
                                              const statusColor = getApprovalStatusColor({ ...approval, daysInWork: null, idPurchaseRequest: purchaseRequest.idPurchaseRequest ?? 0 });
                                              const StatusIcon = !hasAssignment
                                                ? () => <div className="w-3 h-3 flex-shrink-0 rounded-full bg-gray-300 flex items-center justify-center" title="Не назначено" />
                                                : statusColor === 'green'
                                                ? () => <div className="w-3 h-3 flex-shrink-0 rounded-full bg-green-500 flex items-center justify-center" title={approval.completionResult || 'Согласовано'}><Check className="w-2 h-2 text-white" /></div>
                                                : statusColor === 'orange'
                                                ? () => <div className="w-3 h-3 flex-shrink-0 rounded-full bg-orange-500 flex items-center justify-center" title={approval.completionResult || 'Согласовано с замечаниями'}><Check className="w-2 h-2 text-white" /></div>
                                                : statusColor === 'yellow'
                                                ? () => <div className="w-3 h-3 flex-shrink-0 rounded-full bg-yellow-500 flex items-center justify-center animate-yellow-circle-pulse-fast" title={approval.completionResult || 'В процессе'}><Clock className="w-2 h-2 text-white" /></div>
                                                : () => <div className="w-3 h-3 flex-shrink-0 rounded-full bg-red-500 flex items-center justify-center" title={approval.completionResult || 'Не согласовано'}><X className="w-2 h-2 text-white" /></div>;
                                              const hasComment = approval.commentText != null && String(approval.commentText).trim() !== '';
                                              return (
                                                <tr key={approval.id} className="border-b border-gray-200 last:border-b-0">
                                                  <td className="pl-0 pr-0.5 py-px align-middle">
                                                    <div className="flex items-center gap-0.5 min-w-0">
                                                      <StatusIcon />
                                                      <span className="text-[10px] text-gray-900 break-words min-w-0 truncate" title={approval.role}>{approval.role || '-'}</span>
                                                      {hasComment && (
                                                        <span className="relative inline-flex flex-shrink-0" data-comment-popover>
                                                          <button type="button" onClick={(e) => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); const popoverW = 360; const left = Math.max(16, Math.min(rect.left, (typeof window !== 'undefined' ? window.innerWidth : 400) - popoverW - 16)); setCommentPopoverData(prev => prev?.id === approval.id ? null : { id: approval.id, commentText: approval.commentText ?? '', left, top: rect.top }); }} className="p-0.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700" title="Комментарий" aria-label="Показать комментарий">
                                                            <MessageSquare className="w-3 h-3" />
                                                          </button>
                                                        </span>
                                                      )}
                                                    </div>
                                                  </td>
                                                  <td className="px-0.5 py-px text-[10px] text-gray-900 truncate min-w-0" title={approval.executorName ?? ''}>{approval.executorName || '-'}</td>
                                                  <td className="px-0.5 py-px text-[10px] text-gray-900 whitespace-nowrap">{formatDate(approval.assignmentDate)}</td>
                                                  <td className="px-0.5 py-px text-[10px] text-gray-900 whitespace-nowrap">{formatDate(approval.completionDate)}</td>
                                                  <td className="px-0.5 py-px align-middle">
                                                    <span className="inline-block min-w-[1.75rem] px-1 py-px text-[10px] text-gray-700 text-center rounded bg-gray-200 font-medium">
                                                      {calculateContractApprovalWorkingDays(approval.assignmentDate, approval.completionDate)}
                                                    </span>
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div className="text-[10px] text-gray-500 text-center py-0">Нет данных</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-1 text-xs text-gray-500">
                      <p>Нет данных о договоре</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            ) : null;
            })()}

            {/* Раздел: Договор — сетка как у Заявка/Закупка, колонка согласований minmax(32rem,36rem) */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="px-2 py-1 border-b border-gray-300 bg-gray-100">
                <span className="text-sm font-semibold text-gray-700">Договор</span>
              </div>
              <div className="p-1.5">
                {/* Для закупок с несколькими договорами: каждая строка = договор + Договорник + согласования (блоки начинаются на уровне своего договора) */}
                {(purchaseRequest.requiresPurchase === true || purchaseRequest.requiresPurchase === null) && purchaseRequest.contracts && purchaseRequest.contracts.length > 0 ? (
                  <div className="space-y-1.5">
                    {(purchaseRequest.contracts ?? []).map((contract) => {
                      const list = contractApprovalsByContractId[contract.id] ?? [];
                      const stages = [...new Set(list.map((a) => a.stage || 'Без этапа'))];
                      const stageOrder = getContractSpecStageOrder(stages);
                      return (
                        <div key={contract.id} className={`grid grid-cols-1 lg:grid-cols-[1fr_auto_minmax(32rem,36rem)] gap-x-1.5 gap-y-1 items-start ${contract.excludedFromStatusCalculation ? 'opacity-50' : ''}`}>
                          <div className="min-w-0 w-full lg:min-w-[18rem]">
                            <div className="relative border border-gray-200 rounded p-1.5 min-w-0">
                              <button type="button" className="absolute top-1 right-1 p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700" onClick={() => setContractExclusionModal(contract)} title={contract.excludedFromStatusCalculation ? 'Включить в расчёт статуса заявки' : 'Исключить из расчёта статуса заявки'}>
                                {contract.excludedFromStatusCalculation ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-1 min-w-0">
                                <div className="min-w-0"><label className="block text-xs font-semibold text-gray-600 mb-0">Внутренний ID</label><p className="text-xs text-gray-900 truncate" title={contract.innerId ?? undefined}>{contract.innerId || '-'}</p></div>
                                <div className="min-w-0"><label className="block text-xs font-semibold text-gray-600 mb-0">Наименование</label><p className="text-xs text-gray-900 truncate" title={contract.name ?? undefined}>{contract.name || '-'}</p></div>
                                <div className="min-w-0"><label className="block text-xs font-semibold text-gray-600 mb-0">ЦФО</label><p className="text-xs text-gray-900 truncate" title={contract.cfo ?? undefined}>{contract.cfo || '-'}</p></div>
                              </div>
                            </div>
                          </div>
                          <div className="flex-shrink-0 w-full lg:w-auto">
                            <div className="bg-white rounded-lg border border-gray-200 px-2 py-1.5 space-y-1">
                              <div className="flex items-baseline gap-1 text-xs whitespace-nowrap min-w-0 overflow-hidden">
                                <span className="font-semibold text-gray-600 flex-shrink-0">Статус:</span>
                                <span className="text-gray-900 truncate">
                                  {contract.status ? (
                                    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${(contract.status === 'Подписан' || contract.status === 'SIGNED') ? 'bg-green-100 text-green-800' : (contract.status === 'Проект' || contract.status === 'PROJECT') ? 'bg-gray-100 text-gray-800' : contract.status === 'На согласовании' ? 'bg-yellow-100 text-yellow-800' : (contract.status === 'На регистрации' || contract.status === 'ON_REGISTRATION') ? 'bg-blue-100 text-blue-800' : contract.status === 'Не согласован' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                                      {contract.status}
                                    </span>
                                  ) : '-'}
                                </span>
                              </div>
                              <div className="flex items-baseline gap-1 text-xs whitespace-nowrap min-w-0 overflow-hidden">
                                <span className="font-semibold text-gray-600 flex-shrink-0">Сумма:</span>
                                <span className="text-gray-900 truncate">
                                  {contract.budgetAmount ? (
                                    <span className="flex items-center">
                                      {new Intl.NumberFormat('ru-RU', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(contract.budgetAmount)}
                                      {getCurrencyIcon(contract.currency)}
                                    </span>
                                  ) : '-'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="min-w-0">
                            <div className="bg-white rounded-lg shadow-md p-0.5 min-w-0 overflow-hidden">
                              <div className="flex flex-wrap items-baseline gap-2 pb-px mb-px border-b border-gray-200">
                                <div className="inline-flex items-baseline gap-1.5 px-2 py-0.5 rounded bg-gray-200">
                                  <span className="text-xs font-semibold text-gray-700">Договорник:</span>
                                  <span className="text-xs text-gray-900 truncate" title={contract.preparedBy ?? undefined}>{contract.preparedBy || '-'}</span>
                                </div>
                                <div className="inline-flex items-baseline gap-1.5 px-2 py-0.5 rounded bg-gray-200">
                                  <span className="text-xs font-semibold text-gray-700">Дата создания договора:</span>
                                  <span className="text-xs text-gray-900">{contract.contractCreationDate ? formatDate(contract.contractCreationDate) : '-'}</span>
                                </div>
                              </div>
                              <div className="space-y-0 min-w-0">
                                {list.length > 0 ? stageOrder.map((stage) => {
                                  const stageItems = list.filter((a) => (a.stage || 'Без этапа') === stage);
                                  return (
                                    <div key={stage} className="py-px mb-px border-b border-gray-200 last:border-b-0 last:mb-0 last:pb-0 first:pt-0">
                                      <div className="text-[10px] font-semibold text-gray-900 mb-px leading-tight">{stage}</div>
                                      <table className="w-full border-collapse min-w-0 table-fixed">
                                        <colgroup><col style={{ width: '29%' }} /><col style={{ width: '17%' }} /><col style={{ width: '13%' }} /><col style={{ width: '13%' }} /><col style={{ width: '10%' }} /></colgroup>
                                        <thead>
                                          <tr className="border-b border-gray-200">
                                            <th className="pl-0 pr-0.5 py-px text-left text-[9px] font-semibold text-gray-500 uppercase min-w-0"></th>
                                            <th className="px-0.5 py-px text-left text-[9px] font-semibold text-gray-500 uppercase truncate min-w-0">ФИО</th>
                                            <th className="px-0.5 py-px text-left text-[9px] font-semibold text-gray-500 uppercase whitespace-nowrap min-w-[4rem]">Назначено</th>
                                            <th className="px-0.5 py-px text-left text-[9px] font-semibold text-gray-500 uppercase whitespace-nowrap min-w-[4rem]">Выполнено</th>
                                            <th className="px-0.5 py-px text-left text-[9px] font-semibold text-gray-500 uppercase whitespace-nowrap min-w-[2.5rem]">Дней</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {stageItems.map((approval) => {
                                            const hasAssignment = approval.assignmentDate != null && String(approval.assignmentDate).trim() !== '';
                                            const statusColor = getApprovalStatusColor({ ...approval, daysInWork: null, idPurchaseRequest: purchaseRequest.idPurchaseRequest ?? 0 });
                                            const StatusIcon = !hasAssignment ? () => <div className="w-3 h-3 flex-shrink-0 rounded-full bg-gray-300 flex items-center justify-center" title="Не назначено" /> : statusColor === 'green' ? () => <div className="w-3 h-3 flex-shrink-0 rounded-full bg-green-500 flex items-center justify-center" title={approval.completionResult || 'Согласовано'}><Check className="w-2 h-2 text-white" /></div> : statusColor === 'orange' ? () => <div className="w-3 h-3 flex-shrink-0 rounded-full bg-orange-500 flex items-center justify-center" title={approval.completionResult || 'Согласовано с замечаниями'}><Check className="w-2 h-2 text-white" /></div> : statusColor === 'yellow' ? () => <div className="w-3 h-3 flex-shrink-0 rounded-full bg-yellow-500 flex items-center justify-center animate-yellow-circle-pulse-fast" title={approval.completionResult || 'В процессе'}><Clock className="w-2 h-2 text-white" /></div> : () => <div className="w-3 h-3 flex-shrink-0 rounded-full bg-red-500 flex items-center justify-center" title={approval.completionResult || 'Не согласовано'}><X className="w-2 h-2 text-white" /></div>;
                                            const hasComment = approval.commentText != null && String(approval.commentText).trim() !== '';
                                            return (
                                              <tr key={approval.id} className="border-b border-gray-200 last:border-b-0">
                                                <td className="pl-0 pr-0.5 py-px align-middle">
                                                  <div className="flex items-center gap-0.5 min-w-0">
                                                    <StatusIcon />
                                                    <span className="text-[10px] text-gray-900 break-words min-w-0 truncate" title={approval.role}>{approval.role || '-'}</span>
                                                    {hasComment && (<span className="relative inline-flex flex-shrink-0" data-comment-popover><button type="button" onClick={(e) => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); const popoverW = 360; const left = Math.max(16, Math.min(rect.left, (typeof window !== 'undefined' ? window.innerWidth : 400) - popoverW - 16)); setCommentPopoverData(prev => prev?.id === approval.id ? null : { id: approval.id, commentText: approval.commentText ?? '', left, top: rect.top }); }} className="p-0.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700" title="Комментарий" aria-label="Показать комментарий"><MessageSquare className="w-3 h-3" /></button></span>)}
                                                  </div>
                                                </td>
                                                <td className="px-0.5 py-px text-[10px] text-gray-900 truncate min-w-0" title={approval.executorName ?? ''}>{approval.executorName || '-'}</td>
                                                <td className="px-0.5 py-px text-[10px] text-gray-900 whitespace-nowrap">{formatDate(approval.assignmentDate)}</td>
                                                <td className="px-0.5 py-px text-[10px] text-gray-900 whitespace-nowrap">{formatDate(approval.completionDate)}</td>
                                                <td className="px-0.5 py-px align-middle">
                                                  <span className="inline-block min-w-[1.75rem] px-1 py-px text-[10px] text-gray-700 text-center rounded bg-gray-200 font-medium">
                                                    {calculateContractApprovalWorkingDays(approval.assignmentDate, approval.completionDate)}
                                                  </span>
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  );
                                }) : <div className="text-[10px] text-gray-500 text-center py-0">Нет данных</div>}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_minmax(32rem,36rem)] gap-x-1.5 gap-y-1 items-start">
                  <div className="min-w-0 w-full lg:min-w-[18rem]">
                    {/* Для заказов показываем основной договор, если договор является спецификацией */}
                    {purchaseRequest.requiresPurchase === false && purchaseRequest.contracts && purchaseRequest.contracts.length > 0 && purchaseRequest.contracts.some(c => c.parentContract) ? (
                      <div className="w-full min-w-0">
                        {/* Содержимое: основной договор и спецификации — занимают всю ширину колонки */}
                      <div className="flex flex-col lg:flex-row gap-2 items-stretch w-full min-w-0">
                        {/* Основной договор слева */}
                          <div className="flex-shrink-0 w-full lg:w-auto lg:min-w-0">
                            <div className="mb-1">
                              <label className="block text-xs font-semibold text-gray-600">
                                Основной договор
                              </label>
                            </div>
                          {purchaseRequest.contracts
                            .filter(contract => contract.parentContract)
                            .map((contract) => (
                              <div key={contract.id} className="bg-white rounded-lg shadow-md p-1.5">
                                  <div className="space-y-1">
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
                                      ЦФО
                                    </label>
                                    <p className="text-xs text-gray-900">
                                      {contract.parentContract!.cfo || '-'}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-0">
                                      Сумма договора
                                    </label>
                                    <p className="text-xs text-gray-900">
                                      {contract.parentContract!.budgetAmount ? new Intl.NumberFormat('ru-RU', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(contract.parentContract!.budgetAmount) : '-'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                        
                        {/* Спецификации справа в виде таблицы — растягивается на всё оставшееся место */}
                        <div className="flex-1 min-w-0 w-full">
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
                              <div className="w-full min-w-0">
                                <div className="mb-1 flex items-center justify-between">
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
                                <div className="bg-white rounded-lg shadow-md p-2 min-w-0">
                                <div className="overflow-x-auto w-full min-w-0">
                                  <table className="w-full text-[10px] border-collapse" style={{ tableLayout: 'fixed', width: '100%', minWidth: '100%' }}>
                                    <thead>
                                      <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="text-left py-1 px-2 font-semibold text-gray-600 border-r border-gray-200" style={{ width: '12%' }}>Внутренний ID</th>
                                        <th className="text-left py-1 px-2 font-semibold text-gray-600 border-r border-gray-200" style={{ width: '34%' }}>Наименование</th>
                                        <th className="text-left py-1 px-2 font-semibold text-gray-600 border-r border-gray-200" style={{ width: '12%' }}>Статус</th>
                                        <th className="text-left py-1 px-2 font-semibold text-gray-600 border-r border-gray-200" style={{ width: '10%' }}>ЦФО</th>
                                        <th className="text-left py-1 px-2 font-semibold text-gray-600 border-r border-gray-200" style={{ width: '15%' }}>Дата создания</th>
                                        <th className="text-right py-1 px-2 font-semibold text-gray-600" style={{ width: '17%' }}>Сумма</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(isSpecificationsExpanded ? sortedSpecs : sortedSpecs.slice(0, 5)).map((spec) => (
                                        <tr key={spec.id} className="border-b border-gray-100 hover:bg-gray-50">
                                          <td className="py-1 px-2 text-gray-900 border-r border-gray-100">{spec.innerId || '-'}</td>
                                          <td className="py-1 px-2 text-gray-900 border-r border-gray-100">{spec.name || '-'}</td>
                                          <td className="py-1 px-2 text-gray-900 border-r border-gray-100">
                                            {spec.status ? (
                                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                                spec.status === 'Подписан' 
                                                  ? 'bg-green-100 text-green-800' 
                                                  : spec.status === 'Проект'
                                                  ? 'bg-gray-100 text-gray-800'
                                                  : 'bg-blue-100 text-blue-800'
                                              }`}>
                                                {spec.status}
                                              </span>
                                            ) : '-'}
                                          </td>
                                          <td className="py-1 px-2 text-gray-900 border-r border-gray-100">{spec.cfo || '-'}</td>
                                          <td className="py-1 px-2 text-gray-900 border-r border-gray-100">
                                            {spec.contractCreationDate ? new Date(spec.contractCreationDate).toLocaleDateString('ru-RU') : '-'}
                                          </td>
                                          <td className="py-1 px-2 text-gray-900 text-right">
                                            {spec.budgetAmount ? new Intl.NumberFormat('ru-RU', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(spec.budgetAmount) : '-'}
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
                    ) : (purchaseRequest.requiresPurchase === true || purchaseRequest.requiresPurchase === null) ? (
                      // Для закупок показываем сообщение, если нет договоров
                      <div className="text-center py-1 text-xs text-gray-500">
                        <p>Нет данных о договоре</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
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
                </div>
                )}
              </div>
            </div>

          </div>
        </main>

        {/* Модальное окно: исключение договора из расчёта статуса заявки */}
        {contractExclusionModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setContractExclusionModal(null)}
          >
            <div
              className="bg-white rounded-lg shadow-xl p-4 max-w-md w-full mx-2 text-gray-900"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-semibold mb-3">Исключение договора из расчёта статуса заявки</h3>
              <p className="text-xs text-gray-600 mb-2">
                Договоры и спецификации с включённым исключением не учитываются при определении статусов «Договор подписан» и «Спецификация подписана».
              </p>
              <label className="flex items-center gap-2 mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={exclusionForm.excludedFromStatusCalculation}
                  onChange={(e) => setExclusionForm((prev) => ({ ...prev, excludedFromStatusCalculation: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">Исключить из расчёта статуса заявки</span>
              </label>
              <label className="block mb-3">
                <span className="block text-xs font-medium text-gray-700 mb-1">Комментарий исключения</span>
                <textarea
                  value={exclusionForm.exclusionComment}
                  onChange={(e) => setExclusionForm((prev) => ({ ...prev, exclusionComment: e.target.value }))}
                  className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Причина исключения (необязательно)"
                />
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setContractExclusionModal(null)}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleSaveContractExclusion}
                  disabled={isSavingExclusion}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSavingExclusion ? 'Сохранение…' : 'Сохранить'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Попап комментария согласования — рендер в портале, чтобы не обрезался таблицей */}
        {commentPopoverData && typeof document !== 'undefined' && createPortal(
          <div
            data-comment-popover-portal
            className="fixed z-[100] min-w-[200px] max-w-[360px] rounded-lg border border-gray-200 bg-white shadow-lg p-2"
            style={{
              left: commentPopoverData.left,
              top: commentPopoverData.top - 8,
              transform: 'translateY(-100%)',
            }}
          >
            <div className="flex items-start gap-1">
              <div className="flex-1 min-w-0 max-h-[50vh] overflow-y-auto">
                <p className="text-[10px] text-gray-900 break-words whitespace-pre-wrap">{commentPopoverData.commentText}</p>
              </div>
              <button type="button" onClick={() => setCommentPopoverData(null)} className="p-0.5 rounded hover:bg-gray-200 flex-shrink-0" aria-label="Закрыть">
                <X className="w-3 h-3 text-gray-500" />
              </button>
            </div>
            <button type="button" onClick={() => { copyToClipboard(commentPopoverData.commentText); }} className="mt-1.5 w-full flex items-center justify-center gap-1 py-1 px-2 text-[10px] font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded border border-gray-200">
              <Copy className="w-3 h-3" />
              Скопировать в буфер
            </button>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}

