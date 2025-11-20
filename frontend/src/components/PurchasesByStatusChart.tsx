'use client';

import { useEffect, useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

export default function PurchasesByStatusChart() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/purchases-data')
      .then(res => res.json())
      .then(data => {
        if (!data || data.length === 0) return;
        
        const statusCounts = {
          Согласован: 0,
          'Не согласован': 0,
          Удалена: 0,
          'В работе': 0
        };
        
        data.forEach((item: any) => {
          const status = item['Состояние заявки на ЗП'] || '';
          if (status.includes('Согласован')) statusCounts.Согласован++;
          else if (status.includes('Не согласован')) statusCounts['Не согласован']++;
          else if (status.includes('Удалена')) statusCounts.Удалена++;
          else if (status) statusCounts['В работе']++;
        });
        
        const chartData = {
          labels: Object.keys(statusCounts),
          datasets: [{
            data: Object.values(statusCounts),
            backgroundColor: [
              'rgba(59, 130, 246, 0.8)',  // голубой
              'rgba(96, 165, 250, 0.8)',  // светло-голубой
              'rgba(147, 197, 253, 0.8)',  // голубой
              'rgba(191, 219, 254, 0.8)',  // бледно-голубой
            ],
            borderColor: [
              'rgb(59, 130, 246)',
              'rgb(96, 165, 250)',
              'rgb(147, 197, 253)',
              'rgb(191, 219, 254)',
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
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Статусы закупок</h3>
      <div className="h-64">
        <Doughnut 
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

