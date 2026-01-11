'use client';

import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

interface BudgetChartProps {
  data?: any;
}

export default function BudgetChart({ data }: BudgetChartProps) {
  const defaultData = {
    labels: ['Оборудование', 'Услуги', 'Материалы', 'Прочее'],
    datasets: [
      {
        data: [35, 25, 20, 20],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(251, 191, 36, 0.8)',
          'rgba(139, 92, 246, 0.8)',
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(34, 197, 94, 1)',
          'rgba(251, 191, 36, 1)',
          'rgba(139, 92, 246, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const chartData = data || defaultData;

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: 20
    },
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          font: {
            size: 14
          }
        }
      },
      title: {
        display: true,
        text: 'Распределение бюджета',
        font: {
          size: 18,
          weight: 'bold' as const,
        },
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
          const percentage = ((value / total) * 100).toFixed(1);
          return percentage + '%';
        },
        padding: 8,
        offset: 20
      }
    },
  };

  return (
    <div className="bg-white p-2 sm:p-4 lg:p-6 rounded-lg shadow-lg h-72 sm:h-80 lg:h-96">
      <Pie data={chartData} options={options} />
    </div>
  );
}
