import { useState, useCallback, useEffect } from 'react';
import { getBackendUrl } from '@/utils/api';
import type { DeliveryPlanItem, DeliveryPlanTableFilters } from '../types/delivery-plan-table.types';

/**
 * Хук для загрузки и управления данными таблицы плана поставок
 */
export function useDeliveryPlanTableData() {
  const [items, setItems] = useState<DeliveryPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Загружает данные с сервера с учетом фильтров
   */
  const fetchData = useCallback(async (
    filters: DeliveryPlanTableFilters,
    selectedMonth: number,
    selectedYear: number,
    selectedDay: number | null = null
  ) => {
    try {
      setLoading(true);
      setError(null);

      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/contracts/specifications-for-delivery-plan`);

      if (!response.ok) {
        throw new Error('Ошибка загрузки данных');
      }

      const data = await response.json();

      // Фильтруем данные на клиенте
      let filteredData = data.filter((spec: DeliveryPlanItem) => spec.purchaseRequestId != null);

      // Применяем текстовые фильтры
      if (filters.innerId) {
        filteredData = filteredData.filter((item: DeliveryPlanItem) =>
          item.innerId?.toLowerCase().includes(filters.innerId.toLowerCase())
        );
      }

      if (filters.name) {
        filteredData = filteredData.filter((item: DeliveryPlanItem) =>
          item.name?.toLowerCase().includes(filters.name.toLowerCase())
        );
      }

      if (filters.title) {
        filteredData = filteredData.filter((item: DeliveryPlanItem) =>
          item.title?.toLowerCase().includes(filters.title.toLowerCase())
        );
      }

      if (filters.cfo) {
        filteredData = filteredData.filter((item: DeliveryPlanItem) =>
          item.cfo?.toLowerCase().includes(filters.cfo.toLowerCase())
        );
      }

      if (filters.purchaseRequestId) {
        filteredData = filteredData.filter((item: DeliveryPlanItem) =>
          item.purchaseRequestId?.toString().includes(filters.purchaseRequestId)
        );
      }

      // Фильтруем по месяцу и году
      filteredData = filteredData.filter((item: DeliveryPlanItem) => {
        if (!item.plannedDeliveryStartDate) return false;

        const date = new Date(item.plannedDeliveryStartDate);
        const month = date.getMonth();
        const year = date.getFullYear();

        return month === selectedMonth && year === selectedYear;
      });

      // Фильтруем по дню (если выбран)
      if (selectedDay !== null) {
        filteredData = filteredData.filter((item: DeliveryPlanItem) => {
          if (!item.plannedDeliveryStartDate) return false;

          const date = new Date(item.plannedDeliveryStartDate);
          const day = date.getDate();

          return day === selectedDay;
        });
      }

      setItems(filteredData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      console.error('Ошибка загрузки спецификаций:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    items,
    loading,
    error,
    fetchData,
    setItems,
  };
}
