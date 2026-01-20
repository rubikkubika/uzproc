/**
 * Утилиты для построения параметров запроса
 */

/**
 * Добавляет параметр в URLSearchParams, если значение не пустое
 */
export function appendIf(
  params: URLSearchParams,
  key: string,
  value: string | number | null | undefined
): void {
  if (value !== null && value !== undefined && value !== '') {
    params.append(key, String(value));
  }
}

/**
 * Добавляет массив значений в URLSearchParams
 */
export function appendArray(
  params: URLSearchParams,
  key: string,
  valuesSet: Set<string> | string[]
): void {
  if (!valuesSet) return;
  
  const values = valuesSet instanceof Set ? Array.from(valuesSet) : valuesSet;
  if (values.length > 0) {
    values.forEach(value => {
      params.append(key, value);
    });
  }
}

/**
 * Парсит строку бюджета в число, убирая пробелы и запятые
 * @returns число или null, если парсинг не удался
 */
export function parseBudgetAmount(str: string | null | undefined): number | null {
  if (!str || str.trim() === '') {
    return null;
  }
  const cleaned = str.replace(/\s/g, '').replace(/,/g, '');
  const value = parseFloat(cleaned);
  return !isNaN(value) && value >= 0 ? value : null;
}

/**
 * Применяет общие фильтры к параметрам запроса
 * Используется для построения параметров в fetchTabCounts и fetchData
 */
export function applyCommonFilters(
  params: URLSearchParams,
  options: {
    selectedYear?: number | null;
    filtersFromHook?: Record<string, string>;
    localFilters?: Record<string, string>;
    cfoFilter?: Set<string>;
    purchaserFilter?: Set<string>;
    activeTab?: string;
    statusFilter?: Set<string>;
    excludeFromInWork?: boolean;
  }
): void {
  const {
    selectedYear,
    filtersFromHook = {},
    localFilters = {},
    cfoFilter,
    purchaserFilter,
  } = options;

  // Год
  if (selectedYear !== null && selectedYear !== undefined) {
    params.append('year', String(selectedYear));
  }

  // ID заявки
  if (filtersFromHook.idPurchaseRequest && filtersFromHook.idPurchaseRequest.trim() !== '') {
    const idValue = parseInt(filtersFromHook.idPurchaseRequest.trim(), 10);
    if (!isNaN(idValue)) {
      params.append('idPurchaseRequest', String(idValue));
    }
  }

  // ЦФО
  if (cfoFilter && cfoFilter.size > 0) {
    cfoFilter.forEach(cfo => {
      params.append('cfo', cfo);
    });
  }

  // Закупщик
  if (purchaserFilter && purchaserFilter.size > 0) {
    purchaserFilter.forEach(p => {
      params.append('purchaser', p);
    });
  }

  // Название
  if (filtersFromHook.name && filtersFromHook.name.trim() !== '') {
    params.append('name', filtersFromHook.name.trim());
  }

  // Бюджет
  const budgetOperator = localFilters.budgetAmountOperator || filtersFromHook.budgetAmountOperator;
  const budgetAmount = localFilters.budgetAmount || filtersFromHook.budgetAmount;
  if (budgetOperator && budgetOperator.trim() !== '' && budgetAmount && budgetAmount.trim() !== '') {
    const budgetValue = parseBudgetAmount(budgetAmount);
    if (budgetValue !== null) {
      params.append('budgetAmountOperator', budgetOperator.trim());
      params.append('budgetAmount', String(budgetValue));
    }
  }

  // Тип затрат
  if (filtersFromHook.costType && filtersFromHook.costType.trim() !== '') {
    params.append('costType', filtersFromHook.costType.trim());
  }

  // Тип контракта
  if (filtersFromHook.contractType && filtersFromHook.contractType.trim() !== '') {
    params.append('contractType', filtersFromHook.contractType.trim());
  }

  // Требуется закупка
  if (filtersFromHook.requiresPurchase && filtersFromHook.requiresPurchase.trim() !== '') {
    const requiresPurchaseValue = filtersFromHook.requiresPurchase.trim();
    if (requiresPurchaseValue === 'Закупка') {
      params.append('requiresPurchase', 'true');
    } else if (requiresPurchaseValue === 'Заказ') {
      params.append('requiresPurchase', 'false');
    }
  }

  // excludeFromInWork
  if (options.excludeFromInWork !== undefined) {
    params.append('excludeFromInWork', String(options.excludeFromInWork));
  }
}
