'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PurchasePlanItem {
  id: number;
  year: number | null;
  company: string | null;
  purchaserCompany: string | null;
  cfo: string | null;
  purchaseSubject: string | null;
  purchaser: string | null;
  budgetAmount: number | null;
  requestDate: string | null;
  newContractDate: string | null;
  status: string | null;
  purchaseRequestId: number | null;
}

interface PageResponse {
  content: PurchasePlanItem[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export default function DeliveryPlanPage() {
  const router = useRouter();
  const [data] = useState<PageResponse | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('delivery-plan');
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved === 'true') {
      setIsSidebarCollapsed(true);
    }
  }, []);

  // Вычисляем даты для календаря
  const calendarDates = useMemo(() => {
    const dates: Date[] = [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    if (viewMode === 'month') {
      // Первый день месяца
      const firstDay = new Date(year, month, 1);
      // Последний день месяца
      const lastDay = new Date(year, month + 1, 0);
      // Первый день недели (понедельник = 0)
      const startDay = (firstDay.getDay() + 6) % 7; // Преобразуем воскресенье (0) в 6
      
      // Начинаем с понедельника недели, в которой находится первый день месяца
      const startDate = new Date(firstDay);
      startDate.setDate(startDate.getDate() - startDay);
      
      // Заканчиваем воскресеньем недели, в которой находится последний день месяца
      const endDay = (lastDay.getDay() + 6) % 7;
      const endDate = new Date(lastDay);
      endDate.setDate(endDate.getDate() + (6 - endDay));
      
      // Генерируем все даты
      const current = new Date(startDate);
      while (current <= endDate) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
    } else {
      // Неделя: находим понедельник текущей недели
      const today = new Date(currentDate);
      const dayOfWeek = (today.getDay() + 6) % 7; // Понедельник = 0
      const monday = new Date(today);
      monday.setDate(today.getDate() - dayOfWeek);
      
      // Генерируем 7 дней недели
      for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        dates.push(date);
      }
    }
    
    return dates;
  }, [currentDate, viewMode]);

  // Группируем элементы по датам
  const itemsByDate = useMemo(() => {
    if (!data?.content) return new Map<string, PurchasePlanItem[]>();
    
    const map = new Map<string, PurchasePlanItem[]>();
    
    data.content.forEach(item => {
      // Используем дату заявки или дату завершения закупки
      const dateStr = item.requestDate || item.newContractDate;
      if (dateStr) {
        const date = new Date(dateStr);
        const key = date.toISOString().split('T')[0];
        if (!map.has(key)) {
          map.set(key, []);
        }
        map.get(key)!.push(item);
      }
    });
    
    return map;
  }, [data]);

  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const goToPrevious = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() - 7);
      setCurrentDate(newDate);
    }
  };

  const goToNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + 7);
      setCurrentDate(newDate);
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const formatDateKey = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear();
  };

  if (!isMounted) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden p-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">План поставок</h1>
          
          <div className="bg-white rounded-lg shadow-lg overflow-hidden flex-1 flex flex-col">
              {/* Заголовок календаря с навигацией */}
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={goToPrevious}
                    className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                    title="Предыдущий период"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={goToToday}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Сегодня
                  </button>
                  <button
                    onClick={goToNext}
                    className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                    title="Следующий период"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </button>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {viewMode === 'month' 
                      ? `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
                      : `Неделя ${calendarDates[0]?.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} - ${calendarDates[calendarDates.length - 1]?.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}`
                    }
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode('month')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      viewMode === 'month'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Месяц
                  </button>
                  <button
                    onClick={() => setViewMode('week')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      viewMode === 'week'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Неделя
                  </button>
                </div>
              </div>
              
              {/* Календарная сетка */}
              <div className="p-4 flex-1 overflow-auto">
                {viewMode === 'month' ? (
                  <div className="grid grid-cols-7 gap-1">
                    {/* Заголовки дней недели */}
                    {weekDays.map((day) => (
                      <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
                        {day}
                      </div>
                    ))}
                    {/* Ячейки календаря */}
                    {calendarDates.map((date, index) => {
                      const dateKey = formatDateKey(date);
                      const items = itemsByDate.get(dateKey) || [];
                      const isTodayDate = isToday(date);
                      const isCurrentMonthDate = isCurrentMonth(date);
                      
                      return (
                        <div
                          key={index}
                          className={`min-h-[150px] border border-gray-200 rounded p-2 ${
                            !isCurrentMonthDate ? 'bg-gray-50 opacity-50' : 'bg-white'
                          } ${isTodayDate ? 'ring-2 ring-blue-500' : ''}`}
                        >
                          <div className={`text-sm font-medium mb-2 ${
                            isTodayDate ? 'text-blue-600 font-bold' : isCurrentMonthDate ? 'text-gray-900' : 'text-gray-400'
                          }`}>
                            {date.getDate()}
                          </div>
                          <div className="space-y-1 max-h-[120px] overflow-y-auto">
                            {items.slice(0, 5).map((item) => (
                              <div
                                key={item.id}
                                onClick={() => item.purchaseRequestId && router.push(`/purchase-request/${item.purchaseRequestId}`)}
                                className={`text-xs px-2 py-1 rounded cursor-pointer truncate ${
                                  item.purchaseRequestId ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' : 'bg-gray-100 text-gray-600'
                                }`}
                                title={item.purchaseSubject || `ID: ${item.id}`}
                              >
                                {item.purchaseSubject ? (item.purchaseSubject.length > 25 ? item.purchaseSubject.substring(0, 25) + '...' : item.purchaseSubject) : `ID: ${item.id}`}
                              </div>
                            ))}
                            {items.length > 5 && (
                              <div className="text-xs text-gray-500 px-2 py-1">
                                +{items.length - 5} еще
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-7 gap-2">
                    {/* Заголовки дней недели */}
                    {weekDays.map((day, dayIndex) => {
                      const date = calendarDates[dayIndex];
                      return (
                        <div key={day} className="text-center border-b border-gray-200 pb-2">
                          <div className="text-xs font-semibold text-gray-600">{day}</div>
                          <div className={`text-sm font-medium mt-1 ${
                            isToday(date) ? 'text-blue-600 font-bold' : 'text-gray-900'
                          }`}>
                            {date.getDate()}
                          </div>
                        </div>
                      );
                    })}
                    {/* Содержимое дней недели */}
                    {calendarDates.map((date, dayIndex) => {
                      const dateKey = formatDateKey(date);
                      const items = itemsByDate.get(dateKey) || [];
                      const isTodayDate = isToday(date);
                      
                      return (
                        <div
                          key={dayIndex}
                          className={`min-h-[500px] border border-gray-200 rounded p-3 ${
                            isTodayDate ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white'
                          }`}
                        >
                          <div className="space-y-1">
                            {items.map((item) => (
                              <div
                                key={item.id}
                                onClick={() => item.purchaseRequestId && router.push(`/purchase-request/${item.purchaseRequestId}`)}
                                className={`p-2 rounded border cursor-pointer hover:shadow-md transition-shadow ${
                                  item.purchaseRequestId ? 'bg-blue-100 border-blue-300 hover:bg-blue-200' : 'bg-gray-100 border-gray-300'
                                }`}
                              >
                                <div className="text-xs font-semibold text-gray-900 mb-1">
                                  {item.purchaseSubject || `ID: ${item.id}`}
                                </div>
                                <div className="text-[10px] text-gray-600 space-y-0.5">
                                  {item.company && <div>Заказчик: {item.company}</div>}
                                  {item.purchaserCompany && <div>Исполнитель: {item.purchaserCompany}</div>}
                                  {item.cfo && <div>ЦФО: {item.cfo}</div>}
                                  {item.budgetAmount && (
                                    <div>Бюджет: {new Intl.NumberFormat('ru-RU', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(item.budgetAmount)} UZS</div>
                                  )}
                                </div>
                              </div>
                            ))}
                            {items.length === 0 && (
                              <div className="text-xs text-gray-400 text-center py-4">
                                Нет событий
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}

