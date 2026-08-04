import { useCallback } from 'react';
import { getBackendUrl } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Contract } from '../types/contracts.types';

interface UseExcludeFromStatusCalculationProps {
  setAllItems: React.Dispatch<React.SetStateAction<Contract[]>>;
  onAfterUpdate?: () => void;
}

export function useExcludeFromStatusCalculation({
  setAllItems,
  onAfterUpdate,
}: UseExcludeFromStatusCalculationProps) {
  // Эндпоинт исключения доступен только администратору — передаём роль в заголовке
  const { userRole } = useAuth();

  const updateExcludeFromStatusCalculation = useCallback(async (contractId: number, newValue: boolean) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/contracts/${contractId}/exclusion`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': userRole || 'user',
        },
        body: JSON.stringify({ excludedFromStatusCalculation: newValue }),
      });
      if (response.ok) {
        const updated = await response.json();
        setAllItems(prev =>
          prev.map(item =>
            item.id === contractId
              ? { ...item, excludedFromStatusCalculation: updated.excludedFromStatusCalculation }
              : item
          )
        );
        onAfterUpdate?.();
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Ошибка сервера' }));
        alert(errorData.message || 'Не удалось обновить видимость договора');
        console.error('Failed to update excludedFromStatusCalculation');
      }
    } catch (error) {
      console.error('Error updating excludedFromStatusCalculation:', error);
      alert('Ошибка при обновлении видимости договора');
    }
  }, [setAllItems, onAfterUpdate, userRole]);

  return { updateExcludeFromStatusCalculation };
}
