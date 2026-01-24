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

  // Получаем все годы и уникальные значения из данных
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const response = await fetch(`${getBackendUrl()}/api/purchases?page=0&size=10000`);
        if (response.ok) {
          const result = await response.json();
          const years = new Set<number>();
          const values: Record<string, Set<string>> = {
            cfo: new Set(),
            purchaser: new Set(),
          };

          result.content.forEach((purchase: Purchase) => {
            // Собираем годы
            if (purchase.purchaseCreationDate) {
              const date = new Date(purchase.purchaseCreationDate);
              const year = date.getFullYear();
              if (!isNaN(year)) {
                years.add(year);
              }
            }
            // Собираем уникальные значения
            if (purchase.cfo) values.cfo.add(purchase.cfo);
            if (purchase.purchaser) values.purchaser.add(purchase.purchaser);
          });

          const yearsArray = Array.from(years).sort((a, b) => b - a);
          const uniqueValuesData = {
            cfo: Array.from(values.cfo).sort(),
            purchaser: Array.from(values.purchaser).sort(),
          };

          setAllYears(yearsArray);
          setUniqueValues(uniqueValuesData);
        }
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
