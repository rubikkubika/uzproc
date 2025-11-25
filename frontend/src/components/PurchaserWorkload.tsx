'use client';

import { useState, useEffect, useRef } from 'react';
import { Settings, Image as ImageIcon } from 'lucide-react';
import html2canvas from 'html2canvas';

interface PurchaseData {
  [key: string]: string;
}

interface PurchaserStats {
  purchaser: string;
  totalPurchases: number;
  activePurchases: number;
  completedPurchases: number;
  pendingPurchases: number;
  averageDays: number;
  totalAmount: number;
}

interface PurchaserWorkloadProps {
  onPurchaserDoubleClick?: (purchaser: string) => void;
}

const STORAGE_KEY = 'purchaserWorkload_selectedPurchasers';

export default function PurchaserWorkload({ onPurchaserDoubleClick }: PurchaserWorkloadProps) {
  const [stats, setStats] = useState<PurchaserStats[]>([]);
  const [allStats, setAllStats] = useState<PurchaserStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [allPurchases, setAllPurchases] = useState<PurchaseData[]>([]);
  const [selectedPurchaser, setSelectedPurchaser] = useState<string | null>(null);
  const [filteredPurchases, setFilteredPurchases] = useState<PurchaseData[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('in-progress');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedPurchasers, setSelectedPurchasers] = useState<Set<string>>(new Set());
  const [purchaseFilters, setPurchaseFilters] = useState({
    requestNumber: '',
    subject: '',
    cfo: new Set<string>(),
    amountMin: '',
    amountMax: '',
    dateFrom: '',
    dateTo: ''
  });
  const [isCfoFilterOpen, setIsCfoFilterOpen] = useState(false);

  // Загрузка сохраненных выбранных закупщиков из localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const savedPurchasers = JSON.parse(saved);
        setSelectedPurchasers(new Set(savedPurchasers));
      }
    } catch (err) {
      console.error('Error loading saved purchasers:', err);
    }
  }, []);

  useEffect(() => {
    fetch('/api/purchases-data?all=true')
      .then(res => res.json())
      .then(data => {
        setAllPurchases(data);
        calculateWorkload(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error:', err);
        setLoading(false);
      });
  }, []);

  // Фильтрация статистики по выбранным закупщикам
  useEffect(() => {
    if (selectedPurchasers.size === 0) {
      // Если ничего не выбрано, показываем всех
      setStats(allStats);
    } else {
      // Фильтруем по выбранным закупщикам
      setStats(allStats.filter(stat => selectedPurchasers.has(stat.purchaser)));
    }
  }, [selectedPurchasers, allStats]);

  // Фильтрация закупок по выбранному закупщику, статусу и фильтрам столбцов
  useEffect(() => {
    if (selectedPurchaser) {
      let filtered = allPurchases.filter(item => {
        const purchaser = item['Закупшик'] || 'Не назначен';
        return purchaser === selectedPurchaser;
      });

      // Применяем фильтр по статусу закупочной процедуры
      if (statusFilter !== 'all') {
        filtered = filtered.filter(item => {
          const procedureStatus = item['Статус закупочной процедуры'] || '';
          if (statusFilter === 'agreed') {
            return procedureStatus.includes('Согласован');
          } else if (statusFilter === 'not-agreed') {
            return procedureStatus.includes('Не согласован');
          } else if (statusFilter === 'deleted') {
            return procedureStatus.includes('Удалена');
          } else if (statusFilter === 'in-progress') {
            return procedureStatus && !procedureStatus.includes('Согласован') && !procedureStatus.includes('Не согласован') && !procedureStatus.includes('Удалена');
          }
          return true;
        });
      }

      // Фильтр по № заявки
      if (purchaseFilters.requestNumber) {
        const searchTerm = purchaseFilters.requestNumber.toLowerCase();
        filtered = filtered.filter(item => {
          const requestNumber = (item['№ заявки'] || '').toLowerCase();
          return requestNumber.includes(searchTerm);
        });
      }

      // Фильтр по предмету ЗП
      if (purchaseFilters.subject) {
        const searchTerm = purchaseFilters.subject.toLowerCase();
        filtered = filtered.filter(item => {
          const subject = (item['Предмет ЗП'] || '').toLowerCase();
          return subject.includes(searchTerm);
        });
      }

      // Фильтр по ЦФО (множественный выбор)
      if (purchaseFilters.cfo.size > 0) {
        filtered = filtered.filter(item => {
          const cfo = item['ЦФО'] || '';
          return purchaseFilters.cfo.has(cfo);
        });
      }

      // Фильтр по сумме
      if (purchaseFilters.amountMin) {
        const min = parseFloat(purchaseFilters.amountMin);
        if (!isNaN(min)) {
          filtered = filtered.filter(item => {
            const amountStr = item['Cумма предпологаемого контракта ФАКТ'] || '0';
            const amount = parseFloat(amountStr.replace(/\s/g, '').replace(',', '.'));
            return !isNaN(amount) && amount >= min;
          });
        }
      }
      if (purchaseFilters.amountMax) {
        const max = parseFloat(purchaseFilters.amountMax);
        if (!isNaN(max)) {
          filtered = filtered.filter(item => {
            const amountStr = item['Cумма предпологаемого контракта ФАКТ'] || '0';
            const amount = parseFloat(amountStr.replace(/\s/g, '').replace(',', '.'));
            return !isNaN(amount) && amount <= max;
          });
        }
      }

      // Фильтр по дате создания
      if (purchaseFilters.dateFrom) {
        filtered = filtered.filter(item => {
          const dateStr = item['Дата создания ЗП'] || '';
          if (!dateStr) return false;
          try {
            const itemDate = parseDate(dateStr);
            // dateFrom в формате YYYY-MM-DD из input type="date"
            const fromDate = new Date(purchaseFilters.dateFrom);
            fromDate.setHours(0, 0, 0, 0);
            return itemDate && itemDate >= fromDate;
          } catch {
            return false;
          }
        });
      }
      if (purchaseFilters.dateTo) {
        filtered = filtered.filter(item => {
          const dateStr = item['Дата создания ЗП'] || '';
          if (!dateStr) return false;
          try {
            const itemDate = parseDate(dateStr);
            // dateTo в формате YYYY-MM-DD из input type="date"
            const toDate = new Date(purchaseFilters.dateTo);
            toDate.setHours(23, 59, 59, 999);
            return itemDate && itemDate <= toDate;
          } catch {
            return false;
          }
        });
      }

      // Сортировка по номеру заявки от большего к меньшему
      filtered.sort((a, b) => {
        const numA = parseInt((a['№ заявки'] || '0').replace(/\D/g, '')) || 0;
        const numB = parseInt((b['№ заявки'] || '0').replace(/\D/g, '')) || 0;
        return numB - numA; // От большего к меньшему
      });

      setFilteredPurchases(filtered);
    }
  }, [selectedPurchaser, statusFilter, allPurchases, purchaseFilters]);

  const calculateWorkload = (purchases: PurchaseData[]) => {
    const purchaserMap = new Map<string, {
      total: number;
      active: number;
      completed: number;
      pending: number;
      totalDays: number;
      purchasesWithDays: number;
      totalAmount: number;
    }>();

    purchases.forEach(item => {
      const purchaser = item['Закупшик'] || 'Не назначен';
      const status = item['Состояние заявки на ЗП'] || '';
      const amount = parseFloat((item['Cумма предпологаемого контракта ФАКТ'] || '0').replace(/\s/g, '').replace(',', '.'));
      const totalDaysStr = item['Дней всего согласования ЗП'] || '';
      const totalDays = parseInt(totalDaysStr) || 0;

      if (!purchaserMap.has(purchaser)) {
        purchaserMap.set(purchaser, {
          total: 0,
          active: 0,
          completed: 0,
          pending: 0,
          totalDays: 0,
          purchasesWithDays: 0,
          totalAmount: 0
        });
      }

      const stats = purchaserMap.get(purchaser)!;
      stats.total++;

      if (status.includes('Согласован')) {
        stats.completed++;
      } else if (status && !status.includes('Удалена')) {
        stats.active++;
      }

      if (totalDays > 0) {
        stats.totalDays += totalDays;
        stats.purchasesWithDays++;
      }

      if (!isNaN(amount)) {
        stats.totalAmount += amount;
      }
    });

    const result: PurchaserStats[] = Array.from(purchaserMap.entries()).map(([purchaser, data]) => ({
      purchaser,
      totalPurchases: data.total,
      activePurchases: data.active,
      completedPurchases: data.completed,
      pendingPurchases: data.active, // Активные = в работе
      averageDays: data.purchasesWithDays > 0 ? Math.round(data.totalDays / data.purchasesWithDays) : 0,
      totalAmount: data.totalAmount
    }));

    // Сортируем по убыванию нагрузки (активные + общее количество)
    const sorted = result.sort((a, b) => (b.activePurchases + b.totalPurchases) - (a.activePurchases + a.totalPurchases));
    setAllStats(sorted);
    // Применяем фильтр по выбранным закупщикам
    if (selectedPurchasers.size === 0) {
      setStats(sorted);
    } else {
      setStats(sorted.filter(stat => selectedPurchasers.has(stat.purchaser)));
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  const formatNumberFromString = (value: string) => {
    if (!value || value.trim() === '') return '-';
    const cleanedValue = value.replace(/\s/g, '').replace(',', '.');
    const num = parseFloat(cleanedValue);
    if (isNaN(num)) return value;
    return new Intl.NumberFormat('ru-RU', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    }).format(num);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      if (dateStr.includes('.')) {
        const [datePart] = dateStr.split(' ');
        return datePart;
      }
      const [day, month, year] = dateStr.split('/');
      return `${day}.${month}.${year}`;
    } catch {
      return dateStr;
    }
  };

  const handlePurchaserDoubleClick = (purchaser: string) => {
    setSelectedPurchaser(purchaser);
    // Вызываем колбэк, если он передан (для совместимости)
    onPurchaserDoubleClick?.(purchaser);
  };

  const handleBack = () => {
    setSelectedPurchaser(null);
    setStatusFilter('in-progress');
    setPurchaseFilters({
      requestNumber: '',
      subject: '',
      cfo: new Set<string>(),
      amountMin: '',
      amountMax: '',
      dateFrom: '',
      dateTo: ''
    });
    setIsCfoFilterOpen(false);
  };

  const handlePurchaseFilterChange = (key: string, value: string) => {
    setPurchaseFilters(prev => ({ ...prev, [key]: value }));
  };

  // Закрываем выпадающий список ЦФО при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isCfoFilterOpen && !target.closest('.cfo-filter-container')) {
        setIsCfoFilterOpen(false);
      }
    };

    if (isCfoFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isCfoFilterOpen]);

  const clearPurchaseFilters = () => {
    setPurchaseFilters({
      requestNumber: '',
      subject: '',
      cfo: new Set<string>(),
      amountMin: '',
      amountMax: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  const hasActivePurchaseFilters = () => {
    return purchaseFilters.requestNumber !== '' ||
           purchaseFilters.subject !== '' ||
           purchaseFilters.cfo.size > 0 ||
           purchaseFilters.amountMin !== '' ||
           purchaseFilters.amountMax !== '' ||
           purchaseFilters.dateFrom !== '' ||
           purchaseFilters.dateTo !== '';
  };

  const handleCfoToggle = (cfo: string) => {
    const newCfoSet = new Set(purchaseFilters.cfo);
    if (newCfoSet.has(cfo)) {
      newCfoSet.delete(cfo);
    } else {
      newCfoSet.add(cfo);
    }
    setPurchaseFilters(prev => ({ ...prev, cfo: newCfoSet }));
  };

  const handleCfoSelectAll = (availableCfo: string[]) => {
    setPurchaseFilters(prev => ({ ...prev, cfo: new Set(availableCfo) }));
  };

  const handleCfoDeselectAll = () => {
    setPurchaseFilters(prev => ({ ...prev, cfo: new Set<string>() }));
  };

  // Получаем уникальные значения ЦФО для выбранного закупщика
  const getAvailableCfo = (): string[] => {
    if (!selectedPurchaser) return [];
    const purchaserPurchases = allPurchases.filter(item => {
      const purchaser = item['Закупшик'] || 'Не назначен';
      return purchaser === selectedPurchaser;
    });
    const cfoSet = new Set<string>();
    purchaserPurchases.forEach(item => {
      const cfo = item['ЦФО'] || '';
      if (cfo) {
        cfoSet.add(cfo);
      }
    });
    return Array.from(cfoSet).sort();
  };

  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    try {
      // Формат DD.MM.YYYY или DD.MM.YYYY HH:MM
      const datePart = dateStr.split(' ')[0];
      const [day, month, year] = datePart.split('.');
      if (day && month && year) {
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
    } catch {
      return null;
    }
    return null;
  };

  const copyRowAsImage = async (rowElement: HTMLTableRowElement, index: number) => {
    try {
      const originalTable = rowElement.closest('table');
      if (!originalTable) return;
      
      // Создаем временный контейнер для таблицы
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      tempContainer.style.backgroundColor = '#ffffff';
      tempContainer.style.padding = '16px';
      tempContainer.style.borderRadius = '8px';
      tempContainer.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
      
      // Клонируем всю таблицу
      const clonedTable = originalTable.cloneNode(true) as HTMLTableElement;
      clonedTable.style.width = originalTable.offsetWidth + 'px';
      clonedTable.style.borderCollapse = 'collapse';
      
      // Удаляем все строки кроме нужной
      const tbody = clonedTable.querySelector('tbody');
      if (tbody) {
        const rows = Array.from(tbody.querySelectorAll('tr'));
        rows.forEach((row, rowIndex) => {
          if (rowIndex !== index) {
            row.remove();
          }
        });
      }
      
      // Удаляем кнопку копирования из клонированной строки
      const clonedRow = clonedTable.querySelector('tbody tr');
      if (clonedRow) {
        const copyButton = clonedRow.querySelector('[data-copy-button]');
        if (copyButton) {
          copyButton.remove();
        }
        // Удаляем последнюю ячейку (колонку с кнопкой)
        const cells = clonedRow.querySelectorAll('td');
        if (cells.length > 0) {
          cells[cells.length - 1].remove();
        }
      }
      
      // Удаляем последний заголовок (колонку с кнопкой)
      const thead = clonedTable.querySelector('thead');
      if (thead) {
        const headerRow = thead.querySelector('tr');
        if (headerRow) {
          const headers = headerRow.querySelectorAll('th');
          if (headers.length > 0) {
            headers[headers.length - 1].remove();
          }
        }
      }
      
      // Функция для применения безопасных inline стилей ко всем элементам
      const applySafeStyles = (element: HTMLElement) => {
        const computedStyle = window.getComputedStyle(element);
        
        // Применяем безопасные стили через inline
        try {
          // Фон
          const bgColor = computedStyle.backgroundColor;
          if (bgColor && !bgColor.includes('lab') && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
            element.style.backgroundColor = bgColor;
          } else if (element.tagName !== 'SPAN') {
            // Для span оставляем оригинальный фон (для статусов)
            element.style.backgroundColor = '#ffffff';
          }
          
          // Цвет текста
          const textColor = computedStyle.color;
          if (textColor && !textColor.includes('lab')) {
            element.style.color = textColor;
          } else if (element.tagName !== 'SPAN') {
            // Для span оставляем оригинальный цвет (для статусов)
            element.style.color = '#000000';
          }
          
          // Границы
          const borderColor = computedStyle.borderColor;
          if (borderColor && !borderColor.includes('lab')) {
            element.style.borderColor = borderColor;
          }
          
          // Для span со статусами сохраняем все стили
          if (element.tagName === 'SPAN' && element.classList.contains('rounded-full')) {
            // Это статус - сохраняем все стили
            element.style.backgroundColor = bgColor || element.style.backgroundColor;
            element.style.color = textColor || element.style.color;
            element.style.padding = computedStyle.padding;
            element.style.borderRadius = computedStyle.borderRadius;
            element.style.fontSize = computedStyle.fontSize;
            element.style.fontWeight = computedStyle.fontWeight;
            // Центрируем только для изображения
            element.style.display = 'inline-flex';
            element.style.alignItems = 'center';
            element.style.justifyContent = 'center';
            element.style.textAlign = 'center';
            element.style.lineHeight = '1.2';
            element.style.verticalAlign = 'middle';
            
            // Выравниваем родительскую ячейку по центру (но не используем flex для td)
            const parentTd = element.closest('td');
            if (parentTd) {
              (parentTd as HTMLElement).style.verticalAlign = 'middle';
              (parentTd as HTMLElement).style.textAlign = 'center';
            }
          } else if (element.tagName === 'TD') {
            // Для ячеек таблицы сохраняем стили переноса текста
            element.style.fontSize = computedStyle.fontSize;
            element.style.fontWeight = computedStyle.fontWeight;
            element.style.padding = computedStyle.padding;
            element.style.margin = computedStyle.margin;
            element.style.borderWidth = computedStyle.borderWidth;
            element.style.borderStyle = computedStyle.borderStyle;
            // Сохраняем стили переноса текста
            element.style.wordWrap = computedStyle.wordWrap || 'break-word';
            element.style.whiteSpace = computedStyle.whiteSpace || 'normal';
            element.style.overflowWrap = computedStyle.overflowWrap || 'break-word';
            if (computedStyle.maxWidth) {
              element.style.maxWidth = computedStyle.maxWidth;
            }
          } else {
            // Другие важные стили
            element.style.fontSize = computedStyle.fontSize;
            element.style.fontWeight = computedStyle.fontWeight;
            element.style.padding = computedStyle.padding;
            element.style.margin = computedStyle.margin;
            element.style.borderWidth = computedStyle.borderWidth;
            element.style.borderStyle = computedStyle.borderStyle;
          }
        } catch (e) {
          // Игнорируем ошибки
        }
        
        // Рекурсивно обрабатываем дочерние элементы
        Array.from(element.children).forEach((child) => {
          applySafeStyles(child as HTMLElement);
        });
      };
      
      // Применяем безопасные стили ко всей таблице
      applySafeStyles(clonedTable);
      
      tempContainer.appendChild(clonedTable);
      document.body.appendChild(tempContainer);
      
      let canvas: HTMLCanvasElement;
      
      try {
        // Создаем canvas из элемента с обработкой ошибок
        canvas = await html2canvas(tempContainer, {
          backgroundColor: '#ffffff',
          scale: 2,
          logging: false,
          useCORS: true,
          allowTaint: true,
          onclone: (clonedDoc) => {
            // Дополнительная обработка клонированного документа
            const clonedContainer = clonedDoc.querySelector('[style*="position: absolute"]') as HTMLElement;
            if (clonedContainer) {
              // Обрабатываем все элементы
              const allElements = clonedContainer.querySelectorAll('*');
              allElements.forEach((el) => {
                const htmlEl = el as HTMLElement;
                
                // Восстанавливаем цвета статусов по тексту
                if (htmlEl.tagName === 'SPAN' && htmlEl.classList.contains('rounded-full')) {
                  const statusText = htmlEl.textContent || '';
                  if (statusText.includes('Согласован')) {
                    htmlEl.style.backgroundColor = '#dcfce7'; // green-100
                    htmlEl.style.color = '#166534'; // green-800
                  } else if (statusText.includes('Не согласован')) {
                    htmlEl.style.backgroundColor = '#fee2e2'; // red-100
                    htmlEl.style.color = '#991b1b'; // red-800
                  } else if (statusText.includes('Удалена')) {
                    htmlEl.style.backgroundColor = '#f3f4f6'; // gray-100
                    htmlEl.style.color = '#1f2937'; // gray-800
                  } else {
                    htmlEl.style.backgroundColor = '#fef3c7'; // yellow-100
                    htmlEl.style.color = '#854d0e'; // yellow-800
                  }
                  htmlEl.style.padding = '4px 8px';
                  htmlEl.style.borderRadius = '9999px';
                  htmlEl.style.fontSize = '12px';
                  htmlEl.style.fontWeight = '500';
                  htmlEl.style.display = 'inline-flex';
                  htmlEl.style.alignItems = 'center';
                  htmlEl.style.justifyContent = 'center';
                  htmlEl.style.textAlign = 'center';
                  htmlEl.style.lineHeight = '1.2';
                  htmlEl.style.verticalAlign = 'middle';
                  
                  // Выравниваем родительскую ячейку по центру (но не используем flex для td)
                  const parentTd = htmlEl.closest('td');
                  if (parentTd) {
                    (parentTd as HTMLElement).style.verticalAlign = 'middle';
                    (parentTd as HTMLElement).style.textAlign = 'center';
                  }
                }
                
                // Для ячеек таблицы сохраняем перенос текста
                if (htmlEl.tagName === 'TD') {
                  htmlEl.style.wordWrap = 'break-word';
                  htmlEl.style.whiteSpace = 'normal';
                  htmlEl.style.overflowWrap = 'break-word';
                  // Если это ячейка с предметом (обычно вторая колонка), устанавливаем max-width
                  const table = htmlEl.closest('table');
                  if (table) {
                    const row = htmlEl.closest('tr');
                    if (row) {
                      const cells = Array.from(row.querySelectorAll('td'));
                      const cellIndex = cells.indexOf(htmlEl as HTMLTableCellElement);
                      const headers = table.querySelectorAll('thead th');
                      if (headers[cellIndex]) {
                        const headerText = headers[cellIndex].textContent || '';
                        if (headerText.includes('Предмет ЗП')) {
                          htmlEl.style.maxWidth = '300px';
                        }
                      }
                    }
                  }
                }
                
                // Очищаем все CSS переменные, которые могут содержать lab()
                Array.from(htmlEl.style).forEach((prop) => {
                  if (prop.startsWith('--')) {
                    htmlEl.style.removeProperty(prop);
                  }
                });
              });
            }
          }
        });
      } catch (error) {
        // Если произошла ошибка с lab() цветами, создаем упрощенную версию
        console.warn('Ошибка при создании canvas, используем упрощенную версию:', error);
        
        // Создаем упрощенную таблицу без проблемных стилей
        const simpleTable = document.createElement('table');
        simpleTable.style.borderCollapse = 'collapse';
        simpleTable.style.width = '100%';
        simpleTable.style.backgroundColor = '#ffffff';
        simpleTable.style.fontFamily = 'Arial, sans-serif';
        simpleTable.style.fontSize = '12px';
        
        // Копируем заголовки
        const simpleThead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.style.backgroundColor = '#f3f4f6';
        headerRow.style.borderBottom = '2px solid #d1d5db';
        
        const originalHeaders = clonedTable.querySelectorAll('thead th');
        originalHeaders.forEach((header) => {
          const th = document.createElement('th');
          th.textContent = header.textContent || '';
          th.style.padding = '8px';
          th.style.textAlign = 'left';
          th.style.border = '1px solid #e5e7eb';
          th.style.color = '#374151';
          th.style.fontWeight = '600';
          headerRow.appendChild(th);
        });
        simpleThead.appendChild(headerRow);
        simpleTable.appendChild(simpleThead);
        
        // Копируем строку данных с сохранением стилей статусов
        const simpleTbody = document.createElement('tbody');
        const dataRow = document.createElement('tr');
        dataRow.style.borderBottom = '1px solid #e5e7eb';
        
        const originalCells = clonedRow?.querySelectorAll('td');
        originalCells?.forEach((cell, cellIndex) => {
          const td = document.createElement('td');
          td.style.padding = '8px';
          td.style.border = '1px solid #e5e7eb';
          td.style.color = '#111827';
          
          // Определяем, это ячейка с предметом ЗП (обычно вторая колонка)
          const headerText = originalHeaders[cellIndex]?.textContent || '';
          const isSubjectCell = headerText.includes('Предмет ЗП');
          
          if (isSubjectCell) {
            // Для ячейки с предметом добавляем перенос по словам
            td.style.maxWidth = '300px';
            td.style.wordWrap = 'break-word';
            td.style.whiteSpace = 'normal';
            td.style.overflowWrap = 'break-word';
          }
          
          // Проверяем, есть ли в ячейке span со статусом
          const statusSpan = cell.querySelector('span.rounded-full');
          if (statusSpan) {
            // Копируем span со статусом с сохранением цветов
            const clonedSpan = statusSpan.cloneNode(true) as HTMLElement;
            const spanStyle = window.getComputedStyle(statusSpan);
            
            // Определяем цвет статуса по классам
            const statusText = statusSpan.textContent || '';
            if (statusText.includes('Согласован')) {
              clonedSpan.style.backgroundColor = '#dcfce7'; // green-100
              clonedSpan.style.color = '#166534'; // green-800
            } else if (statusText.includes('Не согласован')) {
              clonedSpan.style.backgroundColor = '#fee2e2'; // red-100
              clonedSpan.style.color = '#991b1b'; // red-800
            } else if (statusText.includes('Удалена')) {
              clonedSpan.style.backgroundColor = '#f3f4f6'; // gray-100
              clonedSpan.style.color = '#1f2937'; // gray-800
            } else {
              clonedSpan.style.backgroundColor = '#fef3c7'; // yellow-100
              clonedSpan.style.color = '#854d0e'; // yellow-800
            }
            
            clonedSpan.style.padding = '4px 8px';
            clonedSpan.style.borderRadius = '9999px';
            clonedSpan.style.fontSize = '12px';
            clonedSpan.style.fontWeight = '500';
            clonedSpan.style.display = 'inline-flex';
            clonedSpan.style.alignItems = 'center';
            clonedSpan.style.justifyContent = 'center';
            clonedSpan.style.textAlign = 'center';
            clonedSpan.style.lineHeight = '1.2';
            clonedSpan.style.verticalAlign = 'middle';
            
            // Выравниваем ячейку по центру (но не используем flex для td)
            td.style.verticalAlign = 'middle';
            td.style.textAlign = 'center';
            
            td.appendChild(clonedSpan);
          } else {
            // Обычная ячейка
            td.textContent = cell.textContent || '';
          }
          
          dataRow.appendChild(td);
        });
        simpleTbody.appendChild(dataRow);
        simpleTable.appendChild(simpleTbody);
        
        // Заменяем содержимое контейнера
        tempContainer.innerHTML = '';
        tempContainer.appendChild(simpleTable);
        
        // Создаем canvas из упрощенной версии
        canvas = await html2canvas(tempContainer, {
          backgroundColor: '#ffffff',
          scale: 2,
          logging: false,
          useCORS: true,
          allowTaint: true,
        });
      }
      
      // Удаляем временный контейнер
      document.body.removeChild(tempContainer);
      
      // Конвертируем canvas в blob
      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            // Копируем в буфер обмена
            await navigator.clipboard.write([
              new ClipboardItem({
                'image/png': blob
              })
            ]);
            
            // Показываем визуальную обратную связь
            const button = rowElement.querySelector(`[data-copy-button="${index}"]`) as HTMLElement;
            if (button) {
              const originalHTML = button.innerHTML;
              button.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
              button.classList.remove('text-gray-600', 'hover:text-blue-600');
              button.classList.add('text-green-600');
              setTimeout(() => {
                button.innerHTML = originalHTML;
                button.classList.remove('text-green-600');
                button.classList.add('text-gray-600', 'hover:text-blue-600');
              }, 2000);
            }
          } catch (err) {
            console.error('Ошибка при копировании:', err);
            alert('Не удалось скопировать изображение в буфер обмена. Убедитесь, что у браузера есть разрешение на доступ к буферу обмена.');
          }
        }
      }, 'image/png');
    } catch (err) {
      console.error('Ошибка при создании изображения:', err);
      alert('Не удалось создать изображение строки');
    }
  };

  const handleTogglePurchaser = (purchaser: string) => {
    const newSelected = new Set(selectedPurchasers);
    if (newSelected.has(purchaser)) {
      newSelected.delete(purchaser);
    } else {
      newSelected.add(purchaser);
    }
    setSelectedPurchasers(newSelected);
    
    // Сохраняем в localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(newSelected)));
    } catch (err) {
      console.error('Error saving selected purchasers:', err);
    }
  };

  const handleSelectAll = () => {
    const allPurchaserNames = new Set(allStats.map(stat => stat.purchaser));
    setSelectedPurchasers(allPurchaserNames);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(allPurchaserNames)));
    } catch (err) {
      console.error('Error saving selected purchasers:', err);
    }
  };

  const handleDeselectAll = () => {
    setSelectedPurchasers(new Set());
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    } catch (err) {
      console.error('Error saving selected purchasers:', err);
    }
  };


  // Получаем уникальные статусы закупочной процедуры для фильтра
  const getAvailableStatuses = () => {
    if (!selectedPurchaser) return [];
    const purchaserPurchases = allPurchases.filter(item => {
      const purchaser = item['Закупшик'] || 'Не назначен';
      return purchaser === selectedPurchaser;
    });
    const statuses = new Set<string>();
    purchaserPurchases.forEach(item => {
      const status = item['Статус закупочной процедуры'] || '';
      if (status) {
        if (status.includes('Согласован')) {
          statuses.add('Согласован');
        } else if (status.includes('Не согласован')) {
          statuses.add('Не согласован');
        } else if (status.includes('Удалена')) {
          statuses.add('Удалена');
        } else {
          statuses.add('В работе');
        }
      }
    });
    return Array.from(statuses);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  // Если выбран закупщик, показываем список его закупок
  if (selectedPurchaser) {
    const availableStatuses = getAvailableStatuses();
    const purchaserAllPurchases = allPurchases.filter(item => {
      const purchaser = item['Закупшик'] || 'Не назначен';
      return purchaser === selectedPurchaser;
    });
    
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium mb-2 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Назад к статистике
              </button>
              <h2 className="text-2xl font-bold text-gray-900">Закупки закупщика: {selectedPurchaser}</h2>
              <p className="text-sm text-gray-600 mt-1">Всего закупок: {filteredPurchases.length}</p>
            </div>
          </div>

          {/* Фильтры по статусу закупочной процедуры */}
          <div className="mb-4">
            <div className="mb-2">
              <span className="text-sm font-medium text-gray-700">Закупщик: </span>
              <span className="text-sm font-semibold text-blue-600">{selectedPurchaser}</span>
            </div>
            <div className="flex flex-wrap gap-2">
            {availableStatuses.includes('Согласован') && (
              <button
                onClick={() => setStatusFilter('agreed')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === 'agreed'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Согласован ({purchaserAllPurchases.filter(item => {
                  const status = item['Статус закупочной процедуры'] || '';
                  return status.includes('Согласован');
                }).length})
              </button>
            )}
            {availableStatuses.includes('Не согласован') && (
              <button
                onClick={() => setStatusFilter('not-agreed')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === 'not-agreed'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Не согласован ({purchaserAllPurchases.filter(item => {
                  const status = item['Статус закупочной процедуры'] || '';
                  return status.includes('Не согласован');
                }).length})
              </button>
            )}
            {availableStatuses.includes('В работе') && (
              <button
                onClick={() => setStatusFilter('in-progress')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === 'in-progress'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                В работе ({purchaserAllPurchases.filter(item => {
                  const status = item['Статус закупочной процедуры'] || '';
                  return status && !status.includes('Согласован') && !status.includes('Не согласован') && !status.includes('Удалена');
                }).length})
              </button>
            )}
            {availableStatuses.includes('Удалена') && (
              <button
                onClick={() => setStatusFilter('deleted')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === 'deleted'
                    ? 'bg-gray-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Удалена ({purchaserAllPurchases.filter(item => {
                  const status = item['Статус закупочной процедуры'] || '';
                  return status.includes('Удалена');
                }).length})
              </button>
            )}
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Все ({purchaserAllPurchases.length})
            </button>
            </div>
          </div>

          {/* Кнопка очистки фильтров */}
          {hasActivePurchaseFilters() && (
            <div className="mb-3 flex justify-end">
              <button
                onClick={clearPurchaseFilters}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Очистить фильтры
              </button>
            </div>
          )}

          {/* Таблица закупок */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-2 px-2 text-xs sm:text-sm font-semibold text-gray-700">
                    <div>№ заявки</div>
                    <input
                      type="text"
                      placeholder="Поиск..."
                      value={purchaseFilters.requestNumber}
                      onChange={(e) => handlePurchaseFilterChange('requestNumber', e.target.value)}
                      className="mt-1 w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </th>
                  <th className="text-left py-2 px-2 text-xs sm:text-sm font-semibold text-gray-700">
                    <div>Предмет ЗП</div>
                    <input
                      type="text"
                      placeholder="Поиск..."
                      value={purchaseFilters.subject}
                      onChange={(e) => handlePurchaseFilterChange('subject', e.target.value)}
                      className="mt-1 w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </th>
                  <th className="text-left py-2 px-2 text-xs sm:text-sm font-semibold text-gray-700">
                    <div className="relative cfo-filter-container">
                      <div>ЦФО</div>
                      <button
                        type="button"
                        onClick={() => setIsCfoFilterOpen(!isCfoFilterOpen)}
                        className="mt-1 w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white text-left focus:ring-1 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between hover:bg-gray-50"
                      >
                        <span className="text-gray-600 truncate">
                          {purchaseFilters.cfo.size === 0 
                            ? '' 
                            : purchaseFilters.cfo.size === 1
                            ? Array.from(purchaseFilters.cfo)[0]
                            : `${purchaseFilters.cfo.size} выбрано`}
                        </span>
                        <svg className={`w-4 h-4 transition-transform flex-shrink-0 ${isCfoFilterOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {isCfoFilterOpen && (
                        <div className="absolute z-10 mt-1 w-64 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          <div className="p-2 border-b border-gray-200 flex gap-2 sticky top-0 bg-white">
                            <button
                              onClick={() => handleCfoSelectAll(getAvailableCfo())}
                              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            >
                              Все
                            </button>
                            <button
                              onClick={handleCfoDeselectAll}
                              className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                            >
                              Снять
                            </button>
                          </div>
                          <div className="p-2 space-y-1">
                            {getAvailableCfo().length === 0 ? (
                              <div className="text-xs text-gray-500 p-2 text-center">Нет данных</div>
                            ) : (
                              getAvailableCfo().map((cfo) => (
                                <label
                                  key={cfo}
                                  className="flex items-center p-2 hover:bg-gray-50 cursor-pointer rounded"
                                >
                                  <input
                                    type="checkbox"
                                    checked={purchaseFilters.cfo.has(cfo)}
                                    onChange={() => handleCfoToggle(cfo)}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                  />
                                  <span className="ml-2 text-xs text-gray-700 flex-1">{cfo}</span>
                                </label>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </th>
                  <th className="text-left py-2 px-2 text-xs sm:text-sm font-semibold text-gray-700">
                    Статус процедуры
                  </th>
                  <th className="text-left py-2 px-2 text-xs sm:text-sm font-semibold text-gray-700">
                    <div>Сумма</div>
                    <div className="mt-1 flex gap-1">
                      <input
                        type="number"
                        placeholder="От"
                        value={purchaseFilters.amountMin}
                        onChange={(e) => handlePurchaseFilterChange('amountMin', e.target.value)}
                        className="w-full px-1 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <input
                        type="number"
                        placeholder="До"
                        value={purchaseFilters.amountMax}
                        onChange={(e) => handlePurchaseFilterChange('amountMax', e.target.value)}
                        className="w-full px-1 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </th>
                  <th className="text-left py-2 px-2 text-xs sm:text-sm font-semibold text-gray-700">
                    <div>Дата создания</div>
                    <div className="mt-1 flex gap-1">
                      <input
                        type="date"
                        value={purchaseFilters.dateFrom}
                        onChange={(e) => handlePurchaseFilterChange('dateFrom', e.target.value)}
                        className="w-full px-1 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="От"
                      />
                      <input
                        type="date"
                        value={purchaseFilters.dateTo}
                        onChange={(e) => handlePurchaseFilterChange('dateTo', e.target.value)}
                        className="w-full px-1 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="До"
                      />
                    </div>
                  </th>
                  <th className="text-left py-2 px-2 text-xs sm:text-sm font-semibold text-gray-700 w-20">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">
                      Нет закупок для отображения
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map((item, index) => (
                    <tr 
                      key={index} 
                      className="border-b border-gray-100 hover:bg-gray-50"
                      data-row-index={index}
                    >
                      <td className="py-3 px-2 text-xs sm:text-sm text-gray-900 font-medium">
                        {item['№ заявки'] || '-'}
                      </td>
                      <td className="py-3 px-2 text-xs sm:text-sm text-gray-700 max-w-md break-words whitespace-normal word-wrap break-word overflow-wrap break-word">
                        {item['Предмет ЗП'] || '-'}
                      </td>
                      <td className="py-3 px-2 text-xs sm:text-sm text-gray-700">
                        {item['ЦФО'] || '-'}
                      </td>
                      <td className="py-3 px-2 text-xs sm:text-sm">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          item['Статус закупочной процедуры']?.includes('Согласован')
                            ? 'bg-green-100 text-green-800'
                            : item['Статус закупочной процедуры']?.includes('Не согласован')
                            ? 'bg-red-100 text-red-800'
                            : item['Статус закупочной процедуры']?.includes('Удалена')
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item['Статус закупочной процедуры'] || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-xs sm:text-sm text-gray-700">
                        {formatNumberFromString(item['Cумма предпологаемого контракта ФАКТ'] || '')} {item['Cумма предпологаемого контракта ФАКТ'] ? 'сум' : ''}
                      </td>
                      <td className="py-3 px-2 text-xs sm:text-sm text-gray-700">
                        {formatDate(item['Дата создания ЗП'] || '')}
                      </td>
                      <td className="py-3 px-2 text-xs sm:text-sm">
                        <button
                          data-copy-button={index}
                          onClick={(e) => {
                            const row = (e.currentTarget.closest('tr') as HTMLTableRowElement);
                            if (row) {
                              copyRowAsImage(row, index);
                            }
                          }}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Скопировать строку как изображение"
                        >
                          <ImageIcon className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-gray-900">Нагрузка на закупщиков</h2>
              {selectedPurchasers.size > 0 && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  Показано: {stats.length} из {allStats.length}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">
              Анализ распределения закупок и рабочей нагрузки. 
              <span className="text-blue-600 font-medium ml-1">Двойной клик по строке</span> для просмотра закупок закупщика.
            </p>
          </div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="ml-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors relative"
            title="Настройки отображения закупщиков"
          >
            <Settings className="w-5 h-5" />
            {selectedPurchasers.size > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                {selectedPurchasers.size}
              </span>
            )}
          </button>
        </div>

        {/* Модальное окно настроек */}
        {isSettingsOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">Выбор закупщиков для отображения</h3>
                  <button
                    onClick={() => setIsSettingsOpen(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Выберите закупщиков, которых хотите видеть в таблице. Выбор сохраняется автоматически.
                </p>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1">
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={handleSelectAll}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Выбрать всех
                  </button>
                  <button
                    onClick={handleDeselectAll}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                  >
                    Снять выбор
                  </button>
                </div>
                
                <div className="space-y-2">
                  {allStats.map((stat) => (
                    <label
                      key={stat.purchaser}
                      className="flex items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-200"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPurchasers.has(stat.purchaser)}
                        onChange={() => handleTogglePurchaser(stat.purchaser)}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <div className="ml-3 flex-1">
                        <div className="font-medium text-gray-900">{stat.purchaser}</div>
                        <div className="text-sm text-gray-500">
                          Всего: {stat.totalPurchases} | В работе: {stat.activePurchases} | Завершено: {stat.completedPurchases}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="p-6 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Готово
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left py-3 px-2 text-xs sm:text-sm font-semibold text-gray-700">Закупщик</th>
                <th className="text-left py-3 px-2 text-xs sm:text-sm font-semibold text-gray-700">Всего закупок</th>
                <th className="text-left py-3 px-2 text-xs sm:text-sm font-semibold text-gray-700">Завершено</th>
                <th className="text-left py-3 px-2 text-xs sm:text-sm font-semibold text-gray-700">В работе</th>
                <th className="text-left py-3 px-2 text-xs sm:text-sm font-semibold text-gray-700">Среднее время (дн.)</th>
                <th className="text-left py-3 px-2 text-xs sm:text-sm font-semibold text-gray-700">Общая сумма</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((stat, index) => (
                <tr 
                  key={index} 
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onDoubleClick={() => handlePurchaserDoubleClick(stat.purchaser)}
                  title="Двойной клик для просмотра закупок этого закупщика"
                >
                  <td className="py-3 px-2 text-xs sm:text-sm text-gray-900 font-medium">{stat.purchaser}</td>
                  <td className="py-3 px-2 text-xs sm:text-sm text-gray-700">{stat.totalPurchases}</td>
                  <td className="py-3 px-2 text-xs sm:text-sm text-green-600 font-semibold">{stat.completedPurchases}</td>
                  <td className="py-3 px-2 text-xs sm:text-sm text-blue-600 font-semibold">{stat.activePurchases}</td>
                  <td className="py-3 px-2 text-xs sm:text-sm text-gray-700">{stat.averageDays > 0 ? stat.averageDays : '-'}</td>
                  <td className="py-3 px-2 text-xs sm:text-sm text-gray-700">{formatNumber(stat.totalAmount)} сум</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
