import { useState, useRef, useEffect, useCallback } from 'react';
import { DEFAULT_VISIBLE_COLUMNS, ALL_COLUMNS } from '../constants/columns.constants';
import type { TabType } from '../types/purchase-request.types';

// Ширина колонки "Статус" по вкладке (по длине самого длинного статуса на вкладке)
const STATUS_WIDTH_BY_TAB: Record<TabType, number> = {
  'in-work': 140,           // "Заявка у закупщика"
  'completed': 148,         // "Спецификация подписана"
  'project-rejected': 180,  // "Спецификация создана - Архив"
  'hidden': 140,
  'all': 180,
};

export function useTableColumns(activeTab?: TabType) {
  // Состояние для видимости колонок — всегда по умолчанию при открытии страницы
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => new Set(DEFAULT_VISIBLE_COLUMNS));

  // Состояние для порядка колонок
  const defaultOrder = ['excludeFromInWork', 'comments', 'idPurchaseRequest', 'cfo', 'purchaser', 'name', 'budgetAmount', 'requiresPurchase', 'hasLinkedPlanItem', 'purchaseRequestCreationDate', 'complexity', 'status', 'track', 'rating'];
  const [columnOrder, setColumnOrder] = useState<string[]>(defaultOrder);

  // Состояние для ширин колонок
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});

  // Состояние для изменения размера
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);
  const resizeColumn = useRef<string | null>(null);

  // Состояние для перетаскивания
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Состояние для меню выбора колонок
  const [isColumnsMenuOpen, setIsColumnsMenuOpen] = useState(false);
  const [columnsMenuPosition, setColumnsMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const columnsMenuButtonRef = useRef<HTMLButtonElement>(null);

  // Вычисление позиции меню колонок
  const calculateMenuPosition = useCallback(() => {
    if (!columnsMenuButtonRef.current) return null;
    const rect = columnsMenuButtonRef.current.getBoundingClientRect();
    return { top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX };
  }, []);

  // Обновляем позицию меню при его открытии
  useEffect(() => {
    if (isColumnsMenuOpen) {
      const pos = calculateMenuPosition();
      if (pos) setColumnsMenuPosition(pos);
    }
  }, [isColumnsMenuOpen, calculateMenuPosition]);

  // Функции для управления видимостью колонок
  const toggleColumnVisibility = (columnKey: string) => {
    setVisibleColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnKey)) {
        newSet.delete(columnKey);
      } else {
        newSet.add(columnKey);
      }
      return newSet;
    });
  };

  const selectAllColumns = () => {
    setVisibleColumns(new Set(ALL_COLUMNS.map(col => col.key)));
  };

  const selectDefaultColumns = useCallback(() => {
    setVisibleColumns(new Set(DEFAULT_VISIBLE_COLUMNS));
    setColumnOrder(defaultOrder);
  }, []);

  // Сохранение порядка колонок (только в state; при открытии страницы всегда используются значения по умолчанию)
  const saveColumnOrder = useCallback((_order: string[]) => {
    // Не сохраняем в localStorage — столбцы при открытии страницы всегда по умолчанию
  }, []);

  // Сохранение ширин колонок (только в state; при открытии страницы всегда используются значения по умолчанию)
  const saveColumnWidths = useCallback((_widths: Record<string, number>) => {
    // Не сохраняем в localStorage — столбцы при открытии страницы всегда по умолчанию
  }, []);

  // Обработчики drag & drop
  const handleDragStart = (e: React.DragEvent, columnKey: string) => {
    setDraggedColumn(columnKey);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', columnKey);
  };

  const handleDragOver = (e: React.DragEvent, columnKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedColumn && draggedColumn !== columnKey) {
      setDragOverColumn(columnKey);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetColumnKey: string) => {
    e.preventDefault();
    if (!draggedColumn || draggedColumn === targetColumnKey) {
      setDraggedColumn(null);
      setDragOverColumn(null);
      return;
    }

    const newOrder = [...columnOrder];
    const draggedIndex = newOrder.indexOf(draggedColumn);
    const targetIndex = newOrder.indexOf(targetColumnKey);

    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedColumn);

    setColumnOrder(newOrder);
    saveColumnOrder(newOrder);
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  // Обработчик начала изменения размера
  const handleResizeStart = useCallback((e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(columnKey);
    resizeColumn.current = columnKey;
    resizeStartX.current = e.clientX;
    const currentWidth = columnWidths[columnKey] || getDefaultColumnWidth(columnKey);
    resizeStartWidth.current = currentWidth;
  }, [columnWidths]);

  // Обработчик изменения размера
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeColumn.current) return;
      const diff = e.clientX - resizeStartX.current;
      const newWidth = Math.max(50, resizeStartWidth.current + diff);
      setColumnWidths(prev => {
        const updated = { ...prev, [resizeColumn.current!]: newWidth };
        saveColumnWidths(updated);
        return updated;
      });
    };

    const handleMouseUp = () => {
      setIsResizing(null);
      resizeColumn.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, saveColumnWidths]);

  // Функция для получения ширины колонки по умолчанию
  const getDefaultColumnWidth = (columnKey: string): number => {
    const defaults: Record<string, number> = {
      excludeFromInWork: 28,
      idPurchaseRequest: 42,   // "2305" + sort btn
      cfo: 92,                 // "M - Construction" ~88px
      purchaseRequestInitiator: 110,
      purchaser: 142,          // "AKBAROV ABDULAZIZ" ~118px + запас
      name: 300,               // основная колонка — разумный минимум
      budgetAmount: 92,        // "119,3 тыс. UZS" ~88px
      isPlanned: 80,
      hasLinkedPlanItem: 68,   // "Не в плане" ~65px
      requiresPurchase: 58,    // "Заказ"/"Закупка"
      status: activeTab ? STATUS_WIDTH_BY_TAB[activeTab] : 182,
      purchaseRequestCreationDate: 92, // "Назначение" (10 chars + sort btn + padding)
      comments: 32,
      complexity: 50,          // "Слож." header + sort btn
      costType: 96,
      contractType: 96,
      contractDurationMonths: 86,
      track: 240, // Заявка(48)+Закупка(68)+gap+Договор(56)+gap+Срок(36)+padding = ~236px
      rating: 62,              // "Отправлена" ~60px
      guid: 156,
      purchaseRequestPlanYear: 66,
      company: 96,
      purchaseMethod: 66,
      currency: 56,
      createdAt: 124,
      updatedAt: 124,
    };
    return defaults[columnKey] || 120;
  };

  // Функция для получения текущей ширины колонки
  const getColumnWidth = (columnKey: string): number => {
    return columnWidths[columnKey] || getDefaultColumnWidth(columnKey);
  };

  return {
    // Видимость
    visibleColumns,
    setVisibleColumns,
    toggleColumnVisibility,
    selectAllColumns,
    selectDefaultColumns,

    // Порядок
    columnOrder,
    setColumnOrder,

    // Ширина
    columnWidths,
    getColumnWidth,
    getDefaultColumnWidth,

    // Resize
    isResizing,
    handleResizeStart,

    // Drag & Drop
    draggedColumn,
    dragOverColumn,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,

    // Меню
    isColumnsMenuOpen,
    setIsColumnsMenuOpen,
    columnsMenuPosition,
    setColumnsMenuPosition,
    columnsMenuButtonRef,
  };
}
