import { useState, useEffect } from 'react';
import { getBackendUrl } from '@/utils/api';
import { Purchase } from '../types/purchases.types';

export const usePurchasesData = () => {
  const currentYear = new Date().getFullYear();
  const [allYears, setAllYears] = useState<number[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [uniqueValues, setUniqueValues] = useState<Record<string, string[]>>({
    cfo: [],
    purchaser: [],
  });

  // Загружаем общее количество записей без фильтров
  useEffect(() => {
    const fetchTotalRecords = async () => {
      try {
        const response = await fetch(`${getBackendUrl()}/api/purchases?page=0&size=1`);
        if (response.ok) {
          const result = await response.json();
          setTotalRecords(result.totalElements || 0);
        }
      } catch (err) {
        console.error('Error fetching total records:', err);
      }
    };
    fetchTotalRecords();
  }, []);

  // Получаем годы и уникальные значения: ЦФО — из /api/cfos/names, годы и закупщики — из закупок
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [cfoResponse, purchasesResponse] = await Promise.all([
          fetch(`${getBackendUrl()}/api/cfos/names`),
          fetch(`${getBackendUrl()}/api/purchases?page=0&size=10000`),
        ]);

        const cfoNames: string[] = cfoResponse.ok ? await cfoResponse.json() : [];
        const years = new Set<number>();
        const purchaserSet = new Set<string>();

        if (purchasesResponse.ok) {
          const result = await purchasesResponse.json();
          result.content.forEach((purchase: Purchase) => {
            if (purchase.purchaseCreationDate) {
              const date = new Date(purchase.purchaseCreationDate);
              const year = date.getFullYear();
              if (!isNaN(year)) years.add(year);
            }
            if (purchase.purchaser) purchaserSet.add(purchase.purchaser);
          });
        }

        const yearsArray = Array.from(years).sort((a, b) => b - a);
        const uniqueValuesData = {
          cfo: Array.isArray(cfoNames) ? cfoNames : [],
          purchaser: Array.from(purchaserSet).sort(),
        };

        setAllYears(yearsArray.length > 0 ? yearsArray : [currentYear, currentYear - 1, currentYear - 2]);
        setUniqueValues(uniqueValuesData);
      } catch (err) {
        console.error('Error fetching metadata:', err);
        setAllYears([currentYear, currentYear - 1, currentYear - 2]);
      }
    };
    fetchMetadata();
  }, [currentYear]);

  return {
    allYears,
    totalRecords,
    uniqueValues,
    setUniqueValues,
  };
};
