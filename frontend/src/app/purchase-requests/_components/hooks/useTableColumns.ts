import { useState, useRef, useEffect, useCallback } from 'react';
import { DEFAULT_VISIBLE_COLUMNS, COLUMNS_VISIBILITY_STORAGE_KEY, ALL_COLUMNS } from '../constants/columns.constants';

export function useTableColumns() {
  // Состояние для видимости колонок
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
          const missingCols = DEFAULT_VISIBLE_COLUMNS.filter(col => !filteredColumns.includes(col));
          if (missingCols.length > 0) {
            filteredColumns.push(...missingCols);
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

  // Состояние для порядка колонок
  const defaultOrder = ['excludeFromInWork', 'idPurchaseRequest', 'cfo', 'purchaser', 'name', 'purchaseRequestCreationDate', 'comments', 'budgetAmount', 'requiresPurchase', 'hasLinkedPlanItem', 'status', 'track', 'rating'];
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

  // Загружаем порядок колонок из localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('purchaseRequestsTableColumnOrder');

      if (saved) {
        const order = JSON.parse(saved);

        // Проверяем, есть ли hasLinkedPlanItem в сохраненном порядке
        // Если нет - очищаем и используем defaultOrder (миграция)
        if (!order.includes('hasLinkedPlanItem')) {
          console.log('Migrating column order to include hasLinkedPlanItem');
          localStorage.removeItem('purchaseRequestsTableColumnOrder');
          setColumnOrder(defaultOrder);
          localStorage.setItem('purchaseRequestsTableColumnOrder', JSON.stringify(defaultOrder));
          return;
        }

        const validOrder = order.filter((col: string) => defaultOrder.includes(col));
        const missingCols = defaultOrder.filter(col => !validOrder.includes(col));

        let finalOrder = [...validOrder, ...missingCols];

        // Вставляем hasLinkedPlanItem перед status
        const hasLinkedPlanItemIndex = finalOrder.indexOf('hasLinkedPlanItem');
        const statusIndex = finalOrder.indexOf('status');

        // Если hasLinkedPlanItem есть в массиве и она НЕ непосредственно перед status
        if (hasLinkedPlanItemIndex !== -1 && statusIndex !== -1 && hasLinkedPlanItemIndex !== statusIndex - 1) {
          // Удаляем hasLinkedPlanItem из текущего места
          finalOrder = finalOrder.filter(col => col !== 'hasLinkedPlanItem');
          // Находим новый индекс status (после удаления hasLinkedPlanItem)
          const newStatusIndex = finalOrder.indexOf('status');
          // Вставляем hasLinkedPlanItem перед status
          if (newStatusIndex !== -1) {
            finalOrder.splice(newStatusIndex, 0, 'hasLinkedPlanItem');
          } else {
            finalOrder.push('hasLinkedPlanItem');
          }
        }

        setColumnOrder(finalOrder);
        try {
          localStorage.setItem('purchaseRequestsTableColumnOrder', JSON.stringify(finalOrder));
        } catch (saveErr) {
          console.error('Error saving column order:', saveErr);
        }
      } else {
        setColumnOrder(defaultOrder);
      }
    } catch (err) {
      console.error('Error loading column order:', err);
      setColumnOrder(defaultOrder);
    }
  }, []);

  // Загружаем ширины колонок из localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('purchaseRequestsTableColumnWidths');
      if (saved) {
        const widths = JSON.parse(saved);
        setColumnWidths(widths);
      }
    } catch (err) {
      console.error('Error loading column widths:', err);
    }
  }, []);

  // Сохраняем видимость колонок в localStorage
  useEffect(() => {
    try {
      localStorage.setItem(COLUMNS_VISIBILITY_STORAGE_KEY, JSON.stringify(Array.from(visibleColumns)));
    } catch (err) {
      console.error('Error saving column visibility to localStorage:', err);
    }
  }, [visibleColumns]);

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

  const selectDefaultColumns = () => {
    setVisibleColumns(new Set(DEFAULT_VISIBLE_COLUMNS));
  };

  // Сохранение порядка колонок
  const saveColumnOrder = useCallback((order: string[]) => {
    try {
      localStorage.setItem('purchaseRequestsTableColumnOrder', JSON.stringify(order));
    } catch (err) {
      console.error('Error saving column order:', err);
    }
  }, []);

  // Сохранение ширин колонок
  const saveColumnWidths = useCallback((widths: Record<string, number>) => {
    try {
      localStorage.setItem('purchaseRequestsTableColumnWidths', JSON.stringify(widths));
    } catch (err) {
      console.error('Error saving column widths:', err);
    }
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
      excludeFromInWork: 96,
      idPurchaseRequest: 64,
      cfo: 80,
      purchaseRequestInitiator: 128,
      purchaser: 150,
      name: 192,
      budgetAmount: 112,
      isPlanned: 96,
      hasLinkedPlanItem: 112,
      requiresPurchase: 96,
      status: 150,
      purchaseRequestCreationDate: 128,
      comments: 100,
      costType: 128,
      contractType: 128,
      contractDurationMonths: 128,
      track: 120,
      rating: 96,
      guid: 192,
      purchaseRequestPlanYear: 96,
      company: 128,
      mcc: 96,
      currency: 96,
      createdAt: 160,
      updatedAt: 160,
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
