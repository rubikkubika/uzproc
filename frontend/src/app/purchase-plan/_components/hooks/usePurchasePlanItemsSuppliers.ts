import { useState, useCallback } from 'react';
import { getBackendUrl } from '@/utils/api';
import { PurchasePlanItemSupplier, SupplierOption, SupplierContactDraft } from '../types/purchase-plan-items.types';

/**
 * Хук управления контрагентами (поставщиками), привязанными к позиции плана закупок.
 * Отвечает за: состояние модального окна, загрузку списка, добавление (существующего/нового),
 * удаление привязки и поиск поставщиков в общем справочнике.
 */
export const usePurchasePlanItemsSuppliers = () => {
  // id позиции плана, для которой открыто модальное окно контрагентов
  const [suppliersModalOpen, setSuppliersModalOpen] = useState<number | null>(null);

  // Данные по контрагентам для каждой позиции
  const [suppliersData, setSuppliersData] = useState<Record<number, {
    content: PurchasePlanItemSupplier[];
    loading: boolean;
  }>>({});

  // Загрузка списка контрагентов позиции плана
  const fetchSuppliers = useCallback(async (itemId: number) => {
    setSuppliersData(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], content: prev[itemId]?.content || [], loading: true },
    }));
    try {
      const res = await fetch(`${getBackendUrl()}/api/purchase-plan-items/${itemId}/suppliers`);
      const data: PurchasePlanItemSupplier[] = res.ok ? await res.json() : [];
      setSuppliersData(prev => ({
        ...prev,
        [itemId]: { content: data || [], loading: false },
      }));
      return (data || []).length;
    } catch {
      setSuppliersData(prev => ({
        ...prev,
        [itemId]: { content: [], loading: false },
      }));
      return 0;
    }
  }, []);

  // Привязать существующего поставщика
  const addExistingSupplier = useCallback(async (itemId: number, supplierId: number): Promise<number> => {
    const res = await fetch(`${getBackendUrl()}/api/purchase-plan-items/${itemId}/suppliers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supplierId }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Не удалось добавить контрагента');
    }
    return await fetchSuppliers(itemId);
  }, [fetchSuppliers]);

  // Создать нового поставщика (с карточками контактов) и привязать
  const createSupplier = useCallback(async (
    itemId: number,
    payload: { name?: string; inn?: string; kpp?: string; type?: string; code?: string; contacts?: SupplierContactDraft[] },
  ): Promise<number> => {
    const res = await fetch(`${getBackendUrl()}/api/purchase-plan-items/${itemId}/suppliers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Не удалось создать контрагента');
    }
    return await fetchSuppliers(itemId);
  }, [fetchSuppliers]);

  // Добавить карточку контакта существующему поставщику
  const addContact = useCallback(async (
    itemId: number,
    supplierId: number,
    payload: SupplierContactDraft,
  ): Promise<void> => {
    const res = await fetch(`${getBackendUrl()}/api/suppliers/${supplierId}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Не удалось добавить карточку контакта');
    }
    await fetchSuppliers(itemId);
  }, [fetchSuppliers]);

  // Удалить карточку контакта поставщика
  const removeContact = useCallback(async (
    itemId: number,
    supplierId: number,
    contactId: number,
  ): Promise<void> => {
    const res = await fetch(`${getBackendUrl()}/api/suppliers/${supplierId}/contacts/${contactId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Не удалось удалить карточку контакта');
    }
    await fetchSuppliers(itemId);
  }, [fetchSuppliers]);

  // Удалить привязку контрагента
  const removeSupplier = useCallback(async (itemId: number, linkId: number): Promise<number> => {
    const res = await fetch(`${getBackendUrl()}/api/purchase-plan-items/${itemId}/suppliers/${linkId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Не удалось удалить контрагента');
    }
    return await fetchSuppliers(itemId);
  }, [fetchSuppliers]);

  // Поиск поставщиков в общем справочнике (для выбора существующего)
  const searchSuppliers = useCallback(async (query: string): Promise<SupplierOption[]> => {
    const params = new URLSearchParams();
    params.append('page', '0');
    params.append('size', '20');
    const q = query.trim();
    if (q) {
      // Числовой запрос ищем по ИНН/коду, текстовый — по наименованию
      if (/^\d+$/.test(q)) {
        params.append('inn', q);
      } else {
        params.append('name', q);
      }
    }
    try {
      const res = await fetch(`${getBackendUrl()}/api/suppliers?${params.toString()}`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data?.content || []) as SupplierOption[];
    } catch {
      return [];
    }
  }, []);

  return {
    suppliersModalOpen,
    setSuppliersModalOpen,
    suppliersData,
    fetchSuppliers,
    addExistingSupplier,
    createSupplier,
    removeSupplier,
    searchSuppliers,
    addContact,
    removeContact,
  };
};
