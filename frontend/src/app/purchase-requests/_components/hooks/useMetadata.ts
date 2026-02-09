import { useState, useEffect } from 'react';
import { getBackendUrl } from '@/utils/api';
import { fetchMetadata, fetchApprovalAssignmentDateYears } from '../services/purchaseRequests.api';
import { normalizePurchaserName } from '../utils/normalizePurchaser';
import type { PurchaseRequest } from '../types/purchase-request.types';
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

        // Загружаем данные, если кэш отсутствует или устарел
        // ЦФО — из лёгкого API /api/cfos/names, остальное — из заявок
        const params = new URLSearchParams();
        params.append('page', '0');
        params.append('size', '50000');

        const [cfoNamesResponse, result] = await Promise.all([
          fetch(`${getBackendUrl()}/api/cfos/names?for=purchase-requests`),
          fetchMetadata(params),
        ]);
        const cfoNames: string[] = cfoNamesResponse.ok ? await cfoNamesResponse.json() : [];

        const values: Record<string, Set<string>> = {
          cfo: new Set(Array.isArray(cfoNames) ? cfoNames : []),
          purchaseRequestInitiator: new Set(),
          costType: new Set(),
          contractType: new Set(),
          purchaser: new Set(),
          status: new Set(),
          statusGroup: new Set(),
        };

        result.content.forEach((request: PurchaseRequest) => {
          // ЦФО уже загружены из /api/cfos/names
          if (request.purchaseRequestInitiator) values.purchaseRequestInitiator.add(request.purchaseRequestInitiator);
          // Нормализуем имя закупщика для фильтров используя единую функцию
          if (request.purchaser) {
            const normalizedPurchaser = normalizePurchaserName(request.purchaser);
            values.purchaser.add(normalizedPurchaser);
          }
          if (request.status) {
            // Добавляем статус как строку, убираем пробелы
            const statusStr = String(request.status).trim();
            if (statusStr) {
              values.status.add(statusStr);
            }
          }
          if (request.statusGroup) {
            // Добавляем группу статуса как строку, убираем пробелы
            const statusGroupStr = String(request.statusGroup).trim();
            if (statusGroupStr) {
              values.statusGroup.add(statusGroupStr);
            }
          }
          if (request.costType) values.costType.add(request.costType);
          if (request.contractType) values.contractType.add(request.contractType);
        });

        // Дополнительная проверка статуса "Утверждена"
        const hasApproved = Array.from(values.status).includes('Утверждена');
        console.log('Status "Утверждена" found in unique values:', hasApproved);
        console.log('All unique statuses before sorting:', Array.from(values.status));

        const uniqueValuesData = {
          cfo: Array.from(values.cfo).sort(),
          purchaseRequestInitiator: Array.from(values.purchaseRequestInitiator).sort(),
          purchaser: Array.from(values.purchaser).sort(),
          status: Array.from(values.status).sort(),
          statusGroup: Array.from(values.statusGroup).sort(),
          costType: Array.from(values.costType).sort(),
          contractType: Array.from(values.contractType).sort(),
        };

        console.log('Loaded unique statuses from data:', uniqueValuesData.status);
        console.log('Total requests processed:', result.content.length);
        console.log('Status values found:', Array.from(values.status));

        // Проверяем, что статус "Утверждена" присутствует
        if (!uniqueValuesData.status.includes('Утверждена')) {
          console.warn('WARNING: Status "Утверждена" not found in unique values!');
          console.warn('All statuses:', uniqueValuesData.status);
          // Пересчитываем статусы для проверки
          const statusCounts: Record<string, number> = {};
          result.content.forEach((req: PurchaseRequest) => {
            if (req.status) {
              const statusStr = String(req.status).trim();
              statusCounts[statusStr] = (statusCounts[statusStr] || 0) + 1;
            }
          });
          console.warn('Status counts:', statusCounts);

          // Если статус "Утверждена" есть в данных, но не в уникальных значениях, добавляем его вручную
          if (statusCounts['Утверждена'] && statusCounts['Утверждена'] > 0) {
            console.warn('FIXING: Adding "Утверждена" to unique values manually');
            uniqueValuesData.status.push('Утверждена');
            uniqueValuesData.status.sort();
            // Очищаем кэш, чтобы перезагрузить данные
            localStorage.removeItem(CACHE_KEY);
          }
        }

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
