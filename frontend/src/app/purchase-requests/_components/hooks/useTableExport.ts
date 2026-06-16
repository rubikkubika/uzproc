import { useCallback } from 'react';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { copyToClipboard } from '@/utils/clipboard';
import { purchaserDisplayName } from '@/utils/purchaser';
import type { PurchaseRequest } from '../types/purchase-request.types';

/** Дата в формате ru-RU или пустая строка. */
function formatDate(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleDateString('ru-RU') : '';
}

/**
 * Срок на договоре в рабочих днях — как считается в реестре (колонка «Трэк»):
 * для «Договор в работе» — текущий счётчик, иначе зафиксированное значение.
 */
function contractWorkingDays(r: PurchaseRequest): number | null {
  return r.contractWorkingDaysInProgress ?? r.contractWorkingDaysTotal ?? null;
}

/**
 * Колонки экспорта (Excel и TSV используют один источник).
 * Сроки — в рабочих днях, как в реестре: срок закупки = factualSlaDays,
 * срок договора = contractWorkingDays, общий срок = их сумма.
 */
const EXPORT_COLUMNS: ReadonlyArray<{
  header: string;
  width: number;
  value: (r: PurchaseRequest) => string | number;
}> = [
  { header: 'Номер заявки', width: 15, value: (r) => r.idPurchaseRequest ?? '' },
  { header: 'ЦФО', width: 20, value: (r) => r.cfo ?? '' },
  { header: 'Наименование', width: 30, value: (r) => r.name ?? '' },
  { header: 'Инициатор', width: 25, value: (r) => r.purchaseRequestInitiator ?? '' },
  {
    header: 'Закупщик',
    width: 25,
    value: (r) => {
      const name = purchaserDisplayName(r.purchaser);
      return name !== '—' ? name : '';
    },
  },
  { header: 'Бюджет', width: 15, value: (r) => r.budgetAmount ?? '' },
  { header: 'Тип договора', width: 15, value: (r) => r.contractType ?? '' },
  {
    header: 'План',
    width: 10,
    value: (r) => (r.isPlanned ? 'Плановая' : r.isPlanned === false ? 'Внеплановая' : ''),
  },
  { header: 'Дата назначения на закупщика', width: 22, value: (r) => formatDate(r.approvalAssignmentDate) },
  { header: 'Дата завершения закупки', width: 22, value: (r) => formatDate(r.purchaseCompletionDate) },
  { header: 'Срок закупки (раб. дн.)', width: 18, value: (r) => r.factualSlaDays ?? '' },
  {
    header: 'Срок договора (раб. дн.)',
    width: 18,
    value: (r) => contractWorkingDays(r) ?? '',
  },
  {
    header: 'Общий срок (раб. дн.)',
    width: 18,
    value: (r) => {
      const total = (r.factualSlaDays ?? 0) + (contractWorkingDays(r) ?? 0);
      return total > 0 ? total : '';
    },
  },
  { header: 'Получатель оценки', width: 25, value: (r) => r.feedbackRecipient ?? '' },
  {
    header: 'Оценка',
    width: 10,
    value: (r) => (r.hasFeedback && r.averageRating != null ? r.averageRating.toFixed(1) : ''),
  },
  { header: 'Комментарий оценки', width: 40, value: (r) => r.feedbackComment ?? '' },
];

interface UseTableExportOptions {
  allItems: PurchaseRequest[];
  data?: { content?: PurchaseRequest[] } | null;
  tableSelector?: string; // Селектор для поиска таблицы (по умолчанию: '.bg-white.rounded-lg.shadow-lg.overflow-hidden table')
}

