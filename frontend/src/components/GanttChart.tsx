'use client';

import { useState, useRef, useEffect } from 'react';
import { getBackendUrl } from '@/utils/api';

interface GanttChartProps {
  itemId: number;
  year: number | null;
  requestDate: string | null;
  newContractDate: string | null;
  onDatesUpdate?: (requestDate: string, newContractDate: string) => void;
  onDatesChange?: (requestDate: string, newContractDate: string) => void; // Для временных изменений во время перетаскивания
  onDragStart?: () => void; // Вызывается при начале перетаскивания
}

const MONTHS = [
  'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
  'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'
];

export default function GanttChart({ 
  itemId, 
  year, 
  requestDate, 
  newContractDate,
  onDatesUpdate,
  onDatesChange,
  onDragStart
}: GanttChartProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [initialStartDate, setInitialStartDate] = useState<Date | null>(null);
  const [initialEndDate, setInitialEndDate] = useState<Date | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [tempDates, setTempDates] = useState<{ requestDate: string | null; newContractDate: string | null } | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Получаем год для расчетов
  const currentYear = year || new Date().getFullYear();

  // Парсим даты (используем временные даты во время перетаскивания)
  const startDate = tempDates?.requestDate 
    ? new Date(tempDates.requestDate) 
    : (requestDate ? new Date(requestDate) : null);
  const endDate = tempDates?.newContractDate 
    ? new Date(tempDates.newContractDate) 
    : (newContractDate ? new Date(newContractDate) : null);

  // Вычисляем позицию и ширину полосы на основе дат
  const getBarPosition = () => {
    if (!startDate || !endDate) return { left: 0, width: 0 };

    // Используем начало и конец года (00:00:00 1 января и 23:59:59.999 31 декабря)
    // Это должно точно соответствовать расчетам при перетаскивании
    const yearStart = new Date(currentYear, 0, 1, 0, 0, 0, 0);
    const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999);
    
    // Ограничиваем даты рамками года для отображения
    // Если дата выходит за рамки года, используем границу года
    const actualStart = startDate < yearStart ? yearStart : (startDate > yearEnd ? yearEnd : startDate);
    const actualEnd = endDate > yearEnd ? yearEnd : (endDate < yearStart ? yearStart : endDate);

    // Более точный расчет с использованием миллисекунд
    const yearStartTime = yearStart.getTime();
    const yearEndTime = yearEnd.getTime();
    const actualStartTime = actualStart.getTime();
    const actualEndTime = actualEnd.getTime();
    
    // Вычисляем общее время года в миллисекундах
    const totalTime = yearEndTime - yearStartTime;
    
    // Вычисляем смещение от начала года для начала и конца полосы
    const startTime = actualStartTime - yearStartTime;
    const endTime = actualEndTime - yearStartTime;
    
    // Конвертируем в проценты
    const leftPercent = (startTime / totalTime) * 100;
    const widthPercent = ((endTime - startTime) / totalTime) * 100;

    return { left: leftPercent, width: widthPercent };
  };

  const { left, width } = getBarPosition();
  // Позиция полосы рассчитывается точно на основе дат (включая временные при перетаскивании)
  const adjustedLeft = left;
  const adjustedWidth = width;

  // Обработчик начала перетаскивания
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!startDate || !endDate || !containerRef.current) return;
    
    e.preventDefault();
    
    // Закрываем режим редактирования даты, если он открыт
    if (onDragStart) {
      onDragStart();
    }
    
    setIsDragging(true);
    // Сохраняем позицию мыши относительно контейнера
    const containerRect = containerRef.current.getBoundingClientRect();
    setDragStartX(e.clientX - containerRect.left);
    setInitialStartDate(new Date(startDate));
    setInitialEndDate(new Date(endDate));
    setDragOffset(0);
  };

  // Обработчик перетаскивания
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || !initialStartDate || !initialEndDate) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;
      // Вычисляем позицию мыши относительно контейнера
      const currentMouseX = e.clientX - containerRect.left;
      const deltaX = currentMouseX - dragStartX;
      
      // Вычисляем границы года (используем те же, что и в getBarPosition)
      const yearStart = new Date(currentYear, 0, 1, 0, 0, 0, 0);
      const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999);
      const totalTime = yearEnd.getTime() - yearStart.getTime();
      
      // Преобразуем смещение в пикселях напрямую в миллисекунды
      // Это более точно, чем через проценты и дни
      const deltaTime = (deltaX / containerWidth) * totalTime;
      
      // Вычисляем новые даты (более точный расчет)
      const initialStartTime = initialStartDate.getTime();
      const initialEndTime = initialEndDate.getTime();
      const duration = initialEndTime - initialStartTime;
      
      const newStartTime = initialStartTime + deltaTime;
      const newEndTime = newStartTime + duration;
      
      const newStartDate = new Date(newStartTime);
      const newEndDate = new Date(newEndTime);

      // Ограничиваем даты рамками года
      if (newStartDate < yearStart) {
        const diff = yearStart.getTime() - newStartDate.getTime();
        newStartDate.setTime(yearStart.getTime());
        newEndDate.setTime(newEndDate.getTime() + diff);
      }
      
      if (newEndDate > yearEnd) {
        const diff = newEndDate.getTime() - yearEnd.getTime();
        newEndDate.setTime(yearEnd.getTime());
        newStartDate.setTime(newStartDate.getTime() - diff);
      }

      // Форматируем даты для временного отображения
      const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const tempRequestDate = formatDate(newStartDate);
      const tempNewContractDate = formatDate(newEndDate);

      // Обновляем временные даты для анимации
      setTempDates({ requestDate: tempRequestDate, newContractDate: tempNewContractDate });
      
      // Уведомляем родительский компонент о временных изменениях
      if (onDatesChange) {
        onDatesChange(tempRequestDate, tempNewContractDate);
      }

      // Отправляем обновление на бэкенд с debounce (каждые 300мс)
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      
      updateTimeoutRef.current = setTimeout(async () => {
        setIsUpdating(true);
        try {
          console.log('Updating dates on backend:', { itemId, tempRequestDate, tempNewContractDate });
          const response = await fetch(`${getBackendUrl()}/api/purchase-plan-items/${itemId}/dates`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              requestDate: tempRequestDate,
              newContractDate: tempNewContractDate,
            }),
          });

          if (response.ok) {
            const updatedData = await response.json();
            console.log('Dates updated successfully on backend:', updatedData);
            if (onDatesUpdate) {
              onDatesUpdate(tempRequestDate, tempNewContractDate);
            }
          } else {
            const errorText = await response.text();
            console.error('Failed to update dates on backend:', response.status, errorText);
          }
        } catch (error) {
          console.error('Error updating dates on backend:', error);
        } finally {
          setIsUpdating(false);
        }
      }, 300);

      setDragOffset(deltaX);
    };

    const handleMouseUp = async (e: MouseEvent) => {
      if (!containerRef.current || !initialStartDate || !initialEndDate) {
        setIsDragging(false);
        return;
      }

      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;
      // Вычисляем позицию мыши относительно контейнера
      const currentMouseX = e.clientX - containerRect.left;
      const deltaX = currentMouseX - dragStartX;
      
      // Вычисляем границы года (используем те же, что и в getBarPosition)
      const yearStart = new Date(currentYear, 0, 1, 0, 0, 0, 0);
      const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999);
      const totalTime = yearEnd.getTime() - yearStart.getTime();
      
      // Преобразуем смещение в пикселях напрямую в миллисекунды
      // Это более точно, чем через проценты и дни
      const deltaTime = (deltaX / containerWidth) * totalTime;
      
      // Вычисляем новые даты (более точный расчет)
      const initialStartTime = initialStartDate.getTime();
      const initialEndTime = initialEndDate.getTime();
      const duration = initialEndTime - initialStartTime;
      
      const newStartTime = initialStartTime + deltaTime;
      const newEndTime = newStartTime + duration;
      
      const newStartDate = new Date(newStartTime);
      const newEndDate = new Date(newEndTime);

      // Ограничиваем даты рамками года
      if (newStartDate < yearStart) {
        const diff = yearStart.getTime() - newStartDate.getTime();
        newStartDate.setTime(yearStart.getTime());
        newEndDate.setTime(newEndDate.getTime() + diff);
      }
      
      if (newEndDate > yearEnd) {
        const diff = newEndDate.getTime() - yearEnd.getTime();
        newEndDate.setTime(yearEnd.getTime());
        newStartDate.setTime(newStartDate.getTime() - diff);
      }

      // Форматируем даты для отправки
      const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const newRequestDate = formatDate(newStartDate);
      const newContractDate = formatDate(newEndDate);

      // Отменяем pending обновление, если оно есть
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = null;
      }

      // Отправляем финальное обновление на бэкенд
      setIsUpdating(true);
      try {
        console.log('Final update dates on backend:', { itemId, newRequestDate, newContractDate });
        const response = await fetch(`${getBackendUrl()}/api/purchase-plan-items/${itemId}/dates`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requestDate: newRequestDate,
            newContractDate: newContractDate,
          }),
        });

        if (response.ok) {
          const updatedData = await response.json();
          console.log('Final dates updated successfully on backend:', updatedData);
          if (onDatesUpdate) {
            onDatesUpdate(newRequestDate, newContractDate);
          }
        } else {
          const errorText = await response.text();
          console.error('Failed to update final dates on backend:', response.status, errorText);
        }
      } catch (error) {
        console.error('Error updating final dates on backend:', error);
      } finally {
        setIsUpdating(false);
      }

      // Сбрасываем временные даты после завершения перетаскивания
      setTempDates(null);
      setIsDragging(false);
      setDragOffset(0);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      // Очищаем timeout при размонтировании
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [isDragging, dragStartX, initialStartDate, initialEndDate, currentYear, itemId, onDatesUpdate, onDatesChange]);

  if (!startDate || !endDate) {
    return (
      <div className="h-8 flex items-center justify-center text-xs text-gray-400 border border-gray-300 rounded">
        Нет дат
      </div>
    );
  }

  return (
    <div className="relative h-8 w-full border border-gray-300 rounded" ref={containerRef}>
      {/* Месяцы */}
      <div className="absolute top-0 left-0 right-0 h-4 flex border-b border-gray-300">
        {MONTHS.map((month, index) => (
          <div
            key={index}
            className="flex-1 text-[8px] text-gray-500 text-center border-r border-gray-300 last:border-r-0"
            style={{ minWidth: 0 }}
          >
            {month}
          </div>
        ))}
      </div>

      {/* Полоса Ганта */}
      <div className="absolute top-4 left-0 right-0 h-4">
        {/* Вертикальные разделители для месяцев в области полосы */}
        {MONTHS.map((_, index) => {
          if (index === 0) return null; // Пропускаем первый разделитель (он на границе)
          const monthPercent = (index / MONTHS.length) * 100;
          return (
            <div
              key={index}
              className="absolute top-0 bottom-0 w-px bg-gray-300"
              style={{ left: `${monthPercent}%` }}
            />
          );
        })}
        
        <div
          className={`absolute h-full bg-blue-500 rounded cursor-move hover:bg-blue-600 transition-all duration-200 ease-out ${
            isDragging ? 'bg-blue-600 shadow-lg scale-105' : ''
          } ${isUpdating ? 'opacity-50' : ''}`}
          style={{
            left: `${Math.max(0, Math.min(100, adjustedLeft))}%`,
            width: `${Math.max(2, adjustedWidth)}%`,
            transition: isDragging ? 'none' : 'left 0.2s ease-out, width 0.2s ease-out',
          }}
          onMouseDown={handleMouseDown}
        >
          {isUpdating && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 border border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


