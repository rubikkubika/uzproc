import { useState, useCallback } from 'react';
import { getBackendUrl } from '@/utils/api';
import { PurchasePlanItem, PurchaseRequest } from '../types/purchase-plan-items.types';

export const usePurchasePlanItemsData = () => {
  const [modalItemData, setModalItemData] = useState<Record<number, {
    data: PurchasePlanItem | null;
    loading: boolean;
  }>>({});
  
  const [changesData, setChangesData] = useState<Record<number, {
    content: any[];
    totalElements: number;
    totalPages: number;
    currentPage: number;
    loading: boolean;
  }>>({});
  
  const [purchaseRequestData, setPurchaseRequestData] = useState<Record<number, {
    data: PurchaseRequest | null;
    loading: boolean;
  }>>({});

  const [commentsData, setCommentsData] = useState<Record<number, {
    content: any[];
    loading: boolean;
  }>>({});

  const fetchComments = useCallback(async (itemId: number, includePrivate: boolean = true, purchaseRequestId?: number | null) => {
    setCommentsData(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], loading: true }
    }));

    try {
      const planUrl = `${getBackendUrl()}/api/purchase-plan-items/${itemId}/comments?includePrivate=${includePrivate}`;
      const [planRes, requestRes] = await Promise.all([
        fetch(planUrl),
        purchaseRequestId != null
          ? fetch(`${getBackendUrl()}/api/purchase-requests/by-id-purchase-request/${purchaseRequestId}/comments`)
          : Promise.resolve(null),
      ]);

      const planComments: any[] = planRes?.ok ? await planRes.json() : [];
      const planWithSource = (planComments || []).map((c: any) => ({
        ...c,
        source: 'plan' as const,
      }));

      let requestComments: any[] = [];
      if (requestRes != null && requestRes.ok) {
        const requestData = await requestRes.json();
        requestComments = (requestData || []).map((c: any) => ({
          id: `pr-${c.id}`,
          text: c.text,
          authorName: c.createdByUserName ?? null,
          createdAt: c.createdAt,
          isPublic: true,
          source: 'request' as const,
          type: c.type,
        }));
      }

      const merged = [...planWithSource, ...requestComments].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setCommentsData(prev => ({
        ...prev,
        [itemId]: {
          content: merged,
          loading: false,
        },
      }));
    } catch (error) {
      setCommentsData(prev => ({
        ...prev,
        [itemId]: { content: [], loading: false },
      }));
    }
  }, []);

  const fetchChanges = useCallback(async (itemId: number, page: number) => {
    setChangesData(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], loading: true }
    }));
    
    try {
      const response = await fetch(`${getBackendUrl()}/api/purchase-plan-items/${itemId}/changes?page=${page}&size=10`);
      if (response.ok) {
        const data = await response.json();
        setChangesData(prev => ({
          ...prev,
          [itemId]: {
            content: data.content || [],
            totalElements: data.totalElements || 0,
            totalPages: data.totalPages || 0,
            currentPage: page,
            loading: false
          }
        }));
      } else {
        setChangesData(prev => ({
          ...prev,
          [itemId]: { ...prev[itemId], loading: false }
        }));
      }
    } catch (error) {
      setChangesData(prev => ({
        ...prev,
        [itemId]: { ...prev[itemId], loading: false }
      }));
    }
  }, []);
  
  const fetchModalItemData = useCallback(async (itemId: number) => {
    setModalItemData(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], loading: true }
    }));
    
    try {
      const response = await fetch(`${getBackendUrl()}/api/purchase-plan-items/${itemId}`);
      if (response.ok) {
        const data = await response.json();
        setModalItemData(prev => ({
          ...prev,
          [itemId]: {
            data: data,
            loading: false
          }
        }));
      } else {
        setModalItemData(prev => ({
          ...prev,
          [itemId]: { data: null, loading: false }
        }));
      }
    } catch (error) {
      setModalItemData(prev => ({
        ...prev,
        [itemId]: { data: null, loading: false }
      }));
    }
  }, []);
  
  const fetchPurchaseRequest = useCallback(async (itemId: number, purchaseRequestId: number, updateStatusCallback?: (status: string | null) => void) => {
    setPurchaseRequestData(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], loading: true }
    }));
    
    try {
      const response = await fetch(`${getBackendUrl()}/api/purchase-requests/by-id-purchase-request/${purchaseRequestId}`);
      if (response.ok) {
        const data = await response.json();
        setPurchaseRequestData(prev => ({
          ...prev,
          [itemId]: {
            data: data,
            loading: false
          }
        }));
        // Обновляем статус в плане закупок, если передан callback
        if (updateStatusCallback && data?.status) {
          updateStatusCallback(data.status);
        }
      } else {
        setPurchaseRequestData(prev => ({
          ...prev,
          [itemId]: { data: null, loading: false }
        }));
      }
    } catch (error) {
      setPurchaseRequestData(prev => ({
        ...prev,
        [itemId]: { data: null, loading: false }
      }));
    }
  }, []);

  return {
    modalItemData,
    changesData,
    purchaseRequestData,
    commentsData,
    fetchChanges,
    fetchModalItemData,
    fetchPurchaseRequest,
    fetchComments,
  };
};
