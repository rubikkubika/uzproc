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
        
        const chartData = {
          labels: years,
          datasets: [
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
        
        // Загружаем данные для закупок
        const purchasesUrl = `${backendUrl}/api/purchase-requests/monthly-stats?year=${selectedYear}&requiresPurchase=true&useCalendarYear=true`;
        const purchasesResponse = await fetch(purchasesUrl);
        const purchasesResult = await purchasesResponse.json();
        const purchasesMonthCounts = purchasesResult.monthCounts || {};
        
        // Загружаем данные для заказов
        const ordersUrl = `${backendUrl}/api/purchase-requests/monthly-stats?year=${selectedYear}&requiresPurchase=false&useCalendarYear=true`;
        const ordersResponse = await fetch(ordersUrl);
        const ordersResult = await ordersResponse.json();
        const ordersMonthCounts = ordersResult.monthCounts || {};
        
        // Формируем данные для линейной диаграммы
        const monthLabels = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
        const purchasesData = monthLabels.map(month => purchasesMonthCounts[month] || 0);
        const ordersData = monthLabels.map(month => ordersMonthCounts[month] || 0);
        
        const monthlyChartData = {
          labels: monthLabels,
          datasets: [
            {
              label: 'Закупка',
              data: purchasesData,
              borderColor: 'rgba(59, 130, 246, 1)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 6,
              pointBackgroundColor: 'rgba(59, 130, 246, 1)',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
            },
            {
              label: 'Заказ',
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
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'start' as const, // Выравнивание легенды слева
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
        top: 5, // Минимальный отступ сверху для легенды
        right: 30, // Добавляем отступ справа для подписей
        bottom: 15, // Добавляем отступ снизу для подписей
        left: 10,
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'start' as const, // Выравнивание легенды слева
      },
      title: {
        display: false, // Убираем title из Chart.js, добавим отдельно
      },
      datalabels: {
        display: true,
        anchor: (context: any) => {
          // Чередуем позицию подписей для предотвращения пересечений
          const datasetIndex = context.datasetIndex;
          // Для первого датасета размещаем сверху, для второго - снизу
          return datasetIndex === 0 ? 'end' : 'start';
        },
        align: (context: any) => {
          const datasetIndex = context.datasetIndex;
          return datasetIndex === 0 ? 'top' : 'bottom';
        },
        formatter: (value: number) => {
          return value > 0 ? value : '';
        },
        font: {
          size: 10,
          weight: 'bold' as const,
        },
        color: '#374151',
        offset: 8, // Увеличиваем смещение для предотвращения пересечений
        clamp: true, // Ограничиваем подписи границами диаграммы
        clip: false, // Не обрезаем подписи
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
          display: false, // Убираем деления с вертикальной оси
        },
        grid: {
          display: true, // Оставляем сетку
        },
      },
    },
  };

  return (
    <div className="bg-white p-2 sm:p-3 rounded-lg shadow-md space-y-2 sm:space-y-3">
      {/* Название диаграммы - над столбчатой диаграммой */}
      <div className="mb-1.5">
        <h3 className="text-xs sm:text-sm font-bold text-gray-900">Заявки на закупку по годам</h3>
      </div>
      {/* Столбчатая диаграмма по годам */}
      <div className="h-[250px] sm:h-[280px]">
        <Bar data={data} options={options} />
      </div>
      
      {/* Линейная диаграмма по месяцам */}
      {selectedYear !== null && (
        <div className="mt-2 sm:mt-3">
          {/* Название диаграммы и кнопки фильтра по году - на одном уровне */}
          <div className="mb-1 flex flex-wrap items-center gap-1.5 sm:gap-2 justify-between">
            <h3 className="text-xs sm:text-sm font-bold text-gray-900">
              {selectedYear ? `Заявки на закупку по месяцам (${selectedYear})` : 'Заявки на закупку по месяцам'}
            </h3>
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
          {monthlyLoading ? (
            <div className="h-[200px] sm:h-[240px] flex items-center justify-center">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-xs sm:text-sm text-gray-500">Загрузка данных...</p>
              </div>
            </div>
          ) : monthlyData ? (
            <div className="h-[200px] sm:h-[240px]">
              <Line data={monthlyData} options={monthlyOptions} />
            </div>
          ) : (
            <div className="h-[200px] sm:h-[240px] flex items-center justify-center">
              <p className="text-xs sm:text-sm text-gray-500">Нет данных для отображения</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

