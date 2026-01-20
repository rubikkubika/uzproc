import { useState, useRef, useEffect, useCallback } from 'react';
import { getBackendUrl } from '@/utils/api';
import { PurchasePlanItem, PageResponse } from '../types/purchase-plan-items.types';
import { calculateNewContractDate } from '../utils/date.utils';

export const usePurchasePlanItemsEditing = (
  data: PageResponse | null,
  setData: (data: PageResponse | null) => void,
  setAllItems: React.Dispatch<React.SetStateAction<PurchasePlanItem[]>>,
  setChartData: React.Dispatch<React.SetStateAction<PurchasePlanItem[]>>,
  setSummaryData: React.Dispatch<React.SetStateAction<PurchasePlanItem[]>>,
  cfoFilter: Set<string>,
  pageSize: number,
  // Дополнительные зависимости для функций обновления
  uniqueValues?: Record<string, string[]>,
  setUniqueValues?: React.Dispatch<React.SetStateAction<Record<string, string[]>>>,
  newItemData?: Partial<PurchasePlanItem>,
  setNewItemData?: React.Dispatch<React.SetStateAction<Partial<PurchasePlanItem>>>,
  setIsCreateModalOpen?: (open: boolean) => void,
  setErrorModal?: (modal: { isOpen: boolean; message: string }) => void,
  selectedYear?: number | null,
  fetchData?: (
    page: number,
    size: number,
    year: number | null,
    sortField: any,
    sortDirection: any,
    filters: Record<string, string>,
    months: Set<number>
  ) => Promise<void>,
  currentPage?: number,
  sortField?: any,
  sortDirection?: any,
  filters?: Record<string, string>,
  selectedMonths?: Set<number>
) => {
  const [tempDates, setTempDates] = useState<Record<number, { requestDate: string | null; newContractDate: string | null }>>({});
  const [animatingDates, setAnimatingDates] = useState<Record<number, boolean>>({});
  
  const [editingDate, setEditingDate] = useState<{ itemId: number; field: 'requestDate' } | null>(null);
  const [editingStatus, setEditingStatus] = useState<number | null>(null);
  const statusSelectRef = useRef<HTMLSelectElement | null>(null);
  const [editingHolding, setEditingHolding] = useState<number | null>(null);
  const holdingSelectRef = useRef<HTMLSelectElement | null>(null);
  const [editingPurchaserCompany, setEditingPurchaserCompany] = useState<number | null>(null);
  const purchaserCompanySelectRef = useRef<HTMLSelectElement | null>(null);
  const [editingCfo, setEditingCfo] = useState<number | null>(null);
  const [creatingNewCfo, setCreatingNewCfo] = useState<number | null>(null);
  const cfoSelectRef = useRef<HTMLSelectElement | null>(null);
  const cfoInputRef = useRef<HTMLInputElement | null>(null);
  const [cfoInputValue, setCfoInputValue] = useState<Record<number, string>>({});
  const [editingPurchaseRequestId, setEditingPurchaseRequestId] = useState<number | null>(null);
  const purchaseRequestIdInputRef = useRef<HTMLInputElement | null>(null);
  const [editingPurchaseSubject, setEditingPurchaseSubject] = useState<number | null>(null);
  const purchaseSubjectInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [editingPurchaser, setEditingPurchaser] = useState<number | null>(null);
  const [availablePurchasers, setAvailablePurchasers] = useState<Array<{ id: number; name: string }>>([]);
  
  // Загружаем список пользователей при монтировании компонента
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await fetch(`${getBackendUrl()}/api/users?page=0&size=1000`);
        if (response.ok) {
          const data = await response.json();
          const users = data.content.map((user: any) => ({
            id: user.id,
            name: user.surname && user.name 
              ? `${user.surname} ${user.name}` 
              : user.username || 'Пользователь'
          }));
          setAvailablePurchasers(users);
        }
      } catch (error) {
        console.error('Ошибка загрузки пользователей:', error);
      }
    };
    loadUsers();
  }, []);

  // Автоматически открываем календарь при появлении input
  useEffect(() => {
    if (editingDate) {
      setTimeout(() => {
        const activeInput = document.querySelector(
          `input[type="date"][data-editing-date="${editingDate.itemId}-${editingDate.field}"]`
        ) as HTMLInputElement;
        
        if (activeInput) {
          if ('showPicker' in activeInput && typeof (activeInput as any).showPicker === 'function') {
            try {
              (activeInput as any).showPicker();
            } catch (e) {
              activeInput.click();
            }
          } else {
            activeInput.click();
          }
        }
      }, 10);
    }
  }, [editingDate]);

  const performGanttDateUpdate = async (itemId: number, requestDate: string | null, newContractDate: string | null) => {
    const item = data?.content.find(i => i.id === itemId);
    if (!item) return;
    
    const oldRequestDate = item.requestDate;
    const oldNewContractDate = item.newContractDate;
    
    try {
      let normalizedRequestDate = requestDate ? requestDate.split('T')[0] : null;
      let normalizedNewContractDate = newContractDate ? newContractDate.split('T')[0] : null;
      
      if (normalizedRequestDate && item.complexity && requestDate !== item.requestDate) {
        const calculatedDate = calculateNewContractDate(normalizedRequestDate, item.complexity);
        if (calculatedDate) {
          normalizedNewContractDate = calculatedDate;
        }
      }
      
      const response = await fetch(`${getBackendUrl()}/api/purchase-plan-items/${itemId}/dates`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestDate: normalizedRequestDate,
          newContractDate: normalizedNewContractDate,
        }),
      });

      if (response.ok) {
        const updatedItem = await response.json();
        setAllItems(prev => {
          const updated = prev.map(i => 
            i.id === itemId 
              ? { ...i, requestDate: updatedItem.requestDate, newContractDate: updatedItem.newContractDate }
              : i
          );
          if (data) {
            setData({ ...data, content: updated });
          }
          return updated;
        });
        setChartData(prev => {
          if (!prev) return prev;
          return prev.map(i => 
            i.id === itemId 
              ? { ...i, requestDate: updatedItem.requestDate, newContractDate: updatedItem.newContractDate }
              : i
          );
        });
        setSummaryData(prev => {
          if (!prev) return prev;
          return prev.map(i => 
            i.id === itemId 
              ? { ...i, requestDate: updatedItem.requestDate, newContractDate: updatedItem.newContractDate }
              : i
          );
        });
        window.dispatchEvent(new CustomEvent('purchasePlanItemDatesUpdated', {
          detail: { itemId, requestDate: updatedItem.requestDate, newContractDate: updatedItem.newContractDate }
        }));
        setTempDates(prev => {
          const newTemp = { ...prev };
          delete newTemp[itemId];
          return newTemp;
        });
        setTimeout(() => {
          setAnimatingDates(prev => {
            const newAnimating = { ...prev };
            delete newAnimating[itemId];
            return newAnimating;
          });
        }, 500);
      } else {
        const errorText = await response.text();
        setAllItems(prev => {
          const updated = prev.map(i => 
            i.id === itemId 
              ? { 
                  ...i, 
                  requestDate: oldRequestDate, 
                  newContractDate: oldNewContractDate 
                }
              : i
          );
          if (data) {
            setData({ ...data, content: updated });
          }
          return updated;
        });
      }
    } catch (error) {
      setAllItems(prev => {
        const updated = prev.map(i => 
          i.id === itemId 
            ? { 
                ...i, 
                requestDate: oldRequestDate, 
                newContractDate: oldNewContractDate 
              }
            : i
        );
        if (data) {
          setData({ ...data, content: updated });
        }
        return updated;
      });
    }
  };

  const performDateUpdate = async (itemId: number, field: 'requestDate' | 'newContractDate', newDate: string) => {
    if (!newDate || newDate.trim() === '') return;
    
    try {
      const item = data?.content.find(i => i.id === itemId);
      if (!item) return;
      
      const normalizedDate = newDate.split('T')[0];
      
      const currentRequestDate = item.requestDate ? item.requestDate.split('T')[0] : null;
      const currentNewContractDate = item.newContractDate ? item.newContractDate.split('T')[0] : null;
      
      let requestDate = field === 'requestDate' ? normalizedDate : currentRequestDate;
      let newContractDate = field === 'newContractDate' ? normalizedDate : currentNewContractDate;
      
      if (field === 'requestDate' && item.complexity) {
        const calculatedDate = calculateNewContractDate(normalizedDate, item.complexity);
        if (calculatedDate) {
          newContractDate = calculatedDate;
        }
      }
      
      const response = await fetch(`${getBackendUrl()}/api/purchase-plan-items/${itemId}/dates`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestDate,
          newContractDate,
        }),
      });

      if (response.ok) {
        const updatedItem = await response.json();
        setAllItems(prev => {
          const updated = prev.map(i => 
            i.id === itemId 
              ? { ...i, requestDate: updatedItem.requestDate, newContractDate: updatedItem.newContractDate }
              : i
          );
          if (data) {
            setData({ ...data, content: updated });
          }
          return updated;
        });
        setChartData(prev => {
          if (!prev) return prev;
          return prev.map(i => 
            i.id === itemId 
              ? { ...i, requestDate: updatedItem.requestDate, newContractDate: updatedItem.newContractDate }
              : i
          );
        });
        setSummaryData(prev => {
          if (!prev) return prev;
          return prev.map(i => 
            i.id === itemId 
              ? { ...i, requestDate: updatedItem.requestDate, newContractDate: updatedItem.newContractDate }
              : i
          );
        });
        window.dispatchEvent(new CustomEvent('purchasePlanItemDatesUpdated', {
          detail: { itemId, requestDate: updatedItem.requestDate, newContractDate: updatedItem.newContractDate }
        }));
        setAnimatingDates(prev => ({
          ...prev,
          [itemId]: true
        }));
        setTimeout(() => {
          setAnimatingDates(prev => {
            const newState = { ...prev };
            delete newState[itemId];
            return newState;
          });
        }, 1000);
        setEditingDate(null);
      }
    } catch (error) {
      // Ошибка обновления даты игнорируется
    }
  };

  const handleDateUpdate = (itemId: number, field: 'requestDate', newDate: string) => {
    if (!newDate || newDate.trim() === '') return;
    performDateUpdate(itemId, field, newDate);
  };

  // Функция для обновления статуса
  const handleStatusUpdate = async (itemId: number, newStatus: string) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/purchase-plan-items/${itemId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (response.ok) {
        const updatedItem = await response.json();
        // Обновляем данные в таблице
        setAllItems(prev => {
          const updated = prev.map(i => 
            i.id === itemId 
              ? { ...i, status: updatedItem.status }
              : i
          );
          if (data) {
            setData({ ...data, content: updated });
          }
          return updated;
        });
        // Обновляем данные для диаграммы в таблице
        setChartData(prev => {
          if (!prev) return prev;
          return prev.map(i => 
            i.id === itemId 
              ? { ...i, status: updatedItem.status }
              : i
          );
        });
        // Обновляем данные для сводной таблицы
        setSummaryData(prev => {
          if (!prev) return prev;
          return prev.map(i => 
            i.id === itemId 
              ? { ...i, status: updatedItem.status }
              : i
          );
        });
        setEditingStatus(null);
      }
    } catch (error) {
      // Ошибка обновления статуса игнорируется
    }
  };

  // Функция для обновления холдинга
  const handleHoldingUpdate = async (itemId: number, newHolding: string) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/purchase-plan-items/${itemId}/holding`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          holding: newHolding || null,
        }),
      });

      if (response.ok) {
        const updatedItem = await response.json();
        // Обновляем данные в таблице
        setAllItems(prev => {
          const updated = prev.map(i => 
            i.id === itemId 
              ? { ...i, holding: updatedItem.holding }
              : i
          );
          if (data) {
            setData({ ...data, content: updated });
          }
          return updated;
        });
        setEditingHolding(null);
      }
    } catch (error) {
      // Ошибка обновления холдинга игнорируется
    }
  };

  // Функция для обновления компании закупщика
  const handlePurchaserCompanyUpdate = async (itemId: number, newPurchaserCompany: string) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/purchase-plan-items/${itemId}/purchaser-company`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ purchaserCompany: newPurchaserCompany || null }),
      });

      if (response.ok) {
        const updatedItem = await response.json();
        
        // Обновляем только конкретную строку в локальном состоянии
        setAllItems(prev => {
          const updated = prev.map(item => 
            item.id === itemId 
              ? { ...item, purchaserCompany: updatedItem.purchaserCompany, updatedAt: updatedItem.updatedAt }
              : item
          );
          return updated;
        });
        
        // Обновляем data если оно существует
        if (data) {
          setData({
            ...data,
            content: data.content.map((item: PurchasePlanItem) => 
              item.id === itemId 
                ? { ...item, purchaserCompany: updatedItem.purchaserCompany, updatedAt: updatedItem.updatedAt }
                : item
            )
          });
        }
        
        // Обновляем сводную таблицу (summaryData)
        setSummaryData(prev => {
          return prev.map(item => 
            item.id === itemId 
              ? { ...item, purchaserCompany: updatedItem.purchaserCompany, updatedAt: updatedItem.updatedAt }
              : item
          );
        });
      } else {
        const errorText = await response.text();
        alert('Ошибка при обновлении компании закупщика: ' + errorText);
      }
    } catch (error) {
      alert('Ошибка при обновлении компании закупщика');
    }
  };

  // Удалено: handleCompanyUpdate - колонка company удалена

  // Функция для обновления ЦФО
  const handleCfoUpdate = async (itemId: number, newCfo: string | null) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/purchase-plan-items/${itemId}/cfo`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cfo: newCfo || null }),
      });

      if (response.ok) {
        const updatedItem = await response.json();
        setEditingCfo(null);
        setCreatingNewCfo(null);
        // Очищаем значение input
        setCfoInputValue(prev => {
          const newValue = { ...prev };
          delete newValue[itemId];
          return newValue;
        });
        
        // Обновляем только конкретную строку в локальном состоянии
        if (data) {
          // Проверяем, подходит ли обновленная строка под фильтр ЦФО
          const normalizedNewCfo = newCfo ? newCfo.trim() : null;
          const shouldShowItem = cfoFilter.size === 0 || (normalizedNewCfo && cfoFilter.has(normalizedNewCfo));
          
          if (shouldShowItem) {
            // Обновляем строку в таблице
            setAllItems(prev => {
              const updated = prev.map(item => 
                item.id === itemId 
                  ? { ...item, cfo: updatedItem.cfo, updatedAt: updatedItem.updatedAt }
                  : item
              );
              if (data) {
                setData({ ...data, content: updated });
              }
              return updated;
            });
          } else {
            // Удаляем строку из отображаемых данных, так как она не подходит под фильтр
            setAllItems(prev => {
              const updated = prev.filter(item => item.id !== itemId);
              const newTotalElements = Math.max(0, (data?.totalElements || 0) - 1);
              const newTotalPages = Math.ceil(newTotalElements / pageSize);
              if (data) {
                setData({ 
                  ...data, 
                  content: updated,
                  totalElements: newTotalElements,
                  totalPages: newTotalPages
                });
              }
              return updated;
            });
          }
        }
        
        // Обновляем данные для диаграммы в таблице
        const normalizedNewCfo = newCfo ? newCfo.trim() : null;
        const shouldShowInChart = cfoFilter.size === 0 || (normalizedNewCfo && cfoFilter.has(normalizedNewCfo));
        
        setChartData(prev => {
          if (!prev) return prev;
          
          if (shouldShowInChart) {
            // Обновляем строку в chartData
            return prev.map(item => 
              item.id === itemId 
                ? { ...item, cfo: updatedItem.cfo, updatedAt: updatedItem.updatedAt }
                : item
            );
          } else {
            // Удаляем строку из chartData, так как она не подходит под фильтр
            return prev.filter(item => item.id !== itemId);
          }
        });
        
        // Обновляем данные для сводной таблицы с учетом фильтра по ЦФО
        const normalizedNewCfoForSummary = newCfo ? newCfo.trim() : null;
        const shouldShowInSummary = cfoFilter.size === 0 || (normalizedNewCfoForSummary && cfoFilter.has(normalizedNewCfoForSummary));
        
        setSummaryData(prev => {
          if (!prev) return prev;
          
          // Проверяем, есть ли запись в summaryData
          const existingItem = prev.find(item => item.id === itemId);
          
          if (shouldShowInSummary) {
            // Если запись должна быть в сводной таблице
            if (existingItem) {
              // Обновляем существующую запись
              return prev.map(item => 
                item.id === itemId 
                  ? { ...item, cfo: updatedItem.cfo, updatedAt: updatedItem.updatedAt }
                  : item
              );
            } else {
              // Добавляем новую запись (если её не было, но теперь она соответствует фильтру)
              // Используем данные из data, если они есть
              const fullItem = data?.content.find(i => i.id === itemId);
              if (fullItem) {
                // Используем полные данные из data и обновляем ЦФО
                return [...prev, { ...fullItem, cfo: updatedItem.cfo, updatedAt: updatedItem.updatedAt }];
              }
              // Если полных данных нет, возвращаем prev (запись будет добавлена при следующей загрузке)
              return prev;
            }
          } else {
            // Если запись больше не должна быть в сводной таблице, удаляем её
            return prev.filter(item => item.id !== itemId);
          }
        });
        
        // Обновляем уникальные значения для фильтра ЦФО
        if (normalizedNewCfo && setUniqueValues && uniqueValues && !uniqueValues.cfo.includes(normalizedNewCfo)) {
          setUniqueValues(prev => ({
            ...prev,
            cfo: [...prev.cfo, normalizedNewCfo].sort((a, b) => a.localeCompare(b, 'ru', { sensitivity: 'base' }))
          }));
        }
      }
    } catch (error) {
      // Ошибка обновления ЦФО игнорируется
    }
  };

  // Функция для обновления закупщика
  const handlePurchaserUpdate = async (itemId: number, newPurchaserId: number | null) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/purchase-plan-items/${itemId}/purchaser`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ purchaser: newPurchaserId || null }),
      });

      if (response.ok) {
        const updatedItem = await response.json();
        
        // Обновляем только конкретную строку в локальном состоянии
        setAllItems(prev => {
          const updated = prev.map(item => 
            item.id === itemId 
              ? { ...item, purchaser: updatedItem.purchaser, updatedAt: updatedItem.updatedAt }
              : item
          );
          return updated;
        });
        
        // Обновляем data если оно существует
        if (data) {
          setData({
            ...data,
            content: data.content.map((item: PurchasePlanItem) => 
              item.id === itemId 
                ? { ...item, purchaser: updatedItem.purchaser, updatedAt: updatedItem.updatedAt }
                : item
            )
          });
        }
        
        // Обновляем сводную таблицу (summaryData)
        setSummaryData(prev => {
          return prev.map(item => 
            item.id === itemId 
              ? { ...item, purchaser: updatedItem.purchaser, updatedAt: updatedItem.updatedAt }
              : item
          );
        });
        
        // Закрываем редактирование с небольшой задержкой, чтобы пользователь увидел изменение
        setTimeout(() => {
          setEditingPurchaser(null);
        }, 100);
      } else {
        const errorText = await response.text();
        alert('Ошибка при обновлении закупщика: ' + errorText);
      }
    } catch (error) {
      alert('Ошибка при обновлении закупщика');
    }
  };

  // Функция для обновления предмета закупки
  const handlePurchaseSubjectUpdate = async (itemId: number, newPurchaseSubject: string) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/purchase-plan-items/${itemId}/purchase-subject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ purchaseSubject: newPurchaseSubject || null }),
      });

      if (response.ok) {
        const updatedItem = await response.json();
        setEditingPurchaseSubject(null);
        
        // Обновляем только конкретную строку в локальном состоянии
        setAllItems(prev => {
          const updated = prev.map(item => 
            item.id === itemId 
              ? { ...item, purchaseSubject: updatedItem.purchaseSubject, updatedAt: updatedItem.updatedAt }
              : item
          );
          if (data) {
            setData({ ...data, content: updated });
          }
          return updated;
        });
      }
    } catch (error) {
      // Ошибка обновления предмета закупки игнорируется
    }
  };

  // Функция для обновления ID заявки на закупку
  const handlePurchaseRequestIdUpdate = async (itemId: number, newPurchaseRequestId: string | null) => {
    try {
      const purchaseRequestIdValue = newPurchaseRequestId && newPurchaseRequestId.trim() !== '' 
        ? parseInt(newPurchaseRequestId.trim(), 10) 
        : null;
      
      if (isNaN(purchaseRequestIdValue as any) && purchaseRequestIdValue !== null) {
        return;
      }

      const response = await fetch(`${getBackendUrl()}/api/purchase-plan-items/${itemId}/purchase-request-id`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ purchaseRequestId: purchaseRequestIdValue }),
      });

      if (response.ok) {
        const updatedItem = await response.json();
        setEditingPurchaseRequestId(null);
        
        // Если есть purchaseRequestId, загружаем группу статуса заявки
        let purchaseRequestStatus: string | null = null;
        if (purchaseRequestIdValue !== null) {
          try {
            const statusResponse = await fetch(`${getBackendUrl()}/api/purchase-requests/by-id-purchase-request/${purchaseRequestIdValue}`);
            if (statusResponse.ok) {
              const purchaseRequest = await statusResponse.json();
              // Используем группу статуса вместо конкретного статуса
              if (purchaseRequest?.statusGroup) {
                purchaseRequestStatus = purchaseRequest.statusGroup;
              }
            }
          } catch (error) {
            // Игнорируем ошибку загрузки статуса
          }
        }
        
        // Обновляем только конкретную строку в локальном состоянии
        setAllItems(prev => {
          const updated = prev.map(item => 
            item.id === itemId 
              ? { 
                  ...item, 
                  purchaseRequestId: updatedItem.purchaseRequestId, 
                  purchaseRequestStatus: purchaseRequestStatus,
                  purchaser: updatedItem.purchaser, // Обновляем закупщика из ответа бэкенда
                  status: updatedItem.status, // Обновляем статус позиции плана
                  updatedAt: updatedItem.updatedAt 
                }
              : item
          );
          if (data) {
            setData({ ...data, content: updated });
          }
          return updated;
        });
        
        // Обновляем сводную таблицу (summaryData) с новым закупщиком
        setSummaryData(prev => {
          return prev.map(item => 
            item.id === itemId 
              ? { 
                  ...item, 
                  purchaseRequestId: updatedItem.purchaseRequestId, 
                  purchaser: updatedItem.purchaser, 
                  status: updatedItem.status,
                  updatedAt: updatedItem.updatedAt 
                }
              : item
          );
        });
      } else {
        const errorText = await response.text();
        // Показываем ошибку пользователю во всплывающем окне
        if (setErrorModal) {
          setErrorModal({ isOpen: true, message: errorText || 'Ошибка при обновлении номера заявки на закупку' });
        }
        // Не закрываем режим редактирования, чтобы пользователь мог исправить значение
        return;
      }
    } catch (error) {
      // Ошибка обновления ID заявки игнорируется
    } finally {
      setEditingPurchaseRequestId(null);
    }
  };

  // Функция для обновления статуса позиций плана при изменении заявки
  const updatePurchaseRequestStatusForItems = useCallback(async (purchaseRequestId: number) => {
    if (!purchaseRequestId) return;
    
    try {
      // Загружаем группу статуса заявки
      const statusResponse = await fetch(`${getBackendUrl()}/api/purchase-requests/by-id-purchase-request/${purchaseRequestId}`);
      if (statusResponse.ok) {
        const purchaseRequest = await statusResponse.json();
        // Используем группу статуса вместо конкретного статуса
        const newStatus = purchaseRequest?.statusGroup || null;
        
        // Обновляем статус для всех позиций плана, связанных с этой заявкой
        setAllItems(prev => {
          const updated = prev.map(item => 
            item.purchaseRequestId === purchaseRequestId
              ? { ...item, purchaseRequestStatus: newStatus }
              : item
          );
          if (data) {
            setData({ ...data, content: updated });
          }
          return updated;
        });
      }
    } catch (error) {
      // Игнорируем ошибку обновления статуса
    }
  }, [setAllItems, data, setData]);

  // Функция для создания нового элемента
  const handleCreateItem = async () => {
    if (!setIsCreateModalOpen || !setErrorModal || !setNewItemData || !newItemData || !fetchData || 
        selectedYear === undefined || currentPage === undefined ||         sortField === undefined || 
        sortDirection === undefined || filters === undefined || selectedMonths === undefined) {
      return;
    }

    try {
      // Подготавливаем данные для отправки
      const dataToSend: any = {
        year: newItemData.year || (selectedYear || (new Date().getFullYear() + 1)),
        company: newItemData.company || null,
        cfo: newItemData.cfo || null,
        purchaseSubject: newItemData.purchaseSubject || null,
        budgetAmount: newItemData.budgetAmount || null,
        requestDate: newItemData.requestDate || null,
        newContractDate: newItemData.newContractDate || null,
        purchaser: newItemData.purchaser || null,
        complexity: newItemData.complexity || null,
        status: newItemData.status || 'Проект',
      };

      const response = await fetch(`${getBackendUrl()}/api/purchase-plan-items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      if (response.ok) {
        const createdItem = await response.json();
        setIsCreateModalOpen(false);
        setNewItemData({
          year: selectedYear || (new Date().getFullYear() + 1),
          company: 'Market',
          status: 'Проект',
          complexity: null,
          requestDate: null,
          newContractDate: null,
        });
        
        // Обновляем данные таблицы
        await fetchData(currentPage, pageSize, selectedYear, sortField, sortDirection, filters, selectedMonths);
      } else {
        const errorText = await response.text();
        setErrorModal({ isOpen: true, message: errorText || 'Ошибка при создании строки плана закупок' });
      }
    } catch (error) {
      if (setErrorModal) {
        setErrorModal({ isOpen: true, message: 'Ошибка при создании строки плана закупок' });
      }
    }
  };

  return {
    tempDates,
    setTempDates,
    animatingDates,
    setAnimatingDates,
    editingDate,
    setEditingDate,
    editingStatus,
    setEditingStatus,
    statusSelectRef,
    editingHolding,
    setEditingHolding,
    holdingSelectRef,
    editingPurchaserCompany,
    setEditingPurchaserCompany,
    purchaserCompanySelectRef,
    editingCfo,
    setEditingCfo,
    creatingNewCfo,
    setCreatingNewCfo,
    cfoSelectRef,
    cfoInputRef,
    cfoInputValue,
    setCfoInputValue,
    editingPurchaseRequestId,
    setEditingPurchaseRequestId,
    purchaseRequestIdInputRef,
    editingPurchaseSubject,
    setEditingPurchaseSubject,
    purchaseSubjectInputRef,
    editingPurchaser,
    setEditingPurchaser,
    availablePurchasers,
    setAvailablePurchasers,
    performGanttDateUpdate,
    performDateUpdate,
    handleDateUpdate,
    handleStatusUpdate,
    handleHoldingUpdate,
    handlePurchaserCompanyUpdate,
    handleCfoUpdate,
    handlePurchaserUpdate,
    handlePurchaseSubjectUpdate,
    handlePurchaseRequestIdUpdate,
    handleCreateItem,
    updatePurchaseRequestStatusForItems,
  };
};