export function useTableExport({ allItems, data, tableSelector }: UseTableExportOptions) {
  const exportToExcel = useCallback(async () => {
    if (!data || !data.content || data.content.length === 0) {
      alert('Нет данных для экспорта');
      return;
    }

    try {
      // Подготавливаем данные для экспорта (единый источник колонок)
      const exportData = allItems.map((request) =>
        Object.fromEntries(EXPORT_COLUMNS.map((col) => [col.header, col.value(request)]))
      );

      // Создаем рабочую книгу
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData, {
        header: EXPORT_COLUMNS.map((col) => col.header),
      });

      // Устанавливаем ширину колонок
      ws['!cols'] = EXPORT_COLUMNS.map((col) => ({ wch: col.width }));

      // Добавляем лист в книгу
      XLSX.utils.book_append_sheet(wb, ws, 'Заявки на закупку');

      // Генерируем имя файла с датой
      const fileName = `Заявки_на_закупку_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Сохраняем файл
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Ошибка при экспорте в Excel:', error);
      alert('Ошибка при экспорте в Excel');
    }
  }, [allItems, data]);

  const copyAsTSV = useCallback(async () => {
    if (!data || !data.content || data.content.length === 0) {
      alert('Нет данных для копирования');
      return;
    }

    try {
      // Заголовки и строки из единого источника колонок
      const headers = EXPORT_COLUMNS.map((col) => col.header);
      const rows = allItems.map((request) => EXPORT_COLUMNS.map((col) => col.value(request)));

      // Объединяем заголовки и данные
      const allRows = [headers, ...rows];

      // Преобразуем в TSV формат (табуляция между колонками)
      const tsvContent = allRows.map(row => row.join('\t')).join('\n');

      // Копируем в буфер обмена
      await copyToClipboard(tsvContent);
      alert('Данные скопированы в буфер обмена');
    } catch (error) {
      console.error('Ошибка при копировании в буфер обмена:', error);
      alert('Ошибка при копировании в буфер обмена');
    }
  }, [allItems, data]);

  const saveAsImage = useCallback(async () => {
    // Сохраняем оригинальные функции консоли перед началом
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    try {
      // Находим элемент таблицы - используем селектор или дефолтный
      const selector = tableSelector || '.bg-white.rounded-lg.shadow-lg.overflow-hidden';
      const tableContainer = document.querySelector(selector);
      const tableElement = tableContainer?.querySelector('table');
      
      if (!tableElement) {
        alert('Таблица не найдена');
        return;
      }

      // Временно подавляем ошибки, связанные с lab()
      console.error = (...args: any[]) => {
        if (args[0] && typeof args[0] === 'string' && args[0].includes('lab')) {
          return; // Игнорируем ошибки lab()
        }
        originalConsoleError.apply(console, args);
      };
      
      console.warn = (...args: any[]) => {
        if (args[0] && typeof args[0] === 'string' && args[0].includes('lab')) {
          return; // Игнорируем предупреждения lab()
        }
        originalConsoleWarn.apply(console, args);
      };

      try {
        // Создаем canvas из таблицы
        const canvas = await html2canvas(tableElement as HTMLElement, {
          backgroundColor: '#ffffff',
          scale: 2, // Увеличиваем разрешение для лучшего качества
          logging: false,
          useCORS: true,
        });

        // Преобразуем canvas в blob
        canvas.toBlob((blob: Blob | null) => {
          if (!blob) {
            alert('Ошибка при создании изображения');
            return;
          }

          // Создаем ссылку для скачивания
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          
          // Генерируем имя файла с датой
          const fileName = `Заявки_на_закупку_${new Date().toISOString().split('T')[0]}.png`;
          link.download = fileName;
          
          // Добавляем ссылку в DOM, кликаем и удаляем
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Освобождаем память
          URL.revokeObjectURL(url);
        }, 'image/png');
      } finally {
        // Восстанавливаем оригинальные функции консоли
        console.error = originalConsoleError;
        console.warn = originalConsoleWarn;
      }
    } catch (error) {
      // Восстанавливаем оригинальные функции консоли в случае ошибки
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      
      // Игнорируем ошибки, связанные с lab()
      if (error instanceof Error && error.message && error.message.includes('lab')) {
        // Тихо игнорируем ошибку парсинга lab() цвета (html2canvas не поддерживает эту функцию)
        return;
      }
      
      console.error('Ошибка при сохранении изображения:', error);
      alert('Ошибка при сохранении изображения');
    }
  }, [tableSelector]);

  return {
    exportToExcel,
    copyAsTSV,
    saveAsImage,
  };
}
