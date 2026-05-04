import { useCallback } from 'react';
import { getBackendUrl } from '@/utils/api';
import type { Contract } from '../types/contracts.types';

interface UseExcludeFromInWorkProps {
  setAllItems: React.Dispatch<React.SetStateAction<Contract[]>>;
  onAfterUpdate?: () => void;
}

export function useExcludeFromInWork({
  setAllItems,
  onAfterUpdate,
}: UseExcludeFromInWorkProps) {
  const updateExcludeFromInWork = useCallback(async (contractId: number, newValue: boolean) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/contracts/${contractId}/exclude-from-in-work`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ excludeFromInWork: newValue }),
      });
      if (response.ok) {
        const updated = await response.json();
        setAllItems(prev =>
          prev.map(item =>
            item.id === contractId
              ? { ...item, excludeFromInWork: updated.excludeFromInWork }
              : item
          )
        );
        onAfterUpdate?.();
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Ошибка сервера' }));
        alert(errorData.message || 'Не удалось обновить видимость договора');
        console.error('Failed to update excludeFromInWork');
      }
    } catch (error) {
      console.error('Error updating excludeFromInWork:', error);
      alert('Ошибка при обновлении видимости договора');
    }
  }, [setAllItems]);

  return { updateExcludeFromInWork };
}
