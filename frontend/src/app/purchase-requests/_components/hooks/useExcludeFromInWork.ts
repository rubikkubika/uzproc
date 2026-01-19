import { useCallback } from 'react';
import { getBackendUrl } from '@/utils/api';
import type { PurchaseRequest } from '../types/purchase-request.types';

interface UseExcludeFromInWorkProps {
  userRole: string | null;
  setAllItems: React.Dispatch<React.SetStateAction<PurchaseRequest[]>>;
}

export function useExcludeFromInWork({
  userRole,
  setAllItems,
}: UseExcludeFromInWorkProps) {
  const updateExcludeFromInWork = useCallback(async (requestId: number, newValue: boolean) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/purchase-requests/${requestId}/exclude-from-in-work`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': userRole || 'user',
        },
        body: JSON.stringify({ excludeFromInWork: newValue }),
      });
      if (response.ok) {
        const updated = await response.json();
        setAllItems(prev => 
          prev.map(item => 
            item.idPurchaseRequest === requestId 
              ? { ...item, excludeFromInWork: updated.excludeFromInWork }
              : item
          )
        );
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Ошибка сервера' }));
        alert(errorData.message || 'Не удалось обновить видимость заявки');
        console.error('Failed to update excludeFromInWork');
      }
    } catch (error) {
      console.error('Error updating excludeFromInWork:', error);
      alert('Ошибка при обновлении видимости заявки');
    }
  }, [userRole, setAllItems]);

  return { updateExcludeFromInWork };
}
