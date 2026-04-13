'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import type { ContractRemarksCategoryItem } from '../hooks/useContractRemarksDashboard';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels);

const CATEGORY_COLORS: Record<string, string> = {
  'Внесены правки':               'rgba(59, 130, 246, 0.8)',
  'ИКПУ':                         'rgba(168, 85, 247, 0.8)',
  'ЭТТН / ЭСФ':                   'rgba(236, 72, 153, 0.8)',
  'Условия оплаты':               'rgba(245, 158, 11, 0.8)',
  'НДС и налоги':                 'rgba(234, 179, 8, 0.8)',
  'Реквизиты':                    'rgba(20, 184, 166, 0.8)',
  'Адрес и контакты':             'rgba(6, 182, 212, 0.8)',
  'Приложения':                   'rgba(99, 102, 241, 0.8)',
  'Спецификация и прайс-лист':    'rgba(139, 92, 246, 0.8)',
  'Формулировки':                 'rgba(239, 68, 68, 0.8)',
  'Противоречия и несоответствия':'rgba(220, 38, 38, 0.8)',
  'Гарантийный срок':             'rgba(34, 197, 94, 0.8)',
  'Задолженность контрагента':    'rgba(249, 115, 22, 0.8)',
  'Шаблон договора':              'rgba(16, 185, 129, 0.8)',
  'Прочие':                       'rgba(156, 163, 175, 0.8)',
};

const DEFAULT_COLOR = 'rgba(107, 114, 128, 0.8)';

interface ContractRemarksChartProps {
  categories: ContractRemarksCategoryItem[];
  selectedCategory: string | null;
  onCategoryClick: (category: string) => void;
}

export function ContractRemarksChart({ categories, selectedCategory, onCategoryClick }: ContractRemarksChartProps) {
  const sorted = [...categories].sort((a, b) => b.count - a.count);

  const data = {
    labels: sorted.map((c) => c.category),
    datasets: [
      {
        data: sorted.map((c) => c.count),
        backgroundColor: sorted.map((c) =>
          selectedCategory && selectedCategory !== c.category
            ? (CATEGORY_COLORS[c.category] ?? DEFAULT_COLOR).replace('0.8', '0.3')
            : (CATEGORY_COLORS[c.category] ?? DEFAULT_COLOR)
        ),
        borderColor: sorted.map((c) =>
          selectedCategory === c.category ? 'rgba(30, 64, 175, 1)' : 'transparent'
        ),
        borderWidth: sorted.map((c) => (selectedCategory === c.category ? 2 : 0)),
        borderRadius: 4,
      },
    ],
  };

  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    onClick: (_: unknown, elements: Array<{ index: number }>) => {
      if (elements.length > 0) {
        const idx = elements[0].index;
        const clicked = sorted[idx].category;
        onCategoryClick(clicked === selectedCategory ? '' : clicked);
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (ctx: any) => ` ${ctx.parsed.x} замечаний`,
        },
      },
      datalabels: {
        anchor: 'end' as const,
        align: 'end' as const,
        color: '#374151',
        font: { size: 11, weight: 'bold' as const },
        formatter: (value: number) => value,
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(0,0,0,0.06)' },
        ticks: { font: { size: 11 }, color: '#6b7280' },
      },
      y: {
        grid: { display: false },
        ticks: { font: { size: 11 }, color: '#374151' },
      },
    },
    onHover: (_: unknown, elements: unknown[]) => {
      const canvas = document.querySelector('canvas');
      if (canvas) canvas.style.cursor = elements.length > 0 ? 'pointer' : 'default';
    },
  };

  return (
    <div style={{ height: Math.max(220, sorted.length * 38 + 40) }}>
      <Bar data={data} options={options} />
    </div>
  );
}
