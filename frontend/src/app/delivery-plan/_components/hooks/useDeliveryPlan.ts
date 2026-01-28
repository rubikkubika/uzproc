import { useState } from 'react';
import { useDeliveryPlanData } from './useDeliveryPlanData';
import { useDeliveryPlanCalendar } from './useDeliveryPlanCalendar';
import type { DeliveryPlanSpecification } from '../types/delivery-plan.types';

export function useDeliveryPlan() {
  const { specifications, loading } = useDeliveryPlanData();
  const calendar = useDeliveryPlanCalendar(specifications);
  const [selectedSpec, setSelectedSpec] = useState<DeliveryPlanSpecification | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  return {
    specifications,
    loading,
    calendar,
    selectedSpec,
    setSelectedSpec,
    selectedDate,
    setSelectedDate,
  };
}
