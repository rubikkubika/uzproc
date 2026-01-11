'use client';

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
import { Line } from 'react-chartjs-2';
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

interface SupplierChartProps {
  data?: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor: string;
      tension: number;
    }[];
  };
}

export default function SupplierChart({ data }: SupplierChartProps) {
  const defaultData = {
    labels: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн'],
    datasets: [
      {
        label: 'Количество поставщиков',
        data: [12, 19, 3, 5, 2, 3],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        tension: 0.4,
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
        text: 'Динамика поставщиков',
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
          font: {
            size: 12
          },
          stepSize: 1,
        },
        display: false
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
      <Line data={chartData} options={options} />
    </div>
  );
}
