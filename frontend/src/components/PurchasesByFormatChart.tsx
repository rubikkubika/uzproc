'use client';

import { useEffect, useState } from 'react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

export default function PurchasesByFormatChart() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/purchases-data?all=true&minimal=true')
      .then(res => res.json())
      .then(data => {
        if (!data || data.length === 0) return;
        
        const formatCounts: Record<string, number> = {};
        
        data.forEach((item: any) => {
          const format = item['Формат ЗП'] || 'Не указан';
          formatCounts[format] = (formatCounts[format] || 0) + 1;
        });
        
        const chartData = {
          labels: Object.keys(formatCounts),
          datasets: [{
            data: Object.values(formatCounts),
            backgroundColor: [
              'rgba(59, 130, 246, 0.8)',  // голубой
              'rgba(96, 165, 250, 0.8)',  // светло-голубой
              'rgba(147, 197, 253, 0.8)',  // голубой
              'rgba(191, 219, 254, 0.8)',  // бледно-голубой
              'rgba(219, 234, 254, 0.8)',  // очень бледно-голубой
            ],
            borderColor: [
              'rgb(59, 130, 246)',
              'rgb(96, 165, 250)',
              'rgb(147, 197, 253)',
              'rgb(191, 219, 254)',
              'rgb(219, 234, 254)',
            ],
            borderWidth: 2,
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
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Форматы закупок</h3>
      <div className="h-64">
        <Pie 
          data={data} 
          options={{
            responsive: true,
            maintainAspectRatio: false,
            layout: {
              padding: 20
            },
            plugins: {
              legend: {
                position: 'bottom' as const,
              },
              datalabels: {
                display: true,
                color: '#6b7280',
                font: {
                  weight: 'bold' as const,
                  size: 14
                },
                formatter: function(value: any, context: any) {
                  const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                  const percentage = ((value / total) * 100).toFixed(0);
                  return percentage + '%';
                },
                padding: 8,
                offset: 20
              }
            },
          }} 
        />
      </div>
    </div>
  );
}

