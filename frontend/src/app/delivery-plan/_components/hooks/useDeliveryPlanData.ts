import { useState, useEffect } from 'react';
import { getBackendUrl } from '@/utils/api';
import type { DeliveryPlanSpecification } from '../types/delivery-plan.types';

export function useDeliveryPlanData() {
  const [specifications, setSpecifications] = useState<DeliveryPlanSpecification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSpecifications = async () => {
      try {
        setLoading(true);
        const backendUrl = getBackendUrl();
        const response = await fetch(`${backendUrl}/api/contracts/specifications-for-delivery-plan`);
        if (response.ok) {
          const data = await response.json();
          // Фильтруем: показываем только спецификации, связанные с заявкой на закупку
          const filteredData = data.filter((spec: DeliveryPlanSpecification) => spec.purchaseRequestId != null);
          setSpecifications(filteredData);
        } else {
          console.error('Failed to fetch specifications:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching specifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSpecifications();
  }, []);

  return { specifications, loading };
}
