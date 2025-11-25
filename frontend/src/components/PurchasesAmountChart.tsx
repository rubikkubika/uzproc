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

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

export default function PurchasesAmountChart() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/purchases-data?all=true&minimal=true')
      .then(res => res.json())
      .then(data => {
        if (!data || data.length === 0) return;
        
        // Группировка по ЦФО
        const cfoGroups: Record<string, number> = {};
        
        data.forEach((item: any) => {
          const cfo = item['ЦФО'] || 'Не указан';
          // Удаляем все пробелы и запятые (разделители тысяч)
          const amount = parseFloat((item['Cумма предпологаемого контракта ФАКТ'] || '0').replace(/\s/g, '').replace(/,/g, ''));
          
          if (!isNaN(amount)) {
            cfoGroups[cfo] = (cfoGroups[cfo] || 0) + amount;
          }
        });
        
        // Сортируем и берем топ 5
        const sorted = Object.entries(cfoGroups).sort((a, b) => b[1] - a[1]).slice(0, 5);
        
        const chartData = {
          labels: sorted.map(([cfo]) => cfo),
          datasets: [{
            label: 'Сумма закупок',
            data: sorted.map(([, amount]) => amount / 1000000), // В миллионах
            backgroundColor: 'rgba(59, 130, 246, 0.8)',
            borderColor: 'rgb(37, 99, 235)',
            borderWidth: 1,
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
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Объем закупок по ЦФО (топ 5)</h3>
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
                    return `${context.parsed.y?.toFixed(1) || '0'} млн сум`;
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
                  return value.toFixed(1) + ' млн сум';
                },
                anchor: 'end' as const,
                align: 'top' as const,
                offset: 20,
                padding: 8
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                afterDataLimits: (scale: any) => {
                  scale.max += scale.max * 0.1;
                },
                ticks: {
                  callback: (value) => `${value} млн сум`
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

