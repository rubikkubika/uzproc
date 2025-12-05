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

  // Загружаем список доступных годов при первой загрузке
  // Используем небольшой размер страницы для получения только списка годов
  useEffect(() => {
    const fetchAvailableYears = async () => {
      try {
        const backendUrl = getBackendUrl();
        // Загружаем только первую страницу с фильтром requiresPurchase=true для получения списка годов
        const url = `${backendUrl}/api/purchase-requests?page=0&size=1000&requiresPurchase=true`;
        const response = await fetch(url);
        if (response.ok) {
          const result = await response.json();
          const requests = result.content || [];
          const years = new Set<number>();
          requests.forEach((request: any) => {
            if (request.createdAt) {
              const date = new Date(request.createdAt);
              const year = date.getFullYear();
              if (!isNaN(year)) {
                years.add(year);
              }
            }
          });
          
          // Если есть больше данных, загружаем еще страницы для получения всех годов
          if (result.totalPages > 1) {
            const allPromises = [];
            for (let page = 1; page < Math.min(result.totalPages, 10); page++) {
              allPromises.push(
                fetch(`${backendUrl}/api/purchase-requests?page=${page}&size=1000&requiresPurchase=true`)
                  .then(res => res.json())
                  .then(data => data.content || [])
              );
            }
            const allPages = await Promise.all(allPromises);
            allPages.flat().forEach((request: any) => {
              if (request.createdAt) {
                const date = new Date(request.createdAt);
                const year = date.getFullYear();
                if (!isNaN(year)) {
                  years.add(year);
                }
              }
            });
          }
          
          const sortedYears = Array.from(years).sort((a, b) => b - a);
          setAllYears(sortedYears);
          // Устанавливаем текущий год по умолчанию, если есть данные
          if (sortedYears.length > 0 && selectedYear === null) {
            setSelectedYear(new Date().getFullYear());
          }
        }
      } catch (err) {
        console.error('Error fetching available years:', err);
      }
    };
    
    fetchAvailableYears();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const backendUrl = getBackendUrl();
        
        // Загружаем позиции плана закупок для года = selectedYear + 1
        const planItemsYear = selectedYear !== null ? selectedYear + 1 : null;
        let planItemsUrl = `${backendUrl}/api/purchase-plan-items?page=0&size=10000`;
        if (planItemsYear !== null) {
          planItemsUrl += `&year=${planItemsYear}`;
        }
        console.log('Fetching purchase plan items from:', planItemsUrl, 'for year:', planItemsYear);
        
        const planItemsResponse = await fetch(planItemsUrl);
        if (!planItemsResponse.ok) {
          throw new Error(`Ошибка загрузки данных плана закупок: ${planItemsResponse.status} ${planItemsResponse.statusText}`);
        }
        const planItemsResult = await planItemsResponse.json();
        const planItems = planItemsResult.content || [];
        
        console.log('Loaded plan items:', planItems.length, 'for year:', planItemsYear);
        
        // Загружаем заявки на закупку с requiresPurchase = true
        // Фильтры применяются на бэкенде (year, requiresPurchase)
        // Загружаем все страницы для получения всех отфильтрованных данных
        // Также загружаем декабрь предыдущего года для отображения в начале диаграммы
        let purchaseRequests: any[] = [];
        
        // Функция для загрузки данных по году
        const loadPurchaseRequestsByYear = async (year: number | null) => {
          let requests: any[] = [];
          let currentPage = 0;
          let hasMorePages = true;
          
          while (hasMorePages) {
            const params = new URLSearchParams();
            params.append('page', String(currentPage));
            params.append('size', '1000'); // Используем разумный размер страницы
            params.append('requiresPurchase', 'true');
            if (year !== null) {
              params.append('year', String(year));
            }
            
            const purchaseRequestsUrl = `${backendUrl}/api/purchase-requests?${params.toString()}`;
            console.log('Fetching purchase requests from:', purchaseRequestsUrl);
            
            const purchaseRequestsResponse = await fetch(purchaseRequestsUrl);
            if (!purchaseRequestsResponse.ok) {
              throw new Error(`Ошибка загрузки данных заявок: ${purchaseRequestsResponse.status} ${purchaseRequestsResponse.statusText}`);
            }
            const purchaseRequestsResult = await purchaseRequestsResponse.json();
            const pageContent = purchaseRequestsResult.content || [];
            requests = requests.concat(pageContent);
            
            hasMorePages = currentPage + 1 < purchaseRequestsResult.totalPages;
            currentPage++;
            
            // Ограничиваем количество страниц для безопасности
            if (currentPage >= 100) {
              console.warn('Reached maximum page limit (100)');
              break;
            }
          }
          
          return requests;
        };
        
        // Загружаем данные для выбранного года
        if (selectedYear !== null) {
          const currentYearRequests = await loadPurchaseRequestsByYear(selectedYear);
          // Фильтруем только ноябрь и декабрь выбранного года
          const currentYearNovemberDecember = currentYearRequests.filter((request: any) => {
            if (request.createdAt) {
              const date = new Date(request.createdAt);
              const month = date.getMonth(); // 0-11
              return date.getFullYear() === selectedYear && (month === 10 || month === 11); // 10 = ноябрь, 11 = декабрь
            }
            return false;
          });
          purchaseRequests = purchaseRequests.concat(currentYearNovemberDecember);
          
          // Загружаем декабрь предыдущего года
          const previousYear = selectedYear - 1;
          const previousYearRequests = await loadPurchaseRequestsByYear(previousYear);
          // Фильтруем только декабрь предыдущего года
          const previousYearDecember = previousYearRequests.filter((request: any) => {
            if (request.createdAt) {
              const date = new Date(request.createdAt);
              return date.getFullYear() === previousYear && date.getMonth() === 11; // 11 = декабрь
            }
            return false;
          });
          purchaseRequests = purchaseRequests.concat(previousYearDecember);
        } else {
          // Если год не выбран, загружаем все данные
          purchaseRequests = await loadPurchaseRequestsByYear(null);
        }
        
        console.log('Loaded purchase requests (filtered on backend):', purchaseRequests.length);
        
        // Месяцы с декабрем предыдущего года в начале
        const monthLabels = ['Дек (пред. год)', 'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
        const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
        
        // Группируем позиции плана закупок по месяцам на основе requestDate
        const planItemsMonthCounts: Record<string, number> = {};
        monthLabels.forEach(month => {
          planItemsMonthCounts[month] = 0;
        });
        
        planItems.forEach((item: any) => {
          if (item.requestDate) {
            const date = new Date(item.requestDate);
            const monthIndex = date.getMonth(); // 0-11
            const year = date.getFullYear();
            
            // Проверяем, что год соответствует году плана закупок (selectedYear + 1)
            if (planItemsYear !== null && year === planItemsYear) {
              const monthLabel = monthNames[monthIndex];
              planItemsMonthCounts[monthLabel] = (planItemsMonthCounts[monthLabel] || 0) + 1;
            } else if (planItemsYear === null) {
              // Если год не выбран, показываем все данные
              const monthLabel = monthNames[monthIndex];
              planItemsMonthCounts[monthLabel] = (planItemsMonthCounts[monthLabel] || 0) + 1;
            }
            // Игнорируем записи из других годов
          }
        });
        
        // Группируем заявки на закупку по месяцам на основе createdAt (дата создания записи в БД)
        const purchaseRequestsMonthCounts: Record<string, number> = {};
        monthLabels.forEach(month => {
          purchaseRequestsMonthCounts[month] = 0;
        });
        
        const previousYear = selectedYear !== null ? selectedYear - 1 : null;
        
        purchaseRequests.forEach((request: any) => {
          // Используем createdAt для группировки по месяцам (дата создания записи в БД)
          if (request.createdAt) {
            const date = new Date(request.createdAt);
            const monthIndex = date.getMonth(); // 0-11
            const year = date.getFullYear();
            
            // Проверяем, что год соответствует выбранному году (или предыдущему для декабря)
            if (selectedYear !== null) {
              // Если это декабрь предыдущего года, добавляем в "Дек (пред. год)"
              if (monthIndex === 11 && year === previousYear) {
                purchaseRequestsMonthCounts['Дек (пред. год)'] = (purchaseRequestsMonthCounts['Дек (пред. год)'] || 0) + 1;
              } else if (year === selectedYear) {
                // Остальные месяцы выбранного года
                const monthLabel = monthNames[monthIndex];
                purchaseRequestsMonthCounts[monthLabel] = (purchaseRequestsMonthCounts[monthLabel] || 0) + 1;
              }
              // Игнорируем записи из других годов
            } else {
              // Если год не выбран, показываем все данные
              // Если это декабрь предыдущего года (относительно текущего года), добавляем в "Дек (пред. год)"
              const currentYear = new Date().getFullYear();
              if (monthIndex === 11 && year === currentYear - 1) {
                purchaseRequestsMonthCounts['Дек (пред. год)'] = (purchaseRequestsMonthCounts['Дек (пред. год)'] || 0) + 1;
              } else {
                const monthLabel = monthNames[monthIndex];
                purchaseRequestsMonthCounts[monthLabel] = (purchaseRequestsMonthCounts[monthLabel] || 0) + 1;
              }
            }
          }
        });
        
        const chartData = {
          labels: monthLabels,
          datasets: [
            {
              label: `Количество позиций плана закупок${planItemsYear ? ` (${planItemsYear} год)` : ''}`,
              data: monthLabels.map(month => planItemsMonthCounts[month] || 0),
              backgroundColor: 'rgba(34, 197, 94, 0.8)',
              borderColor: 'rgb(22, 163, 74)',
              borderWidth: 1,
            },
            {
              label: `Заявки на закупку (требуется закупка)${selectedYear ? ` (${selectedYear} год)` : ''}`,
              data: monthLabels.map(month => purchaseRequestsMonthCounts[month] || 0),
              backgroundColor: 'rgba(59, 130, 246, 0.8)',
              borderColor: 'rgb(37, 99, 235)',
              borderWidth: 1,
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
  }, [selectedYear]);

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
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">План закупок и заявки по месяцам</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          Нет данных для отображения
        </div>
      </div>
    );
  }

  return (
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">План закупок и заявки по месяцам</h3>
          {allYears.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700 font-medium">Год создания заявки:</span>
              {allYears.map((year) => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    selectedYear === year
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          )}
        </div>
      <div className="h-64">
        <Bar 
          data={data} 
          options={{
            responsive: true,
            maintainAspectRatio: false,
            layout: {
              padding: 20
            },
            plugins: {
              legend: {
                display: true,
                position: 'top' as const,
              },
              tooltip: {
                callbacks: {
                  label: (context) => {
                    const datasetLabel = context.dataset.label || '';
                    const value = context.parsed.y || 0;
                    if (datasetLabel.includes('позиций')) {
                      return `${datasetLabel}: ${value} позиций`;
                    } else if (datasetLabel.includes('Заявки')) {
                      return `${datasetLabel}: ${value} заявок`;
                    }
                    return `${datasetLabel}: ${value}`;
                  }
                }
              },
              datalabels: {
                display: true,
                color: '#6b7280',
                font: {
                  weight: 'bold' as const,
                  size: 12
                },
                formatter: function(value: any) {
                  return value > 0 ? value : '';
                },
                anchor: 'end' as const,
                align: 'top' as const,
                offset: 10,
                padding: 4
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  stepSize: 1,
                  callback: (value) => {
                    if (Number.isInteger(value)) {
                      return value.toString();
                    }
                    return '';
                  }
                },
                display: true
              }
            }
          }} 
        />
      </div>
    </div>
  );
}

