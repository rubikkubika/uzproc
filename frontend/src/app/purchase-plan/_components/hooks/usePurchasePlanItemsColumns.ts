import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { DEFAULT_VISIBLE_COLUMNS, ALL_COLUMNS, COLUMNS_VISIBILITY_STORAGE_KEY, DEFAULT_COLUMN_WIDTHS } from '../constants/purchase-plan-items.constants';
import { getDefaultColumnWidth, getCompanyLogoPath } from '../utils/purchase-plan-items.utils';
import { PurchasePlanItem } from '../types/purchase-plan-items.types';

// Функция для исправления порядка колонок (вынесена вне компонента для использования в useState)
const fixColumnOrder = (order: string[]): string[] => {
  // Проверяем, что все колонки присутствуют
  const validOrder = order.filter((col: string) => DEFAULT_VISIBLE_COLUMNS.includes(col));
  const missingCols = DEFAULT_VISIBLE_COLUMNS.filter(col => !validOrder.includes(col));
  
  // Добавляем недостающие колонки в конец
  let finalOrder = [...validOrder, ...missingCols];
  
  // Исправляем порядок колонок: newContractDate -> status -> details
  const requiredOrder = ['newContractDate', 'status', 'details'];
  const hasAllRequired = requiredOrder.every(col => finalOrder.includes(col));
  
  if (hasAllRequired) {
    // Проверяем, правильный ли порядок
    const newContractDateIndex = finalOrder.indexOf('newContractDate');
    const statusIndex = finalOrder.indexOf('status');
    const detailsIndex = finalOrder.indexOf('details');
    
    // Если порядок неправильный (не newContractDate -> status -> details подряд)
    const isOrderCorrect = newContractDateIndex < statusIndex && statusIndex < detailsIndex &&
                           statusIndex === newContractDateIndex + 1 &&
                           detailsIndex === statusIndex + 1;
    
    if (!isOrderCorrect) {
      // Удаляем эти три колонки из текущего порядка
      finalOrder = finalOrder.filter(col => !requiredOrder.includes(col));
      
      // Находим позицию, где должны быть эти колонки (перед 'details' в дефолтном порядке)
      const detailsIndexInDefault = DEFAULT_VISIBLE_COLUMNS.indexOf('details');
      const insertIndex = detailsIndexInDefault >= 0 && detailsIndexInDefault <= finalOrder.length 
        ? detailsIndexInDefault 
        : finalOrder.length;
      
      // Вставляем колонки в правильном порядке
      finalOrder.splice(insertIndex, 0, ...requiredOrder);
    }
  }
  
  return finalOrder;
};

