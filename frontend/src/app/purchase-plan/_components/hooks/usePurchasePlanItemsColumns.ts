import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  DEFAULT_VISIBLE_COLUMNS,
  ALL_COLUMNS,
  COLUMNS_VISIBILITY_STORAGE_KEY,
  DEFAULT_COLUMN_WIDTHS,
  MAX_COLUMN_WIDTH,
} from '../constants/purchase-plan-items.constants';
import { getDefaultColumnWidth } from '../utils/purchase-plan-items.utils';
import { PurchasePlanItem } from '../types/purchase-plan-items.types';

/* -------------------------
   Фиксируем порядок колонок
------------------------- */
const fixColumnOrder = (order: string[]): string[] => {
  const validKeys = new Set(ALL_COLUMNS.map(c => c.key));
  const valid = order.filter(col => validKeys.has(col as any));
  const finalOrder = [...valid];
  DEFAULT_VISIBLE_COLUMNS.forEach((col, index) => {
    if (!finalOrder.includes(col)) finalOrder.splice(index, 0, col);
  });
  return finalOrder;
};

/* -------------------------
   Измерение текста через canvas
------------------------- */
const getTextWidth = (text: string, font = '14px Arial') => {
  if (typeof document === 'undefined') return 0;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return 0;
  context.font = font;
  return context.measureText(text).width;
};

/* -------------------------
   Хук
------------------------- */
export const usePurchasePlanItemsColumns = (allItems: PurchasePlanItem[] = []) => {
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set(DEFAULT_VISIBLE_COLUMNS);
    try {
      const saved = localStorage.getItem(COLUMNS_VISIBILITY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const savedSet = new Set(parsed.filter(col => typeof col === 'string'));
          // Миграция: добавляем недостающие дефолтные колонки к сохранённым настройкам
          // Это нужно для корректного отображения новых обязательных колонок у пользователей
          // со старыми настройками localStorage
          let migrated = false;
          DEFAULT_VISIBLE_COLUMNS.forEach(col => {
            if (!savedSet.has(col)) {
              savedSet.add(col);
              migrated = true;
            }
          });
          // Если были добавлены новые колонки, сохраняем обновлённый набор
          if (migrated) {
            localStorage.setItem(COLUMNS_VISIBILITY_STORAGE_KEY, JSON.stringify(Array.from(savedSet)));
          }
          return savedSet;
        }
      }
    } catch {}
    return new Set(DEFAULT_VISIBLE_COLUMNS);
  });

  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [...DEFAULT_VISIBLE_COLUMNS];
    try {
      const saved = localStorage.getItem('purchasePlanItemsTableColumnOrder');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return fixColumnOrder(parsed);
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

  useEffect(() => {
    setColumnOrder(prev => {
      // Фильтруем существующий порядок, оставляя только видимые колонки
      const filtered = prev.filter(col => visibleColumns.has(col));
      // Добавляем новые видимые колонки, которых нет в порядке
      const newColumns = Array.from(visibleColumns).filter(col => !prev.includes(col));
      // Объединяем: сначала существующий порядок, потом новые колонки
      const withNewColumns = [...filtered, ...newColumns];
      // Применяем fixColumnOrder для правильного порядка дефолтных колонок
      // fixColumnOrder переупорядочит только дефолтные колонки, новые останутся в конце
      const next = fixColumnOrder(withNewColumns);
      if (JSON.stringify(prev) !== JSON.stringify(next)) {
        saveColumnOrder(next);
        return next;
      }
      return prev;
    });
  }, [visibleColumns, saveColumnOrder]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(
        COLUMNS_VISIBILITY_STORAGE_KEY,
        JSON.stringify(Array.from(visibleColumns))
      );
    } catch {}
  }, [visibleColumns]);

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem('purchasePlanItemsTableColumnWidths');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed;
      }
    } catch {}
    return {};
  });

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

  const handleResizeStart = useCallback((e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(columnKey);
    resizeColumn.current = columnKey;
    resizeStartX.current = e.clientX;
    const currentWidth = columnWidths[columnKey] ?? DEFAULT_COLUMN_WIDTHS[columnKey] ?? 100;
    resizeStartWidth.current = currentWidth;
  }, [columnWidths]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeColumn.current) return;
      const diff = e.clientX - resizeStartX.current;
      // Вычисляем новую ширину
      const newWidth = Math.max(50, resizeStartWidth.current + diff);
      // Обновляем состояние
      setColumnWidths(prev => {
        const updated = { ...prev, [resizeColumn.current!]: newWidth };
        saveColumnWidths(updated);
        return updated;
      });
      // Обновляем resizeStartWidth для следующего движения
      resizeStartWidth.current = newWidth;
      resizeStartX.current = e.clientX;
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
     Динамические ширины по содержимому
  ========================= */
  const dynamicWidths = useMemo(() => {
    const result: Record<string, number> = {};
    ALL_COLUMNS.forEach(({ key }) => {
      const headerWidth = getTextWidth(key);
      const maxContentWidth = Math.max(
        0,
        ...allItems.map(item => getTextWidth(String(item[key as keyof PurchasePlanItem] ?? '')))
      );
      result[key] = Math.max(headerWidth, maxContentWidth) + 24; // padding
    });
    return result;
  }, [allItems]);

  const getColumnWidth = useCallback(
    (columnKey: string) => {
      if (columnWidths[columnKey] !== undefined)
        return columnWidths[columnKey];

      return dynamicWidths[columnKey] ?? DEFAULT_COLUMN_WIDTHS[columnKey] ?? 100;
    },
    [columnWidths, dynamicWidths]
  );

  // --------------------------
  // Drag & Drop и остальная логика (как было)
  // --------------------------

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

  /* --------------------------
     Меню колонок
  -------------------------- */
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

  /* --------------------------
     Видимость колонок
  -------------------------- */
  const toggleColumnVisibility = (columnKey: string) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      const wasVisible = next.has(columnKey);
      if (wasVisible) {
        next.delete(columnKey);
      } else {
        next.add(columnKey);
        // Если колонка добавляется и её нет в columnOrder, добавляем её после newContractDate
        setColumnOrder(currentOrder => {
          if (!currentOrder.includes(columnKey)) {
            const newContractDateIndex = currentOrder.indexOf('newContractDate');
            let updated: string[];
            if (newContractDateIndex !== -1) {
              // Вставляем после newContractDate
              updated = [
                ...currentOrder.slice(0, newContractDateIndex + 1),
                columnKey,
                ...currentOrder.slice(newContractDateIndex + 1)
              ];
            } else {
              // Если newContractDate нет, добавляем в конец
              updated = [...currentOrder, columnKey];
            }
            saveColumnOrder(updated);
            return updated;
          }
          return currentOrder;
        });
      }
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
      const calculatedWidth = dynamicWidths[c] ?? DEFAULT_COLUMN_WIDTHS[c] ?? 100;
      // Применяем ограничение MAX_COLUMN_WIDTH только при сбросе к значениям по умолчанию
      widths[c] = Math.min(calculatedWidth, MAX_COLUMN_WIDTH);
    });
    setColumnWidths(widths);
    saveColumnWidths(widths);
  };

  const filteredColumnOrder = useMemo(() => {
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
