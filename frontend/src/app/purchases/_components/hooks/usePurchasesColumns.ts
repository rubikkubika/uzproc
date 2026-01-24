import { useState, useRef, useCallback, useEffect } from 'react';
import {
  DEFAULT_COLUMN_WIDTHS,
  DEFAULT_COLUMN_ORDER,
  COLUMNS_WIDTHS_STORAGE_KEY,
  COLUMNS_ORDER_STORAGE_KEY,
} from '../constants/purchases.constants';

// Функция для получения ширины колонки по умолчанию
const getDefaultColumnWidth = (columnKey: string): number => {
  return DEFAULT_COLUMN_WIDTHS[columnKey] || 120;
};

export const usePurchasesColumns = () => {
  // Состояние для ширин колонок
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);
  const resizeColumn = useRef<string | null>(null);

  // Загружаем сохраненные ширины колонок из localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(COLUMNS_WIDTHS_STORAGE_KEY);
      if (saved) {
        const widths = JSON.parse(saved);
        setColumnWidths(widths);
      }
    } catch (err) {
      console.error('Error loading column widths:', err);
    }
  }, []);

  // Сохраняем ширины колонок в localStorage
  const saveColumnWidths = useCallback((widths: Record<string, number>) => {
    try {
      localStorage.setItem(COLUMNS_WIDTHS_STORAGE_KEY, JSON.stringify(widths));
    } catch (err) {
      console.error('Error saving column widths:', err);
    }
  }, []);

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
      e.preventDefault();
      e.stopPropagation();
      const diff = e.clientX - resizeStartX.current;
      const newWidth = Math.max(50, resizeStartWidth.current + diff); // Минимальная ширина 50px
      setColumnWidths(prev => {
        const updated = { ...prev, [resizeColumn.current!]: newWidth };
        saveColumnWidths(updated);
        return updated;
      });
    };

    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(null);
      resizeColumn.current = null;
    };

    // Предотвращаем выделение текста во время изменения размера
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp, { passive: false });

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, saveColumnWidths]);

  // Функция для получения текущей ширины колонки
  const getColumnWidth = useCallback((columnKey: string): number => {
    return columnWidths[columnKey] || getDefaultColumnWidth(columnKey);
  }, [columnWidths]);

  // Состояние для порядка колонок
  const [columnOrder, setColumnOrder] = useState<string[]>(DEFAULT_COLUMN_ORDER);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Загружаем сохраненный порядок колонок из localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(COLUMNS_ORDER_STORAGE_KEY);
      if (saved) {
        const order = JSON.parse(saved);
        // Проверяем, что все колонки присутствуют
        const validOrder = order.filter((col: string) => DEFAULT_COLUMN_ORDER.includes(col));
        const missingCols = DEFAULT_COLUMN_ORDER.filter(col => !validOrder.includes(col));
        setColumnOrder([...validOrder, ...missingCols]);
      }
    } catch (err) {
      console.error('Error loading column order:', err);
    }
  }, []);

  // Сохраняем порядок колонок в localStorage
  const saveColumnOrder = useCallback((order: string[]) => {
    try {
      localStorage.setItem(COLUMNS_ORDER_STORAGE_KEY, JSON.stringify(order));
    } catch (err) {
      console.error('Error saving column order:', err);
    }
  }, []);

  // Обработчики для перетаскивания колонок
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

  return {
    columnWidths,
    setColumnWidths,
    isResizing,
    handleResizeStart,
    getColumnWidth,
    columnOrder,
    setColumnOrder,
    draggedColumn,
    dragOverColumn,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    saveColumnOrder,
  };
};
