import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  DEFAULT_VISIBLE_COLUMNS,
  ALL_COLUMNS,
  COLUMNS_VISIBILITY_STORAGE_KEY,
  DEFAULT_COLUMN_WIDTHS,
} from '../constants/purchase-plan-items.constants';
import { getDefaultColumnWidth } from '../utils/purchase-plan-items.utils';
import { PurchasePlanItem } from '../types/purchase-plan-items.types';

// Тип для ключей колонок
type ColumnKey = (typeof ALL_COLUMNS)[number]['key'];

/**
 * Исправленный fixColumnOrder
 * - Сохраняет валидные колонки
 * - Вставляет недостающие на позиции из DEFAULT_VISIBLE_COLUMNS
 */
const fixColumnOrder = (order: string[]): string[] => {
  const validKeys = new Set(ALL_COLUMNS.map(c => c.key) as ColumnKey[]);
  const valid = order.filter((col): col is ColumnKey => validKeys.has(col as ColumnKey));
  const finalOrder: ColumnKey[] = [...valid];

  DEFAULT_VISIBLE_COLUMNS.forEach((col, index) => {
    if (!finalOrder.includes(col as ColumnKey)) {
      finalOrder.splice(index, 0, col as ColumnKey);
    }
  });

  return finalOrder;
};

