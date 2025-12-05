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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const backendUrl = getBackendUrl();
        const url = `${backendUrl}/api/purchase-plan-items?page=0&size=10000`;
        console.log('Fetching purchase plan items from:', url);
        
        // Загружаем все данные для диаграммы
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Ошибка загрузки данных: ${response.status} ${response.statusText}`);
        }
        const result = await response.json();
        const items = result.content || [];
        
        console.log('Loaded items:', items.length);
        
        if (items.length === 0) {
          setData(null);
          setLoading(false);
          return;
        }
        
        // Группируем по месяцам на основе requestDate
        const monthCounts: Record<string, number> = {};
        const monthLabels = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
        
        // Инициализируем все месяцы нулями
        monthLabels.forEach(month => {
          monthCounts[month] = 0;
        });
        
        items.forEach((item: any) => {
          if (item.requestDate) {
            const date = new Date(item.requestDate);
            const monthIndex = date.getMonth(); // 0-11
            const monthLabel = monthLabels[monthIndex];
            monthCounts[monthLabel] = (monthCounts[monthLabel] || 0) + 1;
          }
        });
        
        const chartData = {
          labels: monthLabels,
          datasets: [{
            label: 'Количество позиций',
            data: monthLabels.map(month => monthCounts[month] || 0),
            backgroundColor: 'rgba(34, 197, 94, 0.8)',
            borderColor: 'rgb(22, 163, 74)',
            borderWidth: 1,
          }],
        };
        
        console.log('Chart data:', chartData);
        setData(chartData);
      } catch (err) {
        console.error('Error fetching purchase plan items:', err);
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Позиции плана закупок по месяцам</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          Нет данных для отображения
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Позиции плана закупок по месяцам</h3>
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
                display: false,
              },
              tooltip: {
                callbacks: {
                  label: (context) => {
                    return `${context.parsed.y || 0} позиций`;
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

