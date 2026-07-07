import { useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  PURCHASER_DISTRIBUTION_REQUESTS,
  PurchaserRequestRow,
} from '../constants/purchaserDistributionRequests';

/**
 * Колонки выгрузки: одна строка = одна заявка.
 * Единый источник для Excel (заголовок, ширина, значение).
 */
const EXPORT_COLUMNS: ReadonlyArray<{
  header: string;
  width: number;
  value: (r: PurchaserRequestRow) => string | number;
}> = [
  { header: 'Номер заявки', width: 16, value: (r) => r.number },
  { header: 'Наименование закупки', width: 45, value: (r) => r.name },
  { header: 'Категория', width: 34, value: (r) => r.category },
  { header: 'Статья расходов', width: 40, value: (r) => r.expenseItem },
  { header: 'Сумма', width: 18, value: (r) => r.amount },
  { header: 'Валюта', width: 10, value: (r) => r.currency },
  { header: 'Сложность', width: 12, value: (r) => r.complexity },
  { header: 'Закупщик (ведёт)', width: 18, value: (r) => r.currentPurchaser },
  { header: 'Закупщик (предполагается)', width: 22, value: (r) => r.proposedPurchaser },
];

/**
 * Выгрузка распределения по закупщикам в Excel: одна строка = одна заявка.
 */
export function usePurchaserDistributionExport(
  rows: PurchaserRequestRow[] = PURCHASER_DISTRIBUTION_REQUESTS
) {
  const exportToExcel = useCallback(() => {
    if (!rows || rows.length === 0) {
      alert('Нет данных для экспорта');
      return;
    }

    try {
      const exportData = rows.map((row) =>
        Object.fromEntries(EXPORT_COLUMNS.map((col) => [col.header, col.value(row)]))
      );

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData, {
        header: EXPORT_COLUMNS.map((col) => col.header),
      });
      ws['!cols'] = EXPORT_COLUMNS.map((col) => ({ wch: col.width }));
      XLSX.utils.book_append_sheet(wb, ws, 'Распределение');

      const fileName = `Распределение_по_закупщикам_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Ошибка при экспорте в Excel:', error);
      alert('Ошибка при экспорте в Excel');
    }
  }, [rows]);

  return { exportToExcel };
}
