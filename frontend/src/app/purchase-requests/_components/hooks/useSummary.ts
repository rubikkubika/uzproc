import { useState, useEffect, useMemo } from 'react';
import { fetchPurchaseRequests } from '../services/purchaseRequests.api';
import { normalizePurchaserName } from '../utils/normalizePurchaser';
import { parseBudgetAmount } from '../utils/buildQueryParams';
import type { PurchaseRequest } from '../types/purchase-request.types';
import { TAB_STATUS_GROUPS, FETCH_LIMITS } from '../constants/status.constants';

interface PurchaserSummaryItem {
  purchaser: string;
  ordersCount: number;
  purchasesCount: number;
  ordersBudget: number;
  purchasesBudget: number;
}

interface UseSummaryParams {
  filtersFromHook: Record<string, string>;
  cfoFilter: Set<string>;
  filtersLoadedRef: React.MutableRefObject<boolean>;
}

/**
 * Хук для работы с summary таблицей
 * Загружает данные для сводной таблицы и вычисляет статистику по закупщикам
 */
export function useSummary(params: UseSummaryParams) {
  const { filtersFromHook, cfoFilter, filtersLoadedRef } = params;
  const [summaryData, setSummaryData] = useState<PurchaseRequest[]>([]);

  // Загрузка данных для сводной таблицы
  useEffect(() => {
    if (!filtersLoadedRef.current) {
      return;
    }

    const fetchSummaryData = async () => {
      try {
        const params = new URLSearchParams();
        params.append('page', '0');
        params.append('size', String(FETCH_LIMITS.SUMMARY_PAGE_SIZE));

        // НЕ применяем фильтр по годам - сводная таблица должна показывать все годы

        if (filtersFromHook.idPurchaseRequest && filtersFromHook.idPurchaseRequest.trim() !== '') {
          const idValue = parseInt(filtersFromHook.idPurchaseRequest.trim(), 10);
          if (!isNaN(idValue)) {
            params.append('idPurchaseRequest', String(idValue));
          }
        }

        if (cfoFilter.size > 0) {
          cfoFilter.forEach(cfo => {
            params.append('cfo', cfo);
          });
        }

        // НЕ применяем purchaserFilter - сводная таблица должна показывать всех закупщиков

        if (filtersFromHook.name && filtersFromHook.name.trim() !== '') {
          params.append('name', filtersFromHook.name.trim());
        }

        const budgetOperator = filtersFromHook.budgetAmountOperator || 'gte';
        if (filtersFromHook.budgetAmount && filtersFromHook.budgetAmount.trim() !== '') {
          const budgetValue = parseBudgetAmount(filtersFromHook.budgetAmount);
          if (budgetValue !== null) {
            params.append('budgetAmount', String(budgetValue));
            params.append('budgetAmountOperator', budgetOperator);
          }
        }

        if (filtersFromHook.costType && filtersFromHook.costType.trim() !== '') {
          params.append('costType', filtersFromHook.costType.trim());
        }

        if (filtersFromHook.contractType && filtersFromHook.contractType.trim() !== '') {
          params.append('contractType', filtersFromHook.contractType.trim());
        }

        if (filtersFromHook.contractDurationMonths && filtersFromHook.contractDurationMonths.trim() !== '') {
          const durationValue = parseInt(filtersFromHook.contractDurationMonths.trim(), 10);
          if (!isNaN(durationValue)) {
            params.append('contractDurationMonths', String(durationValue));
          }
        }

        if (filtersFromHook.isPlanned && filtersFromHook.isPlanned.trim() !== '') {
          const isPlannedValue = filtersFromHook.isPlanned.trim();
          if (isPlannedValue === 'Да') {
            params.append('isPlanned', 'true');
          } else if (isPlannedValue === 'Нет') {
            params.append('isPlanned', 'false');
          }
        }

        if (filtersFromHook.hasLinkedPlanItem && filtersFromHook.hasLinkedPlanItem.trim() !== '') {
          const hasLinkedPlanItemValue = filtersFromHook.hasLinkedPlanItem.trim();
          if (hasLinkedPlanItemValue === 'В плане') {
            params.append('hasLinkedPlanItem', 'true');
          } else if (hasLinkedPlanItemValue === 'Не в плане') {
            params.append('hasLinkedPlanItem', 'false');
          }
        }

        if (filtersFromHook.complexity && filtersFromHook.complexity.trim() !== '') {
          params.append('complexity', filtersFromHook.complexity.trim());
        }

        if (filtersFromHook.requiresPurchase && filtersFromHook.requiresPurchase.trim() !== '') {
          const requiresPurchaseValue = filtersFromHook.requiresPurchase.trim();
          if (requiresPurchaseValue === 'Требуется') {
            params.append('requiresPurchase', 'true');
          } else if (requiresPurchaseValue === 'Заказ') {
            params.append('requiresPurchase', 'false');
          }
        }

        // Применяем фильтр по группам статусов "в работе" для сводной таблицы
        // Сводная таблица всегда показывает только заявки "в работе", независимо от активной вкладки
        const inWorkStatusGroups = TAB_STATUS_GROUPS['in-work'];
        inWorkStatusGroups.forEach(statusGroup => {
          params.append('statusGroup', statusGroup);
        });
        
        // Исключаем скрытые заявки из сводной таблицы
        params.append('excludeFromInWork', 'false');

        console.log('Fetching summary data, params:', params.toString());
        const result = await fetchPurchaseRequests(params);
        console.log('Summary data received, total:', result.totalElements, 'content length:', result.content?.length);
        
        // Нормализуем имена закупщиков сразу при получении данных с бэкенда
        const normalizedContent = (result.content || []).map((item: PurchaseRequest) => ({
          ...item,
          purchaser: item.purchaser ? normalizePurchaserName(item.purchaser) : null
        }));
        setSummaryData(normalizedContent);
      } catch (err) {
        console.error('Error fetching summary data:', err);
        setSummaryData([]);
      }
    };

    fetchSummaryData();
  }, [filtersFromHook, cfoFilter, filtersLoadedRef]); // НЕ включаем selectedYear и activeTab - сводная таблица всегда показывает все годы и только "в работе"

  // Сводная статистика по закупщикам (использует summaryData, который не учитывает фильтр по закупщику)
  const purchaserSummary = useMemo(() => {
    if (!summaryData || summaryData.length === 0) {
      return [];
    }

    const summaryMap = new Map<string, {
      ordersCount: number;
      purchasesCount: number;
      ordersBudget: number;
      purchasesBudget: number;
    }>();

    summaryData.forEach((item) => {
      // Исключаем неактуальные заявки из сводной таблицы
      if (item.status === 'Неактуальна' || item.status === 'Не Актуальная') {
        return;
      }

      // Нормализуем имя закупщика используя единую функцию
      const originalPurchaser = item.purchaser;
      const purchaser = normalizePurchaserName(item.purchaser);

      // Логируем, если оригинальное и нормализованное имя различаются
      if (originalPurchaser && originalPurchaser !== purchaser) {
        console.log('Нормализация закупщика:', { original: originalPurchaser, normalized: purchaser });
      }

      const budget = item.budgetAmount || 0;
      const isPurchase = item.requiresPurchase === true; // true = закупка, false/null = заказ

      if (!summaryMap.has(purchaser)) {
        summaryMap.set(purchaser, {
          ordersCount: 0,
          purchasesCount: 0,
          ordersBudget: 0,
          purchasesBudget: 0
        });
      }

      const stats = summaryMap.get(purchaser)!;
      if (isPurchase) {
        stats.purchasesCount++;
        stats.purchasesBudget += budget;
      } else {
        stats.ordersCount++;
        stats.ordersBudget += budget;
      }
    });

    const result: PurchaserSummaryItem[] = Array.from(summaryMap.entries())
      .map(([purchaser, stats]) => ({
        purchaser,
        ordersCount: stats.ordersCount,
        purchasesCount: stats.purchasesCount,
        ordersBudget: stats.ordersBudget,
        purchasesBudget: stats.purchasesBudget,
      }))
      .sort((a, b) => (b.ordersBudget + b.purchasesBudget) - (a.ordersBudget + a.purchasesBudget)); // Сортировка по общей сумме бюджета по убыванию

    // Отладочное логирование для проверки дублирования
    const purchaserNames = result.map(r => r.purchaser);
    const duplicates = purchaserNames.filter((name, index) => purchaserNames.indexOf(name) !== index);
    if (duplicates.length > 0) {
      console.warn('Обнаружены дубликаты закупщиков в сводной таблице:', duplicates);
      console.warn('Все имена закупщиков:', purchaserNames);
    }

    // Дополнительная проверка: ищем похожие имена (с разницей только в пробелах)
    const normalizedNames = purchaserNames.map(name => normalizePurchaserName(name));
    const uniqueNormalized = new Set(normalizedNames);
    if (normalizedNames.length !== uniqueNormalized.size) {
      console.warn('Обнаружены похожие имена закупщиков (возможно, проблема с нормализацией):');
      purchaserNames.forEach((name, index) => {
        const normalized = normalizedNames[index];
        if (name !== normalized) {
          console.warn(`  "${name}" -> "${normalized}"`);
        }
      });
    }

    // Логируем все имена закупщиков для отладки
    console.log('Все закупщики в сводной таблице:', purchaserNames);
    console.log('Количество уникальных закупщиков:', uniqueNormalized.size);
    console.log('Общее количество записей:', purchaserNames.length);

    return result;
  }, [summaryData]);

  return {
    summaryData,
    setSummaryData,
    purchaserSummary,
  };
}
