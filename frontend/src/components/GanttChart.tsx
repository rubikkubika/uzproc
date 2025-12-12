'use client';

import { useState, useRef, useEffect } from 'react';
import { getBackendUrl } from '@/utils/api';

interface GanttChartProps {
  itemId: number;
  year: number | null;
  requestDate: string | null;
  newContractDate: string | null;
  contractEndDate?: string | null; // Дата окончания договора
  currentContractEndDate?: string | null; // Дата окончания действующего договора
  onDatesUpdate?: (requestDate: string, newContractDate: string) => void;
  onDatesChange?: (requestDate: string, newContractDate: string) => void; // Для временных изменений во время перетаскивания
  onDragStart?: () => void; // Вызывается при начале перетаскивания
}

// Функция для получения массива месяцев для отображения
// Отображаем 13 месяцев: декабрь предыдущего года + 12 месяцев текущего года
const getMonthsForYear = (year: number | null) => {
  if (year === null) return [];
  const prevYear = year - 1;
  return [
    { label: 'Дек', year: prevYear, month: 11 }, // Декабрь предыдущего года
    { label: 'Янв', year: year, month: 0 },
    { label: 'Фев', year: year, month: 1 },
    { label: 'Мар', year: year, month: 2 },
    { label: 'Апр', year: year, month: 3 },
    { label: 'Май', year: year, month: 4 },
    { label: 'Июн', year: year, month: 5 },
    { label: 'Июл', year: year, month: 6 },
    { label: 'Авг', year: year, month: 7 },
    { label: 'Сен', year: year, month: 8 },
    { label: 'Окт', year: year, month: 9 },
    { label: 'Ноя', year: year, month: 10 },
    { label: 'Дек', year: year, month: 11 },
  ];
};

