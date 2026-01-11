'use client';

import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

export default function PurchasesTimelineChart() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    // ВРЕМЕННО ОТКЛЮЧЕНО
    return;
    fetch('/api/purchases-data?all=true&minimal=true')
      .then(res => res.json())
      .then(data => {
        if (!data || data.length === 0) return;
        
        // Группировка по месяцам
        const monthlyData: Record<string, number> = {};
        
        data.forEach((item: any) => {
          const dateStr = item['Дата создания ЗП'];
          if (dateStr) {
            try {
              // Новый формат: DD.MM.YYYY HH:MM или DD.MM.YYYY
              let day, month, year;
              if (dateStr.includes('.')) {
                const [datePart] = dateStr.split(' ');
                [day, month, year] = datePart.split('.');
              } else {
                // Старый формат: DD/MM/YYYY
                [day, month, year] = dateStr.split('/');
              }
              const monthKey = `${month}/${year}`;
              monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
            } catch (e) {
              // Игнорируем ошибки парсинга
            }
          }
        });
        
        // Сортируем по дате
        const sorted = Object.entries(monthlyData)
          .sort((a, b) => {
            const [monthA, yearA] = a[0].split('/');
            const [monthB, yearB] = b[0].split('/');
            return yearA.localeCompare(yearB) || monthA.localeCompare(monthB);
          })
          .slice(-6); // Последние 6 месяцев
        
        const chartData = {
          labels: sorted.map(([month]) => month),
          datasets: [{
            label: 'Количество закупок',
            data: sorted.map(([, count]) => count),
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            pointBackgroundColor: 'rgb(59, 130, 246)',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            tension: 0.4,
            fill: true,
          }],
        };
        
        setData(chartData);
      })
      .catch(err => console.error('Error:', err));
  }, []);

  if (!data) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Динамика закупок</h3>
      <div className="h-64">
        <Line 
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
              datalabels: {
                display: true,
                color: 'rgb(59, 130, 246)',
                font: {
                  weight: 'bold' as const,
                  size: 12
                },
                formatter: function(value: any) {
                  return value;
                },
                anchor: 'center' as const,
                align: 'top' as const,
                offset: 0,
                padding: 12
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                afterDataLimits: (scale: any) => {
                  scale.max += scale.max * 0.3;
                },
                ticks: {
                  stepSize: 1,
                },
                display: false
              }
            }
          }} 
        />
      </div>
    </div>
  );
}

