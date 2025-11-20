'use client';

import { Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  ChartDataLabels
);

interface PerformanceChartProps {
  data?: any;
}

export default function PerformanceChart({ data }: PerformanceChartProps) {
  const defaultData = {
    labels: ['Качество', 'Скорость', 'Цена', 'Сервис', 'Надежность'],
    datasets: [
      {
        label: 'Оценка поставщиков',
        data: [85, 78, 92, 88, 90],
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(59, 130, 246, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(59, 130, 246, 1)',
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
        text: 'Оценка поставщиков',
        font: {
          size: 18,
          weight: 'bold' as const,
        },
      },
      datalabels: {
        display: true,
        color: '#3b82f6',
        font: {
          weight: 'bold' as const,
          size: 12
        },
        formatter: function(value: any) {
          return value;
        },
        anchor: 'end' as const,
        align: 'top' as const,
        offset: 4
      }
    },
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
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
      <Radar data={chartData} options={options} />
    </div>
  );
}