export const usePurchasePlanItemsColumns = (allItems: PurchasePlanItem[] = []) => {
  /* =========================
     ВИДИМОСТЬ КОЛОНОК
     ========================= */
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set(DEFAULT_VISIBLE_COLUMNS);
    try {
      const saved = localStorage.getItem(COLUMNS_VISIBILITY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return new Set(parsed.filter(col => typeof col === 'string'));
        }
      }
    } catch {}
    return new Set(DEFAULT_VISIBLE_COLUMNS);
  });

  /* =========================
     ПОРЯДОК КОЛОНОК
     ========================= */
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [...DEFAULT_VISIBLE_COLUMNS];
    try {
      const saved = localStorage.getItem('purchasePlanItemsTableColumnOrder');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return fixColumnOrder(parsed);
        }
      }
    } catch {}
    return [...DEFAULT_VISIBLE_COLUMNS];
  });

  const saveColumnOrder = useCallback((order: string[]) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('purchasePlanItemsTableColumnOrder', JSON.stringify(order));
    } catch {}
  }, []);

  /* =========================
     Синхронизация видимости и порядка
     ========================= */
  useEffect(() => {
    setColumnOrder(prev => {
      // Сначала фильтруем по видимым колонкам
      const filtered = prev.filter(col => visibleColumns.has(col));
      const next = fixColumnOrder(filtered);

      if (JSON.stringify(prev) !== JSON.stringify(next)) {
        saveColumnOrder(next);
        return next;
      }
      return prev;
    });
  }, [visibleColumns, saveColumnOrder]);

  /* =========================
     СОХРАНЕНИЕ ВИДИМОСТИ
     ========================= */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(
        COLUMNS_VISIBILITY_STORAGE_KEY,
        JSON.stringify(Array.from(visibleColumns))
      );
    } catch {}
  }, [visibleColumns]);

  /* =========================
     ШИРИНЫ КОЛОНОК
     ========================= */
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);
  const resizeColumn = useRef<string | null>(null);

  const saveColumnWidths = useCallback((widths: Record<string, number>) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('purchasePlanItemsTableColumnWidths', JSON.stringify(widths));
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('purchasePlanItemsTableColumnWidths');
      if (saved) setColumnWidths(JSON.parse(saved));
    } catch {}
  }, []);

  const getColumnWidth = useCallback(
    (columnKey: string) =>
      columnWidths[columnKey] || DEFAULT_COLUMN_WIDTHS[columnKey] || getDefaultColumnWidth(columnKey),
    [columnWidths]
  );

  const handleResizeStart = useCallback((e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(columnKey);
    resizeColumn.current = columnKey;
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = columnWidths[columnKey] || getDefaultColumnWidth(columnKey);
  }, [columnWidths]);

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

  /* =========================
     DRAG & DROP
     ========================= */
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const handleDragStart = (_: React.DragEvent, columnKey: string) => setDraggedColumn(columnKey);

  const handleDragOver = (e: React.DragEvent, columnKey: string) => {
    e.preventDefault();
    if (draggedColumn && draggedColumn !== columnKey) setDragOverColumn(columnKey);
  };

  const handleDragLeave = () => setDragOverColumn(null);

  const handleDrop = (_: React.DragEvent, targetColumnKey: string) => {
    if (!draggedColumn || draggedColumn === targetColumnKey) return;
    const next = [...columnOrder];
    const from = next.indexOf(draggedColumn);
    const to = next.indexOf(targetColumnKey);
    next.splice(from, 1);
    next.splice(to, 0, draggedColumn);
    setColumnOrder(next);
    saveColumnOrder(next);
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  /* =========================
     МЕНЮ ВЫБОРА КОЛОНОК
     ========================= */
  const [isColumnsMenuOpen, setIsColumnsMenuOpen] = useState(false);
  const [columnsMenuPosition, setColumnsMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const columnsMenuButtonRef = useRef<HTMLButtonElement>(null);

  const calculateMenuPosition = useCallback(() => {
    if (!columnsMenuButtonRef.current) return null;
    const rect = columnsMenuButtonRef.current.getBoundingClientRect();
    return { top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX };
  }, []);

  useEffect(() => {
    if (isColumnsMenuOpen) {
      const pos = calculateMenuPosition();
      if (pos) setColumnsMenuPosition(pos);
    }
  }, [isColumnsMenuOpen, calculateMenuPosition]);

  /* =========================
     ВСПОМОГАТЕЛЬНОЕ
     ========================= */
  const toggleColumnVisibility = (columnKey: string) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      next.has(columnKey) ? next.delete(columnKey) : next.add(columnKey);
      return next;
    });
  };

  const selectAllColumns = () => setVisibleColumns(new Set(ALL_COLUMNS.map(c => c.key)));

  const selectDefaultColumns = () => {
    localStorage.removeItem('purchasePlanItemsTableColumnOrder');
    localStorage.removeItem('purchasePlanItemsTableColumnWidths');

    setVisibleColumns(new Set(DEFAULT_VISIBLE_COLUMNS));
    setColumnOrder([...DEFAULT_VISIBLE_COLUMNS]);
    saveColumnOrder(DEFAULT_VISIBLE_COLUMNS);

    const widths: Record<string, number> = {};
    DEFAULT_VISIBLE_COLUMNS.forEach(c => {
      widths[c] = DEFAULT_COLUMN_WIDTHS[c] || getDefaultColumnWidth(c);
    });
    setColumnWidths(widths);
    saveColumnWidths(widths);
  };

  /* =========================
     ОТФИЛЬТРОВАННЫЙ ПОРЯДОК ДЛЯ РЕНДЕРА
     ========================= */
  const filteredColumnOrder = useMemo(() => {
    // Берем колонки в порядке columnOrder, фильтруем по видимости, затем фиксируем позиции
    const visibleOrdered = columnOrder.filter(col => visibleColumns.has(col));
    return fixColumnOrder(visibleOrdered);
  }, [columnOrder, visibleColumns]);

  return {
    visibleColumns,
    setVisibleColumns,
    columnOrder,
    filteredColumnOrder,
    columnWidths,
    draggedColumn,
    dragOverColumn,
    toggleColumnVisibility,
    selectAllColumns,
    selectDefaultColumns,
    getColumnWidth,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleResizeStart,
    isColumnsMenuOpen,
    setIsColumnsMenuOpen,
    columnsMenuPosition,
    setColumnsMenuPosition,
    columnsMenuButtonRef,
  };
};