export const usePurchasePlanItemsColumns = (allItems: PurchasePlanItem[] = []) => {
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
          // Если 'details' отсутствует в сохраненных колонках, добавляем его в конец
          if (!filteredColumns.includes('details') && DEFAULT_VISIBLE_COLUMNS.includes('details')) {
            filteredColumns.push('details');
            columnsUpdated = true;
          }
          // Сохраняем обновленный список в localStorage, если были изменения
          if (columnsUpdated) {
            try {
              localStorage.setItem(COLUMNS_VISIBILITY_STORAGE_KEY, JSON.stringify(filteredColumns));
            } catch (err) {
              // Ошибка сохранения в localStorage игнорируется
            }
          }
          return new Set(filteredColumns);
        }
      }
    } catch (err) {
      // Ошибка загрузки из localStorage игнорируется
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


  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('purchasePlanItemsTableColumnOrder');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Исправляем порядок при загрузке из localStorage
            return fixColumnOrder(parsed);
          }
        }
      }
    } catch (err) {
      // Ошибка загрузки из localStorage игнорируется
    }
    return DEFAULT_VISIBLE_COLUMNS;
  });
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const saveColumnOrder = useCallback((order: string[]) => {
    try {
      localStorage.setItem('purchasePlanItemsTableColumnOrder', JSON.stringify(order));
    } catch (err) {
      // Ошибка сохранения в localStorage игнорируется
    }
  }, []);

  // Синхронизируем columnOrder с visibleColumns при изменении visibleColumns
  // И принудительно исправляем порядок колонок newContractDate -> status -> details
  useEffect(() => {
    setColumnOrder(prevOrder => {
      const newOrder = [...prevOrder];
      let updated = false;
      
      // Находим индекс purchaserCompany (Исполнитель) для вставки новых колонок после него
      const purchaserCompanyIndex = newOrder.indexOf('purchaserCompany');
      let insertAfterIndex = purchaserCompanyIndex >= 0 ? purchaserCompanyIndex + 1 : newOrder.length;
      
      // Собираем колонки, которые нужно добавить
      const columnsToAdd: string[] = [];
      visibleColumns.forEach(columnKey => {
        if (!newOrder.includes(columnKey)) {
          columnsToAdd.push(columnKey);
        }
      });
      
      // Добавляем новые колонки после purchaserCompany
      if (columnsToAdd.length > 0) {
        newOrder.splice(insertAfterIndex, 0, ...columnsToAdd);
        updated = true;
      }
      
      // Удаляем колонки из columnOrder, которых нет в visibleColumns (кроме обязательных)
      const mandatoryColumns = ['details']; // Колонка details всегда должна быть
      const filteredOrder = newOrder.filter(columnKey => 
        visibleColumns.has(columnKey) || mandatoryColumns.includes(columnKey)
      );
      
      if (filteredOrder.length !== newOrder.length) {
        updated = true;
      }
      
      // Исправляем порядок колонок newContractDate -> status -> details
      const finalOrder = fixColumnOrder(updated ? filteredOrder : newOrder);
      const orderChanged = JSON.stringify(finalOrder) !== JSON.stringify(prevOrder);
      
      if (orderChanged) {
        saveColumnOrder(finalOrder);
        return finalOrder;
      }
      
      return prevOrder;
    });
  }, [visibleColumns, saveColumnOrder]);

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
      // Ошибка сохранения в localStorage игнорируется
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
    // Очищаем сохраненные значения из localStorage ПЕРЕД установкой новых значений
    try {
      localStorage.removeItem('purchasePlanItemsTableColumnOrder');
      localStorage.removeItem('purchasePlanItemsTableColumnWidths');
    } catch (err) {
      // Ошибка очистки localStorage игнорируется
    }
    
    // Восстанавливаем список видимых колонок
    setVisibleColumns(new Set(DEFAULT_VISIBLE_COLUMNS));
    
    // Восстанавливаем порядок колонок по умолчанию (уже в правильном порядке)
    setColumnOrder([...DEFAULT_VISIBLE_COLUMNS]);
    saveColumnOrder(DEFAULT_VISIBLE_COLUMNS);
    
    // Сбрасываем флаги измененных пользователем колонок для автоматического расчета ширины
    userResizedColumnsRef.current.clear();
    
    // Восстанавливаем ширину колонок по умолчанию
    // Создаем объект с дефолтными ширинами только для видимых колонок
    const defaultWidths: Record<string, number> = {};
    DEFAULT_VISIBLE_COLUMNS.forEach(columnKey => {
      defaultWidths[columnKey] = DEFAULT_COLUMN_WIDTHS[columnKey] || getDefaultColumnWidth(columnKey);
    });
    setColumnWidths(defaultWidths);
    saveColumnWidths(defaultWidths);
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
        // Ошибка сохранения в localStorage игнорируется
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
    if (!isColumnsMenuOpen) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        columnsMenuButtonRef.current &&
        !columnsMenuButtonRef.current.contains(target)
      ) {
        // Ищем меню по data-атрибуту
        const menuElement = document.querySelector('[data-columns-menu]');
        if (menuElement && !menuElement.contains(target)) {
          setIsColumnsMenuOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isColumnsMenuOpen, setIsColumnsMenuOpen]);

  // Загружаем сохраненные ширины колонок из localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('purchasePlanItemsTableColumnWidths');
      if (saved) {
        const widths = JSON.parse(saved);
        setColumnWidths(widths);
        // Отмечаем колонки с сохраненными значениями как измененные пользователем
        // НО для company и purchaserCompany НЕ отмечаем, чтобы автоматический расчет всегда применялся
        const columnsToAutoSize = ['id'] as const;
        columnsToAutoSize.forEach(columnKey => {
          if (widths[columnKey] !== undefined) {
            userResizedColumnsRef.current.add(columnKey);
          }
        });
      }
    } catch (err) {
      // Ошибка загрузки из localStorage игнорируется
    }
  }, []);

  // Принудительно исправляем порядок колонок при монтировании
  const orderFixedRef = useRef(false);
  useEffect(() => {
    if (orderFixedRef.current) return; // Исправляем только один раз
    
    setColumnOrder(prevOrder => {
      const fixedOrder = fixColumnOrder(prevOrder);
      
      // Проверяем, правильный ли порядок
      const requiredOrder = ['newContractDate', 'status', 'details'];
      const newContractDateIndex = fixedOrder.indexOf('newContractDate');
      const statusIndex = fixedOrder.indexOf('status');
      const detailsIndex = fixedOrder.indexOf('details');
      
      const isOrderCorrect = newContractDateIndex >= 0 && statusIndex >= 0 && detailsIndex >= 0 &&
                             newContractDateIndex < statusIndex && statusIndex < detailsIndex &&
                             statusIndex === newContractDateIndex + 1 &&
                             detailsIndex === statusIndex + 1;
      
      if (!isOrderCorrect) {
        // Принудительно устанавливаем правильный порядок
        const orderWithoutRequired = fixedOrder.filter(col => !requiredOrder.includes(col));
        const detailsIndexInDefault = DEFAULT_VISIBLE_COLUMNS.indexOf('details');
        const insertIndex = detailsIndexInDefault >= 0 && detailsIndexInDefault <= orderWithoutRequired.length 
          ? detailsIndexInDefault 
          : orderWithoutRequired.length;
        const correctedOrder = [...orderWithoutRequired];
        correctedOrder.splice(insertIndex, 0, ...requiredOrder);
        
        orderFixedRef.current = true;
        saveColumnOrder(correctedOrder);
        return correctedOrder;
      }
      
      orderFixedRef.current = true;
      return fixedOrder;
    });
  }, [saveColumnOrder]);

  // Ref для отслеживания того, были ли колонки изменены пользователем вручную
  const userResizedColumnsRef = useRef<Set<string>>(new Set());

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
      // Отмечаем колонку как измененную пользователем вручную
      if (resizeColumn.current) {
        userResizedColumnsRef.current.add(resizeColumn.current);
      }
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

  // Функция для расчета ширины текста
  const measureTextWidth = useCallback((text: string, fontSize: string, fontFamily: string = 'system-ui, -apple-system'): number => {
    if (typeof window === 'undefined') return 0;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return 0;
    context.font = `${fontSize} ${fontFamily}`;
    return context.measureText(text).width;
  }, []);

  // Автоматический расчет ширины для колонок id, company, purchaserCompany на основе контента
  // Применяется только при первой загрузке или если текущая ширина меньше рассчитанной
  useEffect(() => {
    if (allItems.length === 0) return;

    const columnsToAutoSize = ['id', 'company', 'purchaserCompany'] as const;
    const updatedWidths: Record<string, number> = {};

    columnsToAutoSize.forEach(columnKey => {
      if (!visibleColumns.has(columnKey)) return;

      // Если пользователь уже изменил ширину этой колонки вручную, пропускаем автоматический расчет
      if (userResizedColumnsRef.current.has(columnKey)) return;

      // Находим заголовок колонки
      const column = ALL_COLUMNS.find(col => col.key === columnKey);
      const headerText = column?.label || '';
      
      // Определяем размер шрифта для колонки
      const fontSize = (columnKey === 'company' || columnKey === 'purchaserCompany') ? '16.8px' : '13.44px';
      const headerFontSize = '12px'; // Размер шрифта заголовка
      
      // Измеряем ширину заголовка (без логотипа, так как в заголовке его нет)
      const headerWidth = measureTextWidth(headerText, headerFontSize);
      let maxTextWidth = headerWidth;

      // Измеряем ширину всех значений в колонке - только ширину текста
      allItems.forEach(item => {
        let cellText = '';
        
        if (columnKey === 'id') {
          cellText = String(item.id || '');
        } else if (columnKey === 'company') {
          cellText = item.company || '-';
        } else if (columnKey === 'purchaserCompany') {
          cellText = item.purchaserCompany || '-';
        }
        
        const textWidth = measureTextWidth(cellText, fontSize);
        maxTextWidth = Math.max(maxTextWidth, textWidth);
      });
      
      // Рассчитываем итоговую ширину колонки:
      // - ширина текста (максимальная из всех)
      // - padding td: 8px слева + 8px справа = 16px
      // - padding span: 8px слева + 8px справа = 16px (только для company и purchaserCompany)
      // - логотип: 22.4px (если есть, только для company и purchaserCompany)
      // - gap: 6px (если есть логотип)
      let maxWidth = maxTextWidth + 16; // padding td
      
      // Для company и purchaserCompany добавляем padding span и проверяем наличие логотипа
      if (columnKey === 'company' || columnKey === 'purchaserCompany') {
        maxWidth += 16; // padding span
        
        // Проверяем, есть ли хотя бы один элемент с логотипом
        const hasAnyLogo = allItems.some(item => {
          const companyName = columnKey === 'company' ? item.company : item.purchaserCompany;
          if (!companyName) return false;
          const logoPath = getCompanyLogoPath(companyName);
          return logoPath !== null;
        });
        
        if (hasAnyLogo) {
          maxWidth += 22.4 + 6; // ширина логотипа (22.4px) + gap (6px = gap-1.5)
        }
      }
      
      // Уменьшаем ширину для более компактных колонок
      // Для company и purchaserCompany уменьшаем на 20%, для остальных на 10%
      if (columnKey === 'company' || columnKey === 'purchaserCompany') {
        maxWidth = Math.ceil(maxWidth * 0.8); // Уменьшаем на 20%
      } else {
        maxWidth = Math.ceil(maxWidth * 0.9); // Уменьшаем на 10%
      }

      // Устанавливаем минимальную ширину
      const minWidth = DEFAULT_COLUMN_WIDTHS[columnKey] || getDefaultColumnWidth(columnKey);
      const calculatedWidth = Math.max(maxWidth, minWidth);
      
      // Для колонок company и purchaserCompany всегда применяем новый расчет
      // (если они не были изменены пользователем вручную в этой сессии через resize)
      if ((columnKey === 'company' || columnKey === 'purchaserCompany') && !userResizedColumnsRef.current.has(columnKey)) {
        updatedWidths[columnKey] = calculatedWidth;
      } else if (columnKey !== 'company' && columnKey !== 'purchaserCompany') {
        // Для остальных колонок применяем автоматический расчет только если:
        // 1. Текущая ширина не установлена (первая загрузка)
        // 2. Или текущая ширина меньше рассчитанной (контент не помещается)
        const currentWidth = columnWidths[columnKey];
        if (!currentWidth || currentWidth < calculatedWidth) {
          updatedWidths[columnKey] = calculatedWidth;
        }
      }
    });

    // Обновляем ширины только если они изменились
    if (Object.keys(updatedWidths).length > 0) {
      setColumnWidths(prev => {
        let hasChanges = false;
        const newWidths = { ...prev };
        
        Object.entries(updatedWidths).forEach(([key, width]) => {
          if (newWidths[key] !== width) {
            newWidths[key] = width;
            hasChanges = true;
          }
        });

        if (hasChanges) {
          saveColumnWidths(newWidths);
          return newWidths;
        }
        return prev;
      });
    }
  }, [allItems, visibleColumns, measureTextWidth, saveColumnWidths, columnWidths]);

  // Фильтруем columnOrder, чтобы показывать только видимые колонки
  const filteredColumnOrder = useMemo(() => {
    return columnOrder.filter(columnKey => visibleColumns.has(columnKey));
  }, [columnOrder, Array.from(visibleColumns).sort().join(',')]);

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
