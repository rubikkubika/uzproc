import { useEffect } from 'react';
import { getBackendUrl } from '@/utils/api';

interface UseTotalRecordsProps {
  setTotalRecords: (count: number) => void;
}

export function useTotalRecords({
  setTotalRecords,
}: UseTotalRecordsProps) {
  // Загружаем общее количество записей без фильтров
  useEffect(() => {
    const fetchTotalRecords = async () => {
      try {
        const response = await fetch(`${getBackendUrl()}/api/purchase-requests?page=0&size=1`);
        if (response.ok) {
          const result = await response.json();
          setTotalRecords(result.totalElements || 0);
        }
      } catch (err) {
        console.error('Error fetching total records:', err);
      }
    };
    fetchTotalRecords();
  }, [setTotalRecords]);
}
