'use client';

import { useEffect, useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
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
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

export default function PurchaseRequestsYearlyChart() {
  const [data, setData] = useState<any>(null);
  const [monthlyData, setMonthlyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [allYears, setAllYears] = useState<number[]>([]);
  const [yearsLoaded, setYearsLoaded] = useState(false);
  const [selectedBarData, setSelectedBarData] = useState<{year: string, dataset: string, value: number} | null>(null);
  const [selectedLineData, setSelectedLineData] = useState<{month: string, dataset: string, value: number} | null>(null);

  // Загружаем список доступных годов при первой загрузке
  useEffect(() => {
    const fetchAvailableYears = async () => {
      try {
        const backendUrl = getBackendUrl();
        const url = `${backendUrl}/api/purchase-requests/years`;
        const response = await fetch(url);
        if (response.ok) {
          const years = await response.json();
          setAllYears(years);
          // Устанавливаем текущий год по умолчанию, если есть данные
          if (years.length > 0) {
            const currentYear = new Date().getFullYear();
            const yearToSet = years.includes(currentYear) ? currentYear : years[years.length - 1];
            setSelectedYear(yearToSet);
          }
          setYearsLoaded(true);
        } else {
          setYearsLoaded(true);
        }
      } catch (err) {
        console.error('Error fetching available years:', err);
        setYearsLoaded(true);
      }
    };
    
    fetchAvailableYears();
  }, []);

  // Загружаем данные по годам
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const backendUrl = getBackendUrl();
        const url = `${backendUrl}/api/purchase-requests/yearly-stats`;
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Ошибка загрузки данных: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        
        const years = (result.years || []).map((year: number) => year.toString());
        const purchases = result.purchases || [];
        const orders = result.orders || [];
        const pendingStatus = result.pendingStatus || [];
        
        const chartData = {
          labels: years,
          datasets: [
            {
              label: 'Не согласована / Не утверждена / Проект',
              data: pendingStatus,
              backgroundColor: 'rgba(239, 68, 68, 0.8)',
              borderColor: 'rgba(239, 68, 68, 1)',
              borderWidth: 1,
            },
            {
              label: 'Закупка',
              data: purchases,
              backgroundColor: 'rgba(59, 130, 246, 0.8)',
              borderColor: 'rgba(59, 130, 246, 1)',
              borderWidth: 1,
            },
            {
              label: 'Заказ',
              data: orders,
              backgroundColor: 'rgba(34, 197, 94, 0.8)',
              borderColor: 'rgba(34, 197, 94, 1)',
              borderWidth: 1,
            },
          ],
        };
        
        setData(chartData);
      } catch (err) {
        console.error('Error fetching yearly stats:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Загружаем месячные данные для выбранного года
  useEffect(() => {
    if (!yearsLoaded || selectedYear === null) {
      return;
    }

    const fetchMonthlyData = async () => {
      try {
        setMonthlyLoading(true);
        const backendUrl = getBackendUrl();
        
        // Загружаем данные для заявок на закупку где требуется закупка (requiresPurchase = true)
        const purchaseRequestsWithPurchaseUrl = `${backendUrl}/api/purchase-requests/monthly-stats?year=${selectedYear}&requiresPurchase=true&useCalendarYear=true`;
        const purchaseRequestsWithPurchaseResponse = await fetch(purchaseRequestsWithPurchaseUrl);
        const purchaseRequestsWithPurchaseResult = await purchaseRequestsWithPurchaseResponse.json();
        const purchaseRequestsWithPurchaseMonthCounts = purchaseRequestsWithPurchaseResult.monthCounts || {};
        const purchaseRequestsWithPurchasePendingStatusMonthCounts = purchaseRequestsWithPurchaseResult.pendingStatusMonthCounts || {};
        
        // Загружаем данные для заказов (requiresPurchase = false) - это заявки на закупку где не требуется закупка
        const ordersUrl = `${backendUrl}/api/purchase-requests/monthly-stats?year=${selectedYear}&requiresPurchase=false&useCalendarYear=true`;
        const ordersResponse = await fetch(ordersUrl);
        const ordersResult = await ordersResponse.json();
        const ordersMonthCounts = ordersResult.monthCounts || {};
        const ordersPendingStatusMonthCounts = ordersResult.pendingStatusMonthCounts || {};
        
        // Загружаем данные для закупочных процедур (Purchase)
        const purchasesUrl = `${backendUrl}/api/purchases/monthly-stats?year=${selectedYear}&useCalendarYear=true`;
        const purchasesResponse = await fetch(purchasesUrl);
        const purchasesResult = await purchasesResponse.json();
        const purchasesMonthCounts = purchasesResult.monthCounts || {};
        const purchasesPendingStatusMonthCounts = purchasesResult.pendingStatusMonthCounts || {};
        
        // Формируем данные для линейной диаграммы
        const monthLabels = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
        // Заявки на закупку = все заявки (и где требуется закупка, и где не требуется) = суммируем оба типа
        const allPurchaseRequestsData = monthLabels.map(month => 
          (purchaseRequestsWithPurchaseMonthCounts[month] || 0) + 
          (ordersMonthCounts[month] || 0)
        );
        // Заказы = заявки на закупку где не требуется закупка (requiresPurchase = false)
        const ordersData = monthLabels.map(month => ordersMonthCounts[month] || 0);
        // Закупочная процедура = сущность Purchase
        const purchasesData = monthLabels.map(month => purchasesMonthCounts[month] || 0);
        
        // Объединяем статусы "не согласовано, не утверждено, проект" для заявок на закупку и закупочных процедур
        const pendingStatusData = monthLabels.map(month => 
          (purchaseRequestsWithPurchasePendingStatusMonthCounts[month] || 0) + 
          (ordersPendingStatusMonthCounts[month] || 0) +
          (purchasesPendingStatusMonthCounts[month] || 0)
        );
        
        const monthlyChartData = {
          labels: monthLabels,
          datasets: [
            {
              label: 'Заявки на закупку',
              data: allPurchaseRequestsData,
              borderColor: 'rgba(75, 85, 99, 0.5)',
              backgroundColor: 'rgba(75, 85, 99, 0.05)',
              fill: true,
              tension: 0.4,
              pointRadius: 3,
              pointHoverRadius: 5,
              pointBackgroundColor: 'rgba(75, 85, 99, 0.5)',
              pointBorderColor: '#fff',
              pointBorderWidth: 1,
            },
            {
              label: 'Заказы',
              data: ordersData,
              borderColor: 'rgba(34, 197, 94, 1)',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 6,
              pointBackgroundColor: 'rgba(34, 197, 94, 1)',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
            },
            {
              label: 'Закупочная процедура',
              data: purchasesData,
              borderColor: 'rgba(168, 85, 247, 1)',
              backgroundColor: 'rgba(168, 85, 247, 0.1)',
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 6,
              pointBackgroundColor: 'rgba(168, 85, 247, 1)',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
            },
            {
              label: 'Не согласована / Не утверждена / Проект',
              data: pendingStatusData,
              borderColor: 'rgba(156, 163, 175, 0.5)',
              backgroundColor: 'rgba(156, 163, 175, 0.05)',
              fill: true,
              tension: 0.4,
              pointRadius: 3,
              pointHoverRadius: 5,
              pointBackgroundColor: 'rgba(156, 163, 175, 0.5)',
              pointBorderColor: '#fff',
              pointBorderWidth: 1,
            },
          ],
        };
        
        setMonthlyData(monthlyChartData);
      } catch (err) {
        console.error('Error fetching monthly stats:', err);
      } finally {
        setMonthlyLoading(false);
      }
    };
    
    fetchMonthlyData();
  }, [selectedYear, yearsLoaded]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        bottom: 0,
      },
    },
    onClick: (event: any, elements: any[]) => {
      if (elements.length > 0) {
        const element = elements[0];
        const datasetIndex = element.datasetIndex;
        const index = element.index;
        const year = data.labels[index];
        const dataset = data.datasets[datasetIndex];
        const value = dataset.data[index];
        setSelectedBarData({
          year: year,
          dataset: dataset.label,
          value: value
        });
        setSelectedLineData(null); // Сбрасываем выбор линейной диаграммы
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'start' as const, // Выравнивание легенды слева
        labels: {
          boxWidth: 12,
          padding: 6,
          font: {
            size: 10
          },
          usePointStyle: false,
        },
        display: true,
        fullSize: false,
      },
      title: {
        display: false, // Убираем title из Chart.js, название уже есть в компоненте
      },
      datalabels: {
        anchor: 'center' as const,
        align: 'center' as const,
        formatter: (value: number) => {
          return value > 0 ? value : '';
        },
        font: {
          weight: 'bold' as const,
          size: 16
        },
        color: '#ffffff',
        textStrokeColor: 'rgba(0, 0, 0, 0.5)',
        textStrokeWidth: 2,
        padding: 4,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${context.parsed.y}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          display: false, // Убираем значения с вертикальной оси
        },
        grid: {
          display: false, // Убираем вертикальные деления
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md h-[300px] sm:h-[350px] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-xs sm:text-sm text-gray-500">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md h-[300px] sm:h-[350px] flex items-center justify-center">
        <p className="text-xs sm:text-sm text-gray-500">Нет данных для отображения</p>
      </div>
    );
  }

  const monthlyOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 20,
        right: 10,
        bottom: 0,
        left: 10,
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'start' as const, // Выравнивание легенды слева, как у столбчатой диаграммы
        labels: {
          boxWidth: 12,
          padding: 6,
          font: {
            size: 10
          },
          usePointStyle: false,
        },
        display: true,
        fullSize: false,
        maxWidth: undefined, // Не ограничиваем ширину
        maxHeight: undefined, // Не ограничиваем высоту
      },
      title: {
        display: false, // Убираем title из Chart.js, добавим отдельно
      },
      datalabels: {
        display: (context: any) => {
          // Показываем подписи только для "Заказы" (индекс 1) и "Закупочная процедура" (индекс 2)
          // Скрываем для "Заявки на закупку" (индекс 0) и "Не согласована / Не утверждена / Проект" (индекс 3)
          return context.datasetIndex === 1 || context.datasetIndex === 2;
        },
        anchor: 'center' as const,
        align: (context: any) => {
          const datasetIndex = context.datasetIndex;
          // Размещаем подписи внутри области диаграммы
          return datasetIndex === 1 ? 'bottom' : 'top';
        },
        formatter: (value: number) => {
          return value > 0 ? value : '';
        },
        font: {
          size: 10,
          weight: 'bold' as const,
        },
        color: '#ffffff', // Белый шрифт
        backgroundColor: (context: any) => {
          // Цвет фона соответствует цвету линии
          const dataset = context.dataset;
          return dataset.borderColor;
        },
        borderRadius: 4, // Скругленные углы квадратика
        padding: {
          top: 4,
          bottom: 4,
          left: 6,
          right: 6,
        },
        offset: -8, // Отрицательное смещение - размещаем подписи внутри области диаграммы
        clamp: true, // Ограничиваем подписи границами диаграммы
        clip: true, // Обрезаем подписи, которые выходят за границы
        overflow: 'hidden' as const, // Скрываем подписи, которые выходят за границы
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${context.parsed.y}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false, // Убираем сетку по оси X
        },
        min: -0.25, // Расширяем на четверть деления до первой точки
        max: 11.25, // Расширяем на четверть деления после последней точки (12 месяцев, индексы 0-11)
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          display: false, // Убираем деления с вертикальной оси
        },
        grid: {
          display: true, // Оставляем сетку
        },
      },
    },
  };

  return (
    <div className="bg-white p-2 sm:p-3 rounded-lg shadow-md space-y-2 sm:space-y-3 w-full">
      {/* Название диаграммы - над диаграммами */}
      <div className="mb-1.5">
        <h3 className="text-xs sm:text-sm font-bold text-gray-900">Заявки на закупку по годам</h3>
      </div>
      {/* Диаграммы на одном уровне */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-3 w-full items-start">
        {/* Столбчатая диаграмма по годам */}
        <div className="lg:col-span-1 w-full flex flex-col">
          {/* Пустой заголовок для выравнивания с линейной диаграммой */}
          <div className="mb-1 h-[32px] sm:h-[36px] flex items-center">
            <h3 className="text-xs sm:text-sm font-bold text-gray-900">По годам</h3>
          </div>
          <div className="h-[250px] sm:h-[280px] w-full">
            <Bar data={data} options={options} />
          </div>
        </div>
        
        {/* Линейная диаграмма по месяцам */}
        {selectedYear !== null && (
          <div className="lg:col-span-2 w-full flex flex-col">
            <div className="mb-1 h-[32px] sm:h-[36px] flex flex-wrap items-center gap-1.5 sm:gap-2 justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-gray-900">
                {selectedYear ? `По месяцам (${selectedYear})` : 'По месяцам'}
              </h3>
              {allYears.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="text-xs font-medium text-gray-700">Год:</span>
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
            <div className="h-[250px] sm:h-[280px] w-full">
              {monthlyLoading ? (
                <div className="h-full w-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-xs sm:text-sm text-gray-500">Загрузка данных...</p>
                  </div>
                </div>
              ) : monthlyData ? (
                <Line data={monthlyData} options={monthlyOptions} />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <p className="text-xs sm:text-sm text-gray-500">Нет данных для отображения</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Блок для отображения деталей */}
      <div className="mt-2 sm:mt-3 bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
        {selectedBarData || selectedLineData ? (
          <div className="space-y-2">
            <h4 className="text-xs sm:text-sm font-semibold text-gray-900">Детали выбранного элемента:</h4>
            {selectedBarData && (
              <div className="text-xs sm:text-sm text-gray-700 space-y-1">
                <p><span className="font-medium">Год:</span> {selectedBarData.year}</p>
                <p><span className="font-medium">Тип:</span> {selectedBarData.dataset}</p>
                <p><span className="font-medium">Количество:</span> {selectedBarData.value}</p>
              </div>
            )}
            {selectedLineData && (
              <div className="text-xs sm:text-sm text-gray-700 space-y-1">
                <p><span className="font-medium">Месяц:</span> {selectedLineData.month}</p>
                <p><span className="font-medium">Тип:</span> {selectedLineData.dataset}</p>
                <p><span className="font-medium">Количество:</span> {selectedLineData.value}</p>
                {selectedYear && <p><span className="font-medium">Год:</span> {selectedYear}</p>}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-xs sm:text-sm text-gray-500">
              Выберите данные на диаграмме, чтобы посмотреть детали
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

