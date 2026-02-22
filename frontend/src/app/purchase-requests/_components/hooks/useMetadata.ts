import { useState, useEffect } from 'react';
import { getBackendUrl, fetchDeduped } from '@/utils/api';
import { fetchUniqueFilterValues, fetchApprovalAssignmentDateYears } from '../services/purchaseRequests.api';
import { normalizePurchaserName } from '../utils/normalizePurchaser';
import { CACHE_KEY, CACHE_TTL } from '../constants/status.constants';

/**
 * Хук для работы с метаданными (годы, uniqueValues, кэш)
 */
export function useMetadata() {
  const [allYears, setAllYears] = useState<number[]>([]);
  const [uniqueValues, setUniqueValues] = useState<Record<string, string[]>>({
    cfo: [],
    purchaseRequestInitiator: [],
    purchaser: [],
    status: [],
    statusGroup: [],
    costType: [],
    contractType: [],
  });

  useEffect(() => {
    // Загружаем все данные для получения списка годов и уникальных значений
    // Используем кэширование, чтобы не загружать каждый раз при монтировании
    const fetchMetadataData = async () => {
      try {
        // Проверяем кэш
        // Годы по дате назначения на утверждение загружаем из отдельного API (только те, что есть в БД)
        const yearsFromApi = await fetchApprovalAssignmentDateYears();
        setAllYears(yearsFromApi);

        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          const now = Date.now();
          if (now - timestamp < CACHE_TTL) {
            // Используем кэшированные uniqueValues, годы уже загружены из API выше
            // Если в кэше нет статусов, добавляем пустой массив (они загрузятся при следующем запросе)
            const cachedUniqueValues = {
              ...data.uniqueValues,
              status: data.uniqueValues.status || []
            };
            setUniqueValues(cachedUniqueValues);
            console.log('Loaded from cache - uniqueValues:', cachedUniqueValues);
            // Проверяем, что в кэше есть статус "Утверждена"
            if (cachedUniqueValues.status && !cachedUniqueValues.status.includes('Утверждена')) {
              console.warn('WARNING: Cache does not contain "Утверждена" status, clearing cache and reloading');
              localStorage.removeItem(CACHE_KEY);
            } else if (!cachedUniqueValues.status || cachedUniqueValues.status.length === 0) {
              console.log('Status values not in cache, will load from API');
            } else {
              return;
            }
          }
        }

        // Лёгкие эндпоинты: ЦФО + уникальные значения полей заявок (без загрузки полных записей)
        const cfosUrl = `${getBackendUrl()}/api/cfos/names?for=purchase-requests`;
        const [cfoNamesResponse, uniqueDto] = await Promise.all([
          fetchDeduped(cfosUrl).then((r) => (r.ok ? r.json() : [])),
          fetchUniqueFilterValues(),
        ]);
        const cfoNames: string[] = Array.isArray(cfoNamesResponse) ? cfoNamesResponse : [];

        // Нормализуем имена закупщиков для единообразия с остальным приложением
        const purchaserNormalized = (uniqueDto.purchaser || []).map((p) => normalizePurchaserName(p));
        const purchaserUnique = Array.from(new Set(purchaserNormalized)).sort();

        const uniqueValuesData = {
          cfo: (cfoNames || []).slice().sort(),
          purchaseRequestInitiator: (uniqueDto.purchaseRequestInitiator || []).slice().sort(),
          purchaser: purchaserUnique,
          status: (uniqueDto.status || []).slice().sort(),
          statusGroup: (uniqueDto.statusGroup || []).slice().sort(),
          costType: (uniqueDto.costType || []).slice().sort(),
          contractType: (uniqueDto.contractType || []).slice().sort(),
        };

        setUniqueValues(uniqueValuesData);

        // Сохраняем в кэш (годы не кэшируем — всегда из API)
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data: {
            years: yearsFromApi,
            uniqueValues: uniqueValuesData,
          },
          timestamp: Date.now(),
        }));
      } catch (err) {
        console.error('Error fetching metadata:', err);
      }
    };
    fetchMetadataData();
  }, []);

  return {
    allYears,
    uniqueValues,
  };
}