export default function GanttChart({ 
  itemId, 
  year, 
  requestDate, 
  newContractDate,
  contractEndDate,
  currentContractEndDate,
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
  
  // Состояние для модального окна с паролем
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [pendingUpdate, setPendingUpdate] = useState<{ requestDate: string; newContractDate: string } | null>(null);
  
  // Ключ для сохранения пароля в localStorage (на 2 дня)
  const PASSWORD_STORAGE_KEY = 'gantt_edit_password';
  const PASSWORD_EXPIRY_DAYS = 2;

  // Получаем год для расчетов
  const currentYear = year || new Date().getFullYear();
  
  // Получаем массив месяцев для отображения
  const months = getMonthsForYear(currentYear);
  
  // Функция для получения сохраненного пароля из localStorage
  const getSavedPassword = (): string | null => {
    try {
      const saved = localStorage.getItem(PASSWORD_STORAGE_KEY);
      if (!saved) return null;
      
      const data = JSON.parse(saved);
      const savedTime = new Date(data.timestamp);
      const now = new Date();
      const daysDiff = (now.getTime() - savedTime.getTime()) / (1000 * 60 * 60 * 24);
      
      // Проверяем, не истек ли срок (2 дня)
      if (daysDiff > PASSWORD_EXPIRY_DAYS) {
        localStorage.removeItem(PASSWORD_STORAGE_KEY);
        return null;
      }
      
      return data.password;
    } catch (err) {
      console.error('Error reading saved password:', err);
      return null;
    }
  };
  
  // Функция для сохранения пароля в localStorage
  const savePassword = (pwd: string) => {
    try {
      const data = {
        password: pwd,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(PASSWORD_STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error('Error saving password:', err);
    }
  };
  
  // Функция для выполнения обновления с паролем
  const performUpdate = async (requestDate: string, newContractDate: string, pwd: string) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/purchase-plan-items/${itemId}/dates`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestDate,
          newContractDate,
          password: pwd,
        }),
      });

      if (response.ok) {
        const updatedData = await response.json();
        console.log('Dates updated successfully on backend:', updatedData);
        // Сохраняем пароль на 2 дня
        savePassword(pwd);
        if (onDatesUpdate) {
          onDatesUpdate(requestDate, newContractDate);
        }
        return true;
      } else {
        const errorText = await response.text();
        console.error('Failed to update dates on backend:', response.status, errorText);
        if (response.status === 401) {
          setPasswordError('Неверный пароль');
          return false;
        }
        return false;
      }
    } catch (error) {
      console.error('Error updating dates on backend:', error);
      return false;
    }
  };
  
  // Функция для проверки пароля и выполнения обновления
  const checkPasswordAndUpdate = async (requestDate: string, newContractDate: string) => {
    // Проверяем сохраненный пароль
    const savedPassword = getSavedPassword();
    
    if (savedPassword) {
      // Используем сохраненный пароль
      const success = await performUpdate(requestDate, newContractDate, savedPassword);
      if (success) {
        setIsPasswordModalOpen(false);
        setPassword('');
        setPasswordError('');
        return;
      }
      // Если пароль не подошел, запрашиваем новый
    }
    
    // Показываем модальное окно для ввода пароля
    setPendingUpdate({ requestDate, newContractDate });
    setIsPasswordModalOpen(true);
    setPassword('');
    setPasswordError('');
  };
  
  // Обработчик подтверждения пароля
  const handlePasswordConfirm = async () => {
    if (!password.trim()) {
      setPasswordError('Введите пароль');
      return;
    }
    
    if (!pendingUpdate) return;
    
    setPasswordError('');
    const success = await performUpdate(pendingUpdate.requestDate, pendingUpdate.newContractDate, password);
    
    if (success) {
      setIsPasswordModalOpen(false);
      setPassword('');
      setPendingUpdate(null);
    }
  };

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

    // Период для визуального отображения: с 1 декабря предыдущего года по 31 декабря текущего года (13 месяцев)
    const periodStart = new Date(currentYear - 1, 11, 1, 0, 0, 0, 0); // Декабрь предыдущего года
    const periodEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999); // Декабрь текущего года
    
    // Ограничиваем даты рамками периода для отображения
    // Если дата выходит за рамки периода, используем границу периода
    const actualStart = startDate < periodStart ? periodStart : (startDate > periodEnd ? periodEnd : startDate);
    const actualEnd = endDate > periodEnd ? periodEnd : (endDate < periodStart ? periodStart : endDate);

    // Более точный расчет с использованием миллисекунд
    const periodStartTime = periodStart.getTime();
    const periodEndTime = periodEnd.getTime();
    const actualStartTime = actualStart.getTime();
    const actualEndTime = actualEnd.getTime();
    
    // Вычисляем общее время периода в миллисекундах
    const totalTime = periodEndTime - periodStartTime;
    
    // Вычисляем смещение от начала периода для начала и конца полосы
    const startTime = actualStartTime - periodStartTime;
    const endTime = actualEndTime - periodStartTime;
    
    // Конвертируем в проценты
    const leftPercent = (startTime / totalTime) * 100;
    const widthPercent = ((endTime - startTime) / totalTime) * 100;

    return { left: leftPercent, width: widthPercent };
  };

  const { left, width } = getBarPosition();
  // Позиция полосы рассчитывается точно на основе дат (включая временные при перетаскивании)
  const adjustedLeft = left;
  const adjustedWidth = width;

  // Вычисляем позицию красной черты для даты окончания договора
  const getContractEndDatePosition = () => {
    if (!contractEndDate) return null;
    
    const contractEnd = new Date(contractEndDate);
    const periodStart = new Date(currentYear - 1, 11, 1, 0, 0, 0, 0); // Декабрь предыдущего года
    const periodEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999); // Декабрь текущего года
    
    // Если дата выходит за рамки периода, не показываем черту
    if (contractEnd < periodStart || contractEnd > periodEnd) {
      return null;
    }
    
    const periodStartTime = periodStart.getTime();
    const periodEndTime = periodEnd.getTime();
    const contractEndTime = contractEnd.getTime();
    
    const totalTime = periodEndTime - periodStartTime;
    const contractEndOffset = contractEndTime - periodStartTime;
    
    const positionPercent = (contractEndOffset / totalTime) * 100;
    
    return positionPercent;
  };

  const contractEndPosition = getContractEndDatePosition();

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
      
      // Визуальный период для расчета позиций на экране (13 месяцев)
      const visualPeriodStart = new Date(currentYear - 1, 11, 1, 0, 0, 0, 0); // Декабрь предыдущего года
      const visualPeriodEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999); // Декабрь текущего года
      const visualTotalTime = visualPeriodEnd.getTime() - visualPeriodStart.getTime();
      
      // Период для перетаскивания (ограничиваем до декабря текущего года)
      const dragPeriodStart = new Date(currentYear - 1, 11, 1, 0, 0, 0, 0); // Декабрь предыдущего года
      const dragPeriodEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999); // Декабрь текущего года
      
      // Преобразуем смещение в пикселях напрямую в миллисекунды
      // Используем визуальный период для расчета позиций на экране
      const deltaTime = (deltaX / containerWidth) * visualTotalTime;
      
      // Вычисляем новые даты (более точный расчет)
      const initialStartTime = initialStartDate.getTime();
      const initialEndTime = initialEndDate.getTime();
      const duration = initialEndTime - initialStartTime;
      
      const newStartTime = initialStartTime + deltaTime;
      const newEndTime = newStartTime + duration;
      
      const newStartDate = new Date(newStartTime);
      const newEndDate = new Date(newEndTime);

      // Ограничиваем даты рамками периода перетаскивания (разрешаем выход в следующий год)
      if (newStartDate < dragPeriodStart) {
        const diff = dragPeriodStart.getTime() - newStartDate.getTime();
        newStartDate.setTime(dragPeriodStart.getTime());
        newEndDate.setTime(newEndDate.getTime() + diff);
      }
      
      if (newEndDate > dragPeriodEnd) {
        const diff = newEndDate.getTime() - dragPeriodEnd.getTime();
        newEndDate.setTime(dragPeriodEnd.getTime());
        newStartDate.setTime(newStartDate.getTime() - diff);
      }

      // Ограничиваем даты сроком окончания договора, если он установлен
      if (contractEndDate) {
        const contractEnd = new Date(contractEndDate);
        contractEnd.setHours(23, 59, 59, 999); // Устанавливаем конец дня
        
        // Конец полоски не должен быть позже срока окончания договора
        if (newEndDate > contractEnd) {
          const diff = newEndDate.getTime() - contractEnd.getTime();
          newEndDate.setTime(contractEnd.getTime());
          newStartDate.setTime(newStartDate.getTime() - diff);
        }
        
        // Начало полоски тоже не должно быть позже срока окончания договора
        if (newStartDate > contractEnd) {
          const diff = newStartDate.getTime() - contractEnd.getTime();
          newStartDate.setTime(contractEnd.getTime());
          newEndDate.setTime(newEndDate.getTime() - diff);
        }
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
      
      // Не отправляем промежуточные обновления на бэкенд - только визуальные изменения
      // Финальное обновление будет отправлено в handleMouseUp

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
      
      // Визуальный период для расчета позиций на экране (13 месяцев)
      const visualPeriodStart = new Date(currentYear - 1, 11, 1, 0, 0, 0, 0); // Декабрь предыдущего года
      const visualPeriodEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999); // Декабрь текущего года
      const visualTotalTime = visualPeriodEnd.getTime() - visualPeriodStart.getTime();
      
      // Период для перетаскивания (ограничиваем до декабря текущего года)
      const dragPeriodStart = new Date(currentYear - 1, 11, 1, 0, 0, 0, 0); // Декабрь предыдущего года
      const dragPeriodEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999); // Декабрь текущего года
      
      // Преобразуем смещение в пикселях напрямую в миллисекунды
      // Используем визуальный период для расчета позиций на экране
      const deltaTime = (deltaX / containerWidth) * visualTotalTime;
      
      // Вычисляем новые даты (более точный расчет)
      const initialStartTime = initialStartDate.getTime();
      const initialEndTime = initialEndDate.getTime();
      const duration = initialEndTime - initialStartTime;
      
      const newStartTime = initialStartTime + deltaTime;
      const newEndTime = newStartTime + duration;
      
      const newStartDate = new Date(newStartTime);
      const newEndDate = new Date(newEndTime);

      // Ограничиваем даты рамками периода перетаскивания (разрешаем выход в следующий год)
      if (newStartDate < dragPeriodStart) {
        const diff = dragPeriodStart.getTime() - newStartDate.getTime();
        newStartDate.setTime(dragPeriodStart.getTime());
        newEndDate.setTime(newEndDate.getTime() + diff);
      }
      
      if (newEndDate > dragPeriodEnd) {
        const diff = newEndDate.getTime() - dragPeriodEnd.getTime();
        newEndDate.setTime(dragPeriodEnd.getTime());
        newStartDate.setTime(newStartDate.getTime() - diff);
      }

      // Ограничиваем даты сроком окончания договора, если он установлен
      if (contractEndDate) {
        const contractEnd = new Date(contractEndDate);
        contractEnd.setHours(23, 59, 59, 999); // Устанавливаем конец дня
        
        // Конец полоски не должен быть позже срока окончания договора
        if (newEndDate > contractEnd) {
          const diff = newEndDate.getTime() - contractEnd.getTime();
          newEndDate.setTime(contractEnd.getTime());
          newStartDate.setTime(newStartDate.getTime() - diff);
        }
        
        // Начало полоски тоже не должно быть позже срока окончания договора
        if (newStartDate > contractEnd) {
          const diff = newStartDate.getTime() - contractEnd.getTime();
          newStartDate.setTime(contractEnd.getTime());
          newEndDate.setTime(newEndDate.getTime() - diff);
        }
      }

      // Ограничение по окончанию срока действующего договора убрано

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

      // Проверяем пароль и отправляем финальное обновление на бэкенд
      setIsUpdating(true);
      await checkPasswordAndUpdate(newRequestDate, newContractDate);
      setIsUpdating(false);

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
  }, [isDragging, dragStartX, initialStartDate, initialEndDate, currentYear, itemId, onDatesUpdate, onDatesChange, contractEndDate]);

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
      <div className="absolute top-0 left-0 right-0 h-4 flex border-b border-gray-300 relative">
        {months.map((monthData, index) => {
          // Разделитель между годами (после декабря предыдущего года, перед январем текущего)
          const isYearDivider = index === 1; // После декабря предыдущего года
          return (
            <div
              key={index}
              className={`flex-1 text-[8px] text-gray-500 text-center relative ${
                isYearDivider ? 'bg-gray-50' : ''
              }`}
              style={{ minWidth: 0 }}
            >
              {monthData.label}
            </div>
          );
        })}
        {/* Вертикальные разделители для месяцев в заголовках - точно на тех же позициях, что и на полосе */}
        {months.map((_, index) => {
          if (index === 0) return null; // Пропускаем первый разделитель (он на границе)
          const monthPercent = (index / months.length) * 100;
          // Разделитель между годами (после декабря предыдущего года, перед январем текущего)
          const isYearDivider = index === 1; // После декабря предыдущего года
          return (
            <div
              key={`header-divider-${index}`}
              className={`absolute top-0 bottom-0 ${isYearDivider ? 'w-0.5 bg-gray-700 z-30' : 'w-px bg-gray-300'}`}
              style={{ left: `${monthPercent}%` }}
            />
          );
        })}
      </div>

      {/* Полоса Ганта */}
      <div className="absolute top-4 left-0 right-0 h-4">
        {/* Вертикальные разделители для месяцев в области полосы */}
        {months.map((_, index) => {
          if (index === 0) return null; // Пропускаем первый разделитель (он на границе)
          const monthPercent = (index / months.length) * 100;
          // Разделитель между годами (после декабря предыдущего года, перед январем текущего)
          const isYearDivider = index === 1; // После декабря предыдущего года
          return (
            <div
              key={index}
              className={`absolute top-0 bottom-0 ${isYearDivider ? 'w-0.5 bg-gray-700 z-10' : 'w-px bg-gray-300'}`}
              style={{ left: `${monthPercent}%` }}
            />
          );
        })}
        
        {/* Линия разделения между годами сверху полосы (в области заголовков) - точно на той же позиции */}
        <div
          className="absolute top-0 w-0.5 bg-gray-700 z-20"
          style={{
            left: `${(1 / months.length) * 100}%`, // Позиция после декабря предыдущего года (индекс 1)
            height: '4px', // Высота области заголовков
          }}
          title="Разделение между годами"
        />
        
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
        
        {/* Красная черта для даты окончания договора */}
        {contractEndPosition !== null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-600 z-10"
            style={{
              left: `${Math.max(0, Math.min(100, contractEndPosition))}%`,
            }}
            title={`Срок окончания договора: ${contractEndDate ? new Date(contractEndDate).toLocaleDateString('ru-RU') : ''}`}
          />
        )}
        
      </div>
      
      {/* Модальное окно для ввода пароля */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Введите пароль для сохранения изменений
            </h3>
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Пароль
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handlePasswordConfirm();
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Введите пароль"
                autoFocus
              />
              {passwordError && (
                <p className="mt-2 text-sm text-red-600">{passwordError}</p>
              )}
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setIsPasswordModalOpen(false);
                  setPassword('');
                  setPasswordError('');
                  setPendingUpdate(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handlePasswordConfirm}
                disabled={isUpdating}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


