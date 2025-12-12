'use client';

import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { getBackendUrl } from '@/utils/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

export default function PurchasePlanItemsMonthlyChart() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [allYears, setAllYears] = useState<number[]>([]);
  const [yearsLoaded, setYearsLoaded] = useState(false);

  // Загружаем список доступных годов при первой загрузке (оптимизированный endpoint)
  useEffect(() => {
    const fetchAvailableYears = async () => {
      try {
        const backendUrl = getBackendUrl();
        const url = `${backendUrl}/api/purchase-requests/years?requiresPurchase=true`;
        const response = await fetch(url);
        if (response.ok) {
          const years = await response.json();
          setAllYears(years);
          // Устанавливаем текущий год по умолчанию, если есть данные
          if (years.length > 0) {
            const currentYear = new Date().getFullYear();
            // Проверяем, есть ли текущий год в списке доступных годов
            const yearToSet = years.includes(currentYear) ? currentYear : years[years.length - 1];
            setSelectedYear(yearToSet);
          }
          setYearsLoaded(true);
        } else {
          setYearsLoaded(true); // Устанавливаем в true даже при ошибке, чтобы не блокировать загрузку
        }
      } catch (err) {
        console.error('Error fetching available years:', err);
        setYearsLoaded(true); // Устанавливаем в true даже при ошибке, чтобы не блокировать загрузку
      }
    };
    
    fetchAvailableYears();
  }, []);

  // Загрузка данных диаграммы
  useEffect(() => {
    // Не загружаем данные, пока годы не загружены
    if (!yearsLoaded) {
      return;
    }
    
    // Если selectedYear все еще null после загрузки годов и есть доступные годы, ждем установки
    if (selectedYear === null && allYears.length > 0) {
      return; // Ждем, пока selectedYear будет установлен
    }
    
    // Если годов нет, загружаем данные без фильтра (selectedYear останется null)

    const fetchData = async () => {
      try {
        setLoading(true);
        const backendUrl = getBackendUrl();
        
        // Загружаем позиции плана закупок для года = selectedYear + 1 (оптимизированный endpoint)
        const planItemsYear = selectedYear !== null ? selectedYear + 1 : null;
        let planItemsUrl = `${backendUrl}/api/purchase-plan-items/monthly-stats`;
        if (planItemsYear !== null) {
          planItemsUrl += `?year=${planItemsYear}`;
        }
        console.log('Fetching purchase plan items monthly stats from:', planItemsUrl, 'for year:', planItemsYear);
        
        const planItemsResponse = await fetch(planItemsUrl);
        if (!planItemsResponse.ok) {
          throw new Error(`Ошибка загрузки данных плана закупок: ${planItemsResponse.status} ${planItemsResponse.statusText}`);
        }
        const planItemsResult = await planItemsResponse.json();
        const planItemsMonthCounts = planItemsResult.monthCounts || {};
        
        console.log('Loaded plan items monthly stats:', planItemsMonthCounts);
        
        // Загружаем заявки на закупку с requiresPurchase = true (оптимизированный endpoint)
        let purchaseRequestsUrl = `${backendUrl}/api/purchase-requests/monthly-stats?requiresPurchase=true`;
        if (selectedYear !== null) {
          purchaseRequestsUrl += `&year=${selectedYear}`;
        }
        console.log('Fetching purchase requests monthly stats from:', purchaseRequestsUrl);
            
        const purchaseRequestsResponse = await fetch(purchaseRequestsUrl);
        if (!purchaseRequestsResponse.ok) {
          throw new Error(`Ошибка загрузки данных заявок: ${purchaseRequestsResponse.status} ${purchaseRequestsResponse.statusText}`);
        }
        const purchaseRequestsResult = await purchaseRequestsResponse.json();
        const purchaseRequestsMonthCounts = purchaseRequestsResult.monthCounts || {};
        
        console.log('Loaded purchase requests monthly stats:', purchaseRequestsMonthCounts);
        
        // Месяцы с декабрем выбранного года в начале
        // Бэкенд возвращает данные с ключом "Дек (пред. год)", но отображаем "Дек" + год
        const decemberLabel = selectedYear ? `Дек ${selectedYear}` : 'Дек (пред. год)';
        const monthLabels = [decemberLabel, 'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
        
        // Ключи для получения данных из бэкенда (бэкенд использует "Дек (пред. год)")
        const backendMonthKeys = ['Дек (пред. год)', 'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
        
        // Собираем все значения для вычисления максимума (используем ключи бэкенда)
        const allPlanItemsValues = backendMonthKeys.map(month => planItemsMonthCounts[month] || 0).filter(v => v > 0);
        const allPurchaseRequestsValues = backendMonthKeys.map(month => purchaseRequestsMonthCounts[month] || 0).filter(v => v > 0);
        const maxPlanItems = allPlanItemsValues.length > 0 ? Math.max(...allPlanItemsValues) : 1;
        const maxPurchaseRequests = allPurchaseRequestsValues.length > 0 ? Math.max(...allPurchaseRequestsValues) : 1;
        const globalMax = Math.max(maxPlanItems, maxPurchaseRequests);
        
        // Функция для применения нелинейного масштабирования (как в диаграмме плана закупок)
        // Используем степенную функцию с показателем 0.4 для более агрессивного масштабирования маленьких значений
        const applyNonLinearScaling = (value: number, maxValue: number): number => {
          if (value <= 0 || maxValue <= 0) return 0;
          const ratio = value / maxValue;
          const scaledRatio = Math.pow(ratio, 0.4);
          // Округляем до целого числа для избежания дробных значений
          return Math.round(scaledRatio * maxValue);
        };
        
        const chartData = {
          labels: monthLabels,
          datasets: [
            {
              label: planItemsYear ? `Позиции плана закупок (${planItemsYear} год)` : 'Позиции плана закупок',
              // Применяем нелинейное масштабирование к данным для отображения
              // Сохраняем оригинальные значения в метаданных для подписей и тултипов
              data: backendMonthKeys.map(month => {
                const originalValue = planItemsMonthCounts[month] || 0;
                if (originalValue <= 0) return null;
                // Применяем нелинейное масштабирование
                return applyNonLinearScaling(originalValue, globalMax);
              }),
              // Сохраняем оригинальные значения для использования в подписях
              _originalValues: backendMonthKeys.map(month => planItemsMonthCounts[month] || 0),
              backgroundColor: 'rgba(34, 197, 94, 1)',
              borderColor: 'rgba(34, 197, 94, 1)',
              borderWidth: 0, // Убираем контуры
              borderRadius: 6,
            },
            {
              label: `Заявки на закупку (требуется закупка)${selectedYear ? ` (${selectedYear} год)` : ''}`,
              // Применяем нелинейное масштабирование к данным для отображения
              data: backendMonthKeys.map(month => {
                const originalValue = purchaseRequestsMonthCounts[month] || 0;
                if (originalValue <= 0) return null;
                // Применяем нелинейное масштабирование
                return applyNonLinearScaling(originalValue, globalMax);
              }),
              // Сохраняем оригинальные значения для использования в подписях
              _originalValues: backendMonthKeys.map(month => purchaseRequestsMonthCounts[month] || 0),
              backgroundColor: 'rgba(59, 130, 246, 1)',
              borderColor: 'rgba(59, 130, 246, 1)',
              borderWidth: 0, // Убираем контуры
              borderRadius: 6,
            },
          ],
        };
        
        console.log('Chart data:', chartData);
        setData(chartData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [selectedYear, yearsLoaded, allYears.length]);

  // Обработчик события обновления дат
  useEffect(() => {
    const handleDatesUpdated = () => {
      // Перезагружаем данные диаграммы при изменении дат
      if (yearsLoaded && (selectedYear !== null || allYears.length === 0)) {
        const fetchData = async () => {
          try {
            setLoading(true);
            const backendUrl = getBackendUrl();
            
            // Загружаем позиции плана закупок для года = selectedYear + 1 (оптимизированный endpoint)
            const planItemsYear = selectedYear !== null ? selectedYear + 1 : null;
            let planItemsUrl = `${backendUrl}/api/purchase-plan-items/monthly-stats`;
            if (planItemsYear !== null) {
              planItemsUrl += `?year=${planItemsYear}`;
            }
            
            const planItemsResponse = await fetch(planItemsUrl);
            if (!planItemsResponse.ok) {
              throw new Error(`Ошибка загрузки данных плана закупок: ${planItemsResponse.status} ${planItemsResponse.statusText}`);
            }
            const planItemsResult = await planItemsResponse.json();
            const planItemsMonthCounts = planItemsResult.monthCounts || {};
            
            // Загружаем заявки на закупку с requiresPurchase = true (оптимизированный endpoint)
            let purchaseRequestsUrl = `${backendUrl}/api/purchase-requests/monthly-stats?requiresPurchase=true`;
            if (selectedYear !== null) {
              purchaseRequestsUrl += `&year=${selectedYear}`;
            }
            
            const purchaseRequestsResponse = await fetch(purchaseRequestsUrl);
            if (!purchaseRequestsResponse.ok) {
              throw new Error(`Ошибка загрузки данных заявок: ${purchaseRequestsResponse.status} ${purchaseRequestsResponse.statusText}`);
            }
            const purchaseRequestsResult = await purchaseRequestsResponse.json();
            const purchaseRequestsMonthCounts = purchaseRequestsResult.monthCounts || {};
            
            // Месяцы с декабрем выбранного года в начале
            const decemberLabel = selectedYear ? `Дек ${selectedYear}` : 'Дек (пред. год)';
            const monthLabels = [decemberLabel, 'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
            
            // Ключи для получения данных из бэкенда
            const backendMonthKeys = ['Дек (пред. год)', 'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
            
            // Собираем все значения для вычисления максимума
            const allPlanItemsValues = backendMonthKeys.map(month => planItemsMonthCounts[month] || 0).filter(v => v > 0);
            const allPurchaseRequestsValues = backendMonthKeys.map(month => purchaseRequestsMonthCounts[month] || 0).filter(v => v > 0);
            const maxPlanItems = allPlanItemsValues.length > 0 ? Math.max(...allPlanItemsValues) : 1;
            const maxPurchaseRequests = allPurchaseRequestsValues.length > 0 ? Math.max(...allPurchaseRequestsValues) : 1;
            const globalMax = Math.max(maxPlanItems, maxPurchaseRequests);
            
            // Функция для применения нелинейного масштабирования
            const applyNonLinearScaling = (value: number, maxValue: number): number => {
              if (value <= 0 || maxValue <= 0) return 0;
              const ratio = value / maxValue;
              const scaledRatio = Math.pow(ratio, 0.4);
              return Math.round(scaledRatio * maxValue);
            };
            
            const chartData = {
              labels: monthLabels,
              datasets: [
                {
                  label: planItemsYear ? `Позиции плана закупок (${planItemsYear} год)` : 'Позиции плана закупок',
                  data: backendMonthKeys.map(month => {
                    const originalValue = planItemsMonthCounts[month] || 0;
                    if (originalValue <= 0) return null;
                    return applyNonLinearScaling(originalValue, globalMax);
                  }),
                  _originalValues: backendMonthKeys.map(month => planItemsMonthCounts[month] || 0),
                  backgroundColor: 'rgba(34, 197, 94, 1)',
                  borderColor: 'rgba(34, 197, 94, 1)',
                  borderWidth: 0,
                  borderRadius: 6,
                },
                {
                  label: `Заявки на закупку (требуется закупка)${selectedYear ? ` (${selectedYear} год)` : ''}`,
                  data: backendMonthKeys.map(month => {
                    const originalValue = purchaseRequestsMonthCounts[month] || 0;
                    if (originalValue <= 0) return null;
                    return applyNonLinearScaling(originalValue, globalMax);
                  }),
                  _originalValues: backendMonthKeys.map(month => purchaseRequestsMonthCounts[month] || 0),
                  backgroundColor: 'rgba(59, 130, 246, 1)',
                  borderColor: 'rgba(59, 130, 246, 1)',
                  borderWidth: 0,
                  borderRadius: 6,
                },
              ],
            };
            
            setData(chartData);
          } catch (err) {
            console.error('Error fetching data:', err);
          } finally {
            setLoading(false);
          }
        };
        
        fetchData();
      }
    };

    window.addEventListener('purchasePlanItemDatesUpdated', handleDatesUpdated);
    
    return () => {
      window.removeEventListener('purchasePlanItemDatesUpdated', handleDatesUpdated);
    };
  }, [selectedYear, yearsLoaded, allYears.length]);

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white p-2 sm:p-3 rounded-lg shadow-md">
        <div className="mb-0.5 flex flex-wrap items-center gap-1.5 sm:gap-2 justify-between">
          <h3 className="text-xs sm:text-sm font-bold text-gray-900">Исполнение Плана Закупок</h3>
          {allYears.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-xs font-medium text-gray-700">Год создания заявки:</span>
              {allYears.map((year) => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={`px-2 py-1 text-xs rounded-md transition-colors ${
                    selectedYear === year
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="h-[250px] sm:h-[280px] flex items-center justify-center text-gray-500">
          Нет данных для отображения
        </div>
      </div>
    );
  }

  return (
      <div className="bg-white p-2 sm:p-3 rounded-lg shadow-md">
        <div className="mb-0.5 flex flex-wrap items-center gap-1.5 sm:gap-2 justify-between">
          <h3 className="text-xs sm:text-sm font-bold text-gray-900">Исполнение Плана Закупок</h3>
          {allYears.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-xs font-medium text-gray-700">Год создания заявки:</span>
              {allYears.map((year) => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={`px-2 py-1 text-xs rounded-md transition-colors ${
                    selectedYear === year
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          )}
        </div>
      <div className="h-[250px] sm:h-[280px]">
        <Bar 
          data={data} 
          options={{
            responsive: true,
            maintainAspectRatio: false,
            layout: {
              padding: {
                top: 5, // Минимальный отступ сверху для легенды
                right: 20,
                bottom: 10,
                left: 10
              }
            },
            plugins: {
              legend: {
                display: true,
                position: 'top' as const,
                align: 'start' as const, // Выравнивание легенды слева
              },
              tooltip: {
                enabled: true,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: 12,
                titleFont: {
                  size: 14,
                  weight: 'bold' as const
                },
                bodyFont: {
                  size: 13
                },
                callbacks: {
                  label: (context: any) => {
                    const datasetLabel = context.dataset.label || '';
                    // Используем оригинальные значения для тултипов
                    const originalValues = (context.dataset as any)._originalValues;
                    const originalValue = originalValues ? originalValues[context.dataIndex] : (context.parsed.y || 0);
                    if (datasetLabel.includes('позиций')) {
                      return `${datasetLabel}: ${originalValue} позиций`;
                    } else if (datasetLabel.includes('Заявки')) {
                      return `${datasetLabel}: ${originalValue} заявок`;
                    }
                    return `${datasetLabel}: ${originalValue}`;
                  }
                }
              },
              datalabels: {
                display: true,
                color: '#ffffff',
                font: {
                  weight: 'bold' as const,
                  size: 16
                },
                formatter: function(value: any, context: any) {
                  // Используем оригинальные значения для подписей (целые числа)
                  const dataset = context.dataset;
                  const originalValues = (dataset as any)._originalValues;
                  if (originalValues && originalValues[context.dataIndex] > 0) {
                    return originalValues[context.dataIndex];
                  }
                  return '';
                },
                anchor: 'center' as const,
                align: 'center' as const,
                offset: 0,
                padding: 4,
                textStrokeColor: 'rgba(0, 0, 0, 0.5)',
                textStrokeWidth: 2
              }
            },
            scales: {
              x: {
                grid: {
                  display: true,
                  color: 'rgba(0, 0, 0, 0.1)',
                  drawOnChartArea: true,
                  drawTicks: false
                },
                ticks: {
                  font: {
                    size: 12
                  },
                  padding: 10,
                  maxRotation: 0, // Убираем поворот подписей
                  minRotation: 0,  // Убираем поворот подписей
                  autoSkip: false  // Не пропускаем метки месяцев
                },
                categoryPercentage: 0.95,
                barPercentage: 0.98,
              } as any,
              y: {
                beginAtZero: true,
                grid: {
                  color: 'rgba(0, 0, 0, 0.05)'
                },
                ticks: {
                  display: false
                },
                display: false,
                // Настраиваем масштаб аналогично диаграмме на странице плана закупок
                // Используем простой отступ сверху, как в других диаграммах
                afterDataLimits: (scale: any) => {
                  scale.max += scale.max * 0.1;
                }
              } as any
            }
          } as any} 
        />
      </div>
    </div>
  );
}

