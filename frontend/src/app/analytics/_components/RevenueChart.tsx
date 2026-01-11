'use client';

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

interface RevenueChartProps {
  data?: any;
}

export default function RevenueChart({ data }: RevenueChartProps) {
  const defaultData = {
    labels: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн'],
    datasets: [
      {
        label: 'Доходы',
        data: [45, 52, 38, 67, 58, 72],
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
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
        position: 'top' as const,
        labels: {
          font: {
            size: 14
          }
        }
      },
      title: {
        display: true,
        text: 'Динамика доходов',
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
          size: 12
        },
        formatter: function(value: any) {
          return value + 'M';
        },
        anchor: 'end' as const,
        align: 'top' as const,
        offset: 20,
        padding: 12
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        afterDataLimits: (scale: any) => {
          scale.max += scale.max * 0.1;
        },
        ticks: {
          font: {
            size: 12
          },
          callback: function(value: any) {
            return value + 'M сум';
          }
        }
      },
      x: {
        ticks: {
          font: {
            size: 12
          }
        }
      }
    },
  };

  return (
    <div className="bg-white p-2 sm:p-4 lg:p-6 rounded-lg shadow-lg h-72 sm:h-80 lg:h-96">
      <Bar data={chartData} options={options} />
    </div>
  );
}
