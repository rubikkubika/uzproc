import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { DEFAULT_VISIBLE_COLUMNS, ALL_COLUMNS, COLUMNS_VISIBILITY_STORAGE_KEY } from '../constants/purchase-plan-items.constants';
import { getDefaultColumnWidth } from '../utils/purchase-plan-items.utils';

export const usePurchasePlanItemsColumns = () => {
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') {
      return new Set(DEFAULT_VISIBLE_COLUMNS);
    }
    try {
      const saved = localStorage.getItem(COLUMNS_VISIBILITY_STORAGE_KEY);
      if (saved) {
        const savedColumns = JSON.parse(saved);
        if (Array.isArray(savedColumns)) {
          const filteredColumns = savedColumns.filter((col: unknown): col is string => typeof col === 'string');
          let columnsUpdated = false;
          // Если 'id' отсутствует в сохраненных колонках, добавляем его перед 'company'
          if (!filteredColumns.includes('id') && DEFAULT_VISIBLE_COLUMNS.includes('id')) {
            const companyIndex = filteredColumns.indexOf('company');
            if (companyIndex >= 0) {
              filteredColumns.splice(companyIndex, 0, 'id');
            } else {
              filteredColumns.unshift('id');
            }
            columnsUpdated = true;
          }
          // Если 'company' отсутствует в сохраненных колонках, добавляем его после 'id'
          if (!filteredColumns.includes('company') && DEFAULT_VISIBLE_COLUMNS.includes('company')) {
            const idIndex = filteredColumns.indexOf('id');
            if (idIndex >= 0) {
              filteredColumns.splice(idIndex + 1, 0, 'company');
            } else {
              // Если 'id' тоже нет, добавляем 'company' в начало
              filteredColumns.unshift('company');
            }
            columnsUpdated = true;
          }
          // Сохраняем обновленный список в localStorage, если были изменения
          if (columnsUpdated) {
            try {
              localStorage.setItem(COLUMNS_VISIBILITY_STORAGE_KEY, JSON.stringify(filteredColumns));
            } catch (err) {
              console.error('Error saving updated column visibility to localStorage:', err);
            }
          }
          return new Set(filteredColumns);
        }
      }
    } catch (err) {
      console.error('Error loading column visibility from localStorage:', err);
    }
    return new Set(DEFAULT_VISIBLE_COLUMNS);
  });

  const [isColumnsMenuOpen, setIsColumnsMenuOpen] = useState(false);
  const [columnsMenuPosition, setColumnsMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const columnsMenuButtonRef = useRef<HTMLButtonElement>(null);
  
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);
  const resizeColumn = useRef<string | null>(null);

  const [columnOrder, setColumnOrder] = useState<string[]>(DEFAULT_VISIBLE_COLUMNS);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const calculateFilterPosition = useCallback((buttonRef: React.RefObject<HTMLButtonElement | null>) => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      return {
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      };
    }
    return null;
  }, []);

  const saveColumnWidths = useCallback((widths: Record<string, number>) => {
    try {
      localStorage.setItem('purchasePlanItemsTableColumnWidths', JSON.stringify(widths));
    } catch (err) {
      console.error('Error saving column widths:', err);
    }
  }, []);

  const saveColumnOrder = useCallback((order: string[]) => {
    try {
      localStorage.setItem('purchasePlanItemsTableColumnOrder', JSON.stringify(order));
    } catch (err) {
      console.error('Error saving column order:', err);
    }
  }, []);

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

  const selectDefaultColumns = () => {
    setVisibleColumns(new Set(DEFAULT_VISIBLE_COLUMNS));
  };

  const getColumnWidth = useCallback((columnKey: string): number => {
    if (!columnWidths || typeof columnWidths !== 'object') {
      return getDefaultColumnWidth(columnKey);
    }
    return columnWidths[columnKey] || getDefaultColumnWidth(columnKey);
  }, [columnWidths]);

  const handleResizeStart = useCallback((e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(columnKey);
    resizeColumn.current = columnKey;
    resizeStartX.current = e.clientX;
    const currentWidth = columnWidths[columnKey] || getDefaultColumnWidth(columnKey);
    resizeStartWidth.current = currentWidth;
  }, [columnWidths]);

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

  // Сохраняем видимость колонок в localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(COLUMNS_VISIBILITY_STORAGE_KEY, JSON.stringify(Array.from(visibleColumns)));
      } catch (err) {
        console.error('Error saving column visibility to localStorage:', err);
      }
    }
  }, [visibleColumns]);

  // Обновляем позицию при открытии меню выбора колонок
  useEffect(() => {
    if (isColumnsMenuOpen && columnsMenuButtonRef.current) {
      const position = calculateFilterPosition(columnsMenuButtonRef);
      setColumnsMenuPosition(position);
    }
  }, [isColumnsMenuOpen, calculateFilterPosition]);

  // Закрываем меню выбора колонок при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isColumnsMenuOpen && columnsMenuButtonRef.current && !columnsMenuButtonRef.current.contains(event.target as Node)) {
        const menuElement = document.querySelector('.fixed.z-50.w-64.bg-white.border.border-gray-300');
        if (menuElement && !menuElement.contains(event.target as Node)) {
          setIsColumnsMenuOpen(false);
        }
      }
    };

    if (isColumnsMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isColumnsMenuOpen]);

  // Загружаем сохраненные ширины колонок из localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('purchasePlanItemsTableColumnWidths');
      if (saved) {
        const widths = JSON.parse(saved);
        setColumnWidths(widths);
      }
    } catch (err) {
      console.error('Error loading column widths:', err);
    }
  }, []);

  // Загружаем сохраненный порядок колонок из localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('purchasePlanItemsTableColumnOrder');
      if (saved) {
        const order = JSON.parse(saved);
        // Проверяем, что все колонки присутствуют
        const validOrder = order.filter((col: string) => DEFAULT_VISIBLE_COLUMNS.includes(col));
        const missingCols = DEFAULT_VISIBLE_COLUMNS.filter(col => !validOrder.includes(col));
        
        // Добавляем недостающие колонки в конец
        const finalOrder = [...validOrder, ...missingCols];
        setColumnOrder(finalOrder);
        
        // Сохраняем исправленный порядок
        try {
          localStorage.setItem('purchasePlanItemsTableColumnOrder', JSON.stringify(finalOrder));
        } catch (saveErr) {
          console.error('Error saving column order:', saveErr);
        }
      } else {
        // Если нет сохраненного порядка, используем дефолтный
        setColumnOrder(DEFAULT_VISIBLE_COLUMNS);
      }
    } catch (err) {
      console.error('Error loading column order:', err);
      // В случае ошибки используем дефолтный порядок
      setColumnOrder(DEFAULT_VISIBLE_COLUMNS);
    }
  }, []);

  // Обработчик изменения размера
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeColumn.current) return;
      const diff = e.clientX - resizeStartX.current;
      const newWidth = Math.max(50, resizeStartWidth.current + diff); // Минимальная ширина 50px
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

  // Фильтруем columnOrder, чтобы показывать только видимые колонки
  const filteredColumnOrder = useMemo(() => {
    return columnOrder.filter(columnKey => visibleColumns.has(columnKey));
  }, [columnOrder, visibleColumns]);

  return {
    visibleColumns,
    setVisibleColumns,
    isColumnsMenuOpen,
    setIsColumnsMenuOpen,
    columnsMenuPosition,
    columnsMenuButtonRef,
    columnWidths,
    isResizing,
    columnOrder,
    draggedColumn,
    dragOverColumn,
    filteredColumnOrder,
    toggleColumnVisibility,
    selectAllColumns,
    selectDefaultColumns,
    getColumnWidth,
    handleResizeStart,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
};
