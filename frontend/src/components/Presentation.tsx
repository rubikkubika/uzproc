'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { Bar, Doughnut, Chart } from 'react-chartjs-2';
import { getBackendUrl } from '@/utils/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

type PurchasesByCfo = Record<string, number>;

interface PurchaseForPresentation {
  cfo: string | null;
  budgetAmount: number | null;
  name?: string | null;
  title?: string | null;
  purchaseSubject?: string | null;
  costType?: string | null;
  contractType?: string | null;
}

// Данные для первого слайда - Экономия
const savingsData = {
  labels: ['План', 'Факт', 'Экономия'],
  datasets: [
    {
      label: 'Сумма (млн ₽)',
      data: [100, 85, 15], // План: 100, Факт: 85, Экономия: 15
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',   // План - синий
        'rgba(34, 197, 94, 0.8)',     // Факт - зеленый
        'rgba(249, 115, 22, 0.8)',    // Экономия - оранжевый
      ],
      borderColor: [
        'rgba(59, 130, 246, 1)',
        'rgba(34, 197, 94, 1)',
        'rgba(249, 115, 22, 1)',
      ],
      borderWidth: 2,
    },
  ],
};

function buildSumByCfoChartData(valuesByCfo: PurchasesByCfo) {
  // Берем топ-4 ЦФО по сумме, остальные в "Прочие"
  const entries = Object.entries(valuesByCfo)
    .filter(([cfo]) => cfo && cfo.trim())
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));

  const top = entries.slice(0, 4);
  const restSum = entries.slice(4).reduce((acc, [, v]) => acc + (v ?? 0), 0);

  const labels = [
    ...top.map(([cfo]) => cfo),
    ...(restSum > 0 ? ['Прочие'] : []),
  ];

  const data = [
    ...top.map(([, v]) => v ?? 0),
    ...(restSum > 0 ? [restSum] : []),
  ];

  return {
    labels,
    datasets: [
      {
        label: 'Сумма',
        data,
        barThickness: 28,
        maxBarThickness: 34,
        backgroundColor: 'rgba(59, 130, 246, 0.85)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
      },
    ],
  };
}

const purchasesPlanFactOptions = {
  animation: false as const, // Отключаем анимацию для лучшей печати
  responsive: true,
  maintainAspectRatio: false,
  layout: {
    padding: { top: 2, bottom: 2, left: 2, right: 2 },
  },
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      enabled: false, // Отключаем tooltip при печати
    },
    datalabels: {
      display: true,
      color: '#ffffff',
      font: { weight: 'bold' as const, size: 16 },
      // Показываем сумму в млрд (например: 12 или 3.5)
      formatter: (value: number) => {
        const billions = value / 1_000_000_000;
        if (!isFinite(billions)) return '';
        const formatted =
          billions >= 10 ? Math.round(billions).toString() : billions.toFixed(1).replace(/\.0$/, '');
        return formatted;
      },
      anchor: 'center' as const,
      align: 'center' as const,
      offset: 0,
    },
  },
  scales: {
    y: {
      display: false,
      beginAtZero: true,
      ticks: { display: false },
      grid: { display: false },
      border: { display: false },
    },
    x: {
      display: true,
      ticks: { display: true, font: { size: 11, weight: 'bold' as const } },
      grid: { display: false },
      border: { display: false },
      // Дополнительно сужаем колонки через проценты
      categoryPercentage: 0.7,
      barPercentage: 0.7,
    },
  },
};

const savingsChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  layout: {
    padding: {
      top: 2,
      bottom: 2,
      left: 2,
      right: 2,
    },
  },
  plugins: {
    legend: {
      display: false,
    },
    datalabels: {
      display: true,
      color: '#1f2937',
      font: {
        weight: 'bold' as const,
        size: 12,
      },
      formatter: function(value: number) {
        return value + ' млн ₽';
      },
      anchor: 'end' as const,
      align: 'top' as const,
      offset: 3,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        display: false, // Убираем подписи вертикальной оси
      },
      grid: {
        color: 'rgba(0, 0, 0, 0.1)',
      },
    },
    x: {
      ticks: {
        font: {
          size: 14,
          weight: 'bold' as const,
        },
      },
      grid: {
        display: false,
      },
    },
  },
};

// Данные для диаграммы медианных цен
const medianPriceData = {
  labels: ['План', 'Факт', 'Экономия'],
  datasets: [
    {
      label: 'Медианная цена (тыс ₽)',
      data: [50, 42, 8], // План: 50, Факт: 42, Экономия: 8
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',   // План - синий
        'rgba(34, 197, 94, 0.8)',     // Факт - зеленый
        'rgba(249, 115, 22, 0.8)',    // Экономия - оранжевый
      ],
      borderColor: [
        'rgba(59, 130, 246, 1)',
        'rgba(34, 197, 94, 1)',
        'rgba(249, 115, 22, 1)',
      ],
      borderWidth: 2,
    },
  ],
};

const medianPriceChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  layout: {
    padding: {
      top: 2,
      bottom: 2,
      left: 2,
      right: 2,
    },
  },
  plugins: {
    legend: {
      display: false,
    },
    datalabels: {
      display: true,
      color: '#1f2937',
      font: {
        weight: 'bold' as const,
        size: 11,
      },
      formatter: function(value: number) {
        return value + ' тыс ₽';
      },
      anchor: 'end' as const,
      align: 'top' as const,
      offset: 3,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        display: false, // Убираем подписи вертикальной оси
      },
      grid: {
        color: 'rgba(0, 0, 0, 0.1)',
      },
    },
    x: {
      ticks: {
        font: {
          size: 12,
          weight: 'bold' as const,
        },
      },
      grid: {
        display: false,
      },
    },
  },
};

export default function Presentation() {
  const printRef = useRef<HTMLDivElement>(null);
  const printAllRef = useRef<HTMLDivElement>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = 10; // 10 слайдов
  
  // Состояние для редактируемых текстов второго слайда
  const [slide2PilotTitle, setSlide2PilotTitle] = useState('Пилот');
  const [slide2PilotText, setSlide2PilotText] = useState('В конце 3 квартале 2025 проведен пилот по осуществлению закупок через ЭТП');
  const [slide2GoalsTitle, setSlide2GoalsTitle] = useState('Цели Внедрения');
  const [slide2Goals, setSlide2Goals] = useState([
    'Повышение прозрачности закупочных процедур для внутренних команд и поставщиков',
    'Расширение конкурентной среды за счет публичного доступа поставщиков к закупкам',
    'Снижение операционной нагрузки за счет автоматизации обработки коммерческих предложений – стандарт закупок во всех крупных компаниях'
  ]);
  const [slide2ResultsTitle, setSlide2ResultsTitle] = useState('Результаты');
  const [slide2Results, setSlide2Results] = useState([
    '3,6 млрд. сум – объем фактически реализованной экономии с октября 2025',
    'X млрд сум – стоимость проведенных закупок через ЭТП, X – количество',
    'Дополнительные результаты будут добавлены'
  ]);
  const [purchasesByCfo, setPurchasesByCfo] = useState<PurchasesByCfo>({});
  const [purchases2025, setPurchases2025] = useState<PurchaseForPresentation[]>([]);
  
  // Данные для слайда "Нагрузка" (третий слайд)
  const [workloadData, setWorkloadData] = useState({
    purchases: { year2024: 0, year2025: 0 },
    purchaseRequests: { year2024: 0, year2025: 0 },
    contracts: { year2024: 0, year2025: 0 },
  });

  useEffect(() => {
    // Для слайда 1 подтягиваем данные закупок по дате создания за 2025 и группируем по ЦФО
    const load = async () => {
      try {
        const backendUrl = getBackendUrl();
        const url = `${backendUrl}/api/purchases?page=0&size=10000&year=2025`;
        const res = await fetch(url);
        if (!res.ok) return;
        const json = await res.json();
        const content: PurchaseForPresentation[] = json?.content || [];
        setPurchases2025(content);

        // Для диаграммы распределения по ЦФО считаем суммы budgetAmount
        // ВАЖНО: включаем закупки без ЦФО в отдельную корзину, чтобы сумма диаграммы = общей сумме
        const acc: PurchasesByCfo = {};
        content.forEach((p) => {
          const cfo = (p.cfo || '').trim() || 'Без ЦФО';
          const amount = typeof p.budgetAmount === 'number' ? p.budgetAmount : 0;
          acc[cfo] = (acc[cfo] || 0) + amount;
        });
        setPurchasesByCfo(acc);
      } catch {
        // ignore
      }
    };
    load();
  }, []);

  // Загрузка данных для слайда "Нагрузка" (третий слайд)
  useEffect(() => {
    const loadWorkloadData = async () => {
      try {
        const backendUrl = getBackendUrl();
        
        // Закупки за 2024 и 2025
        const purchases2024Res = await fetch(`${backendUrl}/api/purchases?page=0&size=1&year=2024`);
        const purchases2025Res = await fetch(`${backendUrl}/api/purchases?page=0&size=1&year=2025`);
        
        // Заявки на закупку за 2024 и 2025
        const requests2024Res = await fetch(`${backendUrl}/api/purchase-requests?page=0&size=1&year=2024`);
        const requests2025Res = await fetch(`${backendUrl}/api/purchase-requests?page=0&size=1&year=2025`);
        
        // Договоры за 2024 и 2025 (пока используем заглушку, т.к. API может отличаться)
        // TODO: заменить на реальный API когда будет доступен
        const contracts2024 = 0;
        const contracts2025 = 0;

        if (purchases2024Res.ok && purchases2025Res.ok) {
          const purchases2024Json = await purchases2024Res.json();
          const purchases2025Json = await purchases2025Res.json();
          const purchases2024 = purchases2024Json?.totalElements || 0;
          const purchases2025 = purchases2025Json?.totalElements || 0;

          if (requests2024Res.ok && requests2025Res.ok) {
            const requests2024Json = await requests2024Res.json();
            const requests2025Json = await requests2025Res.json();
            const requests2024 = requests2024Json?.totalElements || 0;
            const requests2025 = requests2025Json?.totalElements || 0;

            setWorkloadData({
              purchases: { year2024: purchases2024, year2025: purchases2025 },
              purchaseRequests: { year2024: requests2024, year2025: requests2025 },
              contracts: { year2024: contracts2024, year2025: contracts2025 },
            });
          }
        }
      } catch {
        // ignore
      }
    };
    loadWorkloadData();
  }, []);

  const purchasesPlanFactData = buildSumByCfoChartData(
    Object.keys(purchasesByCfo).length > 0
      ? purchasesByCfo
      : { 'ЦФО A': 10_000_000_000, 'ЦФО B': 7_000_000_000, 'ЦФО C': 3_000_000_000 } // fallback
  );

  const etpPurchases = purchases2025.filter((p) => {
    const hay = `${p.purchaseSubject || ''} ${p.name || ''} ${p.title || ''}`.toLowerCase();
    // ЭТП / электронная торговая площадка
    return hay.includes('электронн') || hay.includes('торгов') || hay.includes('этп');
  });
  const etpPurchasesCount = etpPurchases.length;
  const etpExamples = etpPurchases
    .map((p) => (p.purchaseSubject || p.title || p.name || '').trim())
    .filter(Boolean)
    .slice(0, 3);
  const etpPurchasesAmount = etpPurchases.reduce((acc, p) => {
    const amount = typeof p.budgetAmount === 'number' ? p.budgetAmount : 0;
    return acc + amount;
  }, 0);
  const etpPurchasesAmountLabel =
    etpPurchasesAmount > 0
      ? new Intl.NumberFormat('ru-RU', {
          notation: 'compact',
          maximumFractionDigits: 1,
        }).format(etpPurchasesAmount)
      : '—';
  const totalPurchasesAmount2025 = purchases2025.reduce((acc, p) => {
    const amount = typeof p.budgetAmount === 'number' ? p.budgetAmount : 0;
    return acc + amount;
  }, 0);
  const totalPurchasesAmount2025Label =
    totalPurchasesAmount2025 > 0
      ? new Intl.NumberFormat('ru-RU', {
          notation: 'compact',
          maximumFractionDigits: 1,
        }).format(totalPurchasesAmount2025)
      : '—';

  // Данные для pie chart по категориям закупок
  const purchasesByCategory = purchases2025.reduce((acc, p) => {
    const category = (p.costType || p.contractType || 'Без категории').trim() || 'Без категории';
    const amount = typeof p.budgetAmount === 'number' ? p.budgetAmount : 0;
    acc[category] = (acc[category] || 0) + amount;
    return acc;
  }, {} as Record<string, number>);

  // Добавляем тестовые категории, если реальных данных недостаточно
  const testCategories = {
    'Услуги': 5_000_000_000,
    'Оборудование': 4_500_000_000,
    'Материалы': 3_200_000_000,
    'Программное обеспечение': 2_800_000_000,
    'Консалтинг': 1_500_000_000,
  };

  // Объединяем реальные данные с тестовыми
  const allCategories = { ...purchasesByCategory };
  Object.entries(testCategories).forEach(([category, amount]) => {
    allCategories[category] = (allCategories[category] || 0) + amount;
  });

  const categoryEntries = Object.entries(allCategories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5); // Топ-5 категорий
  const restSum = Object.entries(allCategories)
    .slice(5)
    .reduce((sum, [, amount]) => sum + amount, 0);

  const purchasesCategoryPieData = {
    labels: [
      ...categoryEntries.map(([label]) => label),
      ...(restSum > 0 ? ['Прочие'] : []),
    ],
    datasets: [
      {
        data: [
          ...categoryEntries.map(([, amount]) => amount),
          ...(restSum > 0 ? [restSum] : []),
        ],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',   // Синий
          'rgba(168, 85, 247, 0.8)',   // Фиолетовый
          'rgba(249, 115, 22, 0.8)',   // Оранжевый
          'rgba(34, 197, 94, 0.8)',    // Зеленый
          'rgba(239, 68, 68, 0.8)',    // Красный
          'rgba(156, 163, 175, 0.8)',  // Серый для "Прочие"
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(168, 85, 247, 1)',
          'rgba(249, 115, 22, 1)',
          'rgba(34, 197, 94, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(156, 163, 175, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const purchasesCategoryPieOptions = {
    animation: false as const, // Отключаем анимацию для лучшей печати
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'right' as const,
        labels: {
          font: { size: 11 },
          padding: 12,
          usePointStyle: true,
        },
      },
      datalabels: {
        display: true,
        color: '#ffffff',
        font: { weight: 'bold' as const, size: 12 },
        formatter: (value: number, context: any) => {
          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
          const percentage = ((value / total) * 100).toFixed(1);
          return percentage + '%';
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value.toLocaleString('ru-RU')} (${percentage}%)`;
          },
        },
      },
    },
  };

  // Данные для диаграмм слайда "Нагрузка"
  const buildWorkloadChartData = (
    year2024: number, 
    year2025: number, 
    label: string,
    employeesCount: number,
    color2025: string = 'rgba(59, 130, 246, 0.8)',
    borderColor2025: string = 'rgba(59, 130, 246, 1)'
  ) => ({
    labels: ['2024', '2025'],
    datasets: [
      {
        type: 'bar' as const,
        label,
        data: [year2024, year2025],
        backgroundColor: [
          'rgba(156, 163, 175, 0.6)', // Серый для 2024
          color2025,  // Цвет для 2025
        ],
        borderColor: [
          'rgba(156, 163, 175, 1)',
          borderColor2025,
        ],
        borderWidth: 2,
        barThickness: 40,
        maxBarThickness: 50,
      },
      {
        type: 'line' as const,
        label: 'Нагрузка на чел.',
        data: [year2024 / employeesCount, year2025 / employeesCount],
        borderColor: 'rgba(239, 68, 68, 0.8)', // Красный для линии
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 4,
        pointBackgroundColor: 'rgba(239, 68, 68, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        fill: false,
        tension: 0,
        yAxisID: 'y',
      },
    ],
  });

  // Данные для столбчатой диаграммы SLA
  const slaBarChartData = {
    labels: ['2024', '2025', 'янв 25', 'фев 25', 'мар 25', 'апр 25', 'май 25', 'июн 25', 'июл 25', 'авг 25', 'сен 25', 'окт 25', 'ноя 25', 'дек 25', '2026'],
    datasets: [
      {
        label: 'Количество закупок',
        data: [120, 150, 8, 10, 12, 11, 9, 13, 14, 12, 10, 11, 9, 13, 180],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',   // 2024 - синий
          'rgba(34, 197, 94, 0.8)',     // 2025 - зеленый
          'rgba(156, 163, 175, 0.6)',  // янв 25 - серый
          'rgba(156, 163, 175, 0.6)',  // фев 25
          'rgba(156, 163, 175, 0.6)',  // мар 25
          'rgba(156, 163, 175, 0.6)',  // апр 25
          'rgba(156, 163, 175, 0.6)',  // май 25
          'rgba(156, 163, 175, 0.6)',  // июн 25
          'rgba(156, 163, 175, 0.6)',  // июл 25
          'rgba(156, 163, 175, 0.6)',  // авг 25
          'rgba(156, 163, 175, 0.6)',  // сен 25
          'rgba(156, 163, 175, 0.6)',  // окт 25
          'rgba(156, 163, 175, 0.6)',  // ноя 25
          'rgba(156, 163, 175, 0.6)',  // дек 25
          'rgba(249, 115, 22, 0.6)',   // 2026 - оранжевый с прозрачностью (план)
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(34, 197, 94, 1)',
          'rgba(156, 163, 175, 0.8)',
          'rgba(156, 163, 175, 0.8)',
          'rgba(156, 163, 175, 0.8)',
          'rgba(156, 163, 175, 0.8)',
          'rgba(156, 163, 175, 0.8)',
          'rgba(156, 163, 175, 0.8)',
          'rgba(156, 163, 175, 0.8)',
          'rgba(156, 163, 175, 0.8)',
          'rgba(156, 163, 175, 0.8)',
          'rgba(156, 163, 175, 0.8)',
          'rgba(156, 163, 175, 0.8)',
          'rgba(156, 163, 175, 0.8)',
          'rgba(249, 115, 22, 1)',   // 2026 - оранжевый
        ],
        borderWidth: (context: any) => {
          const label = context.chart.data.labels[context.dataIndex];
          // 2026 - без границы (будет нарисована кастомным плагином)
          if (label === '2026') {
            return 0;
          }
          return 1;
        },
        barThickness: (context: any) => {
          const label = context.chart.data.labels[context.dataIndex];
          // Основные столбцы (2024, 2025, 2026) - шире
          if (label === '2024' || label === '2025' || label === '2026') {
            return 50; // Увеличили ширину основных столбцов
          }
          // Месячные столбцы - шире
          return 25; // Увеличили ширину месячных столбцов
        },
      },
    ],
  };

  // Данные для линейной диаграммы SLA (выполнение в процентах)
  const slaLineChartData = {
    labels: ['2024', '2025', 'янв 25', 'фев 25', 'мар 25', 'апр 25', 'май 25', 'июн 25', 'июл 25', 'авг 25', 'сен 25', 'окт 25', 'ноя 25', 'дек 25', '2026'],
    datasets: [
      {
        label: 'Выполнение (%)',
        data: [10, 45, 85, 88, 92, 90, 87, 93, 95, 91, 89, 92, 88, 94, 88],
        borderColor: 'rgba(168, 85, 247, 1)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointBackgroundColor: 'rgba(168, 85, 247, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      },
    ],
  };

  // Опции для столбчатой диаграммы SLA
  const slaBarChartOptions = {
    animation: false as const,
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { top: 10, bottom: 10, left: 10, right: 10 },
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          font: { size: 12 },
          padding: 15,
          usePointStyle: true,
        },
      },
      tooltip: {
        enabled: false,
      },
      datalabels: {
        display: true,
        color: '#1f2937',
        font: {
          size: 10,
          weight: 'bold' as const,
        },
        anchor: 'end' as const,
        align: 'top' as const,
        offset: 5,
        formatter: (value: number) => {
          return value;
        },
      },
      // Кастомный плагин для пунктирной границы столбца 2026
      afterDraw: (chart: any) => {
        const ctx = chart.ctx;
        const meta = chart.getDatasetMeta(0);
        const data = chart.data;
        
        meta.data.forEach((bar: any, index: number) => {
          const label = data.labels[index];
          if (label === '2026') {
            const { x, y, base, width, height } = bar;
            ctx.save();
            ctx.strokeStyle = 'rgba(249, 115, 22, 1)';
            ctx.lineWidth = 4;
            ctx.setLineDash([10, 5]);
            ctx.strokeRect(x - width / 2, y, width, height);
            ctx.restore();
          }
        });
      },
    },
    scales: {
      x: {
        grid: {
          display: true, // Включаем вертикальную сетку
          color: 'rgba(0, 0, 0, 0.1)',
          drawBorder: false,
        },
        ticks: {
          font: { size: 11 },
          maxRotation: 45,
          minRotation: 45,
        },
      },
      y: {
        type: 'logarithmic' as const, // Используем логарифмический масштаб для лучшей видимости меньших столбцов
        display: false, // Убираем вертикальную ось слева
        position: 'left' as const,
        grid: {
          display: false,
        },
        min: 1, // Минимум для логарифмической шкалы должен быть > 0
      },
    },
  };

  // Данные для диаграммы ЗУЕИ
  const zueiChartData = {
    labels: ['Объем ЗУЕИ в 2025', 'Нереализованная экономия', 'Стратегическая цель'],
    datasets: [
      {
        label: 'Значение',
        data: [150, 45, 200], // Примерные значения
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',   // Объем - синий
          'rgba(249, 115, 22, 0.8)',   // Нереализованная экономия - оранжевый
          'rgba(34, 197, 94, 0.8)',     // Стратегическая цель - зеленый
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(249, 115, 22, 1)',
          'rgba(34, 197, 94, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const zueiChartOptions = {
    animation: false as const,
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { top: 10, bottom: 10, left: 10, right: 10 },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
      },
      datalabels: {
        display: true,
        color: '#1f2937',
        font: {
          size: 12,
          weight: 'bold' as const,
        },
        anchor: 'end' as const,
        align: 'top' as const,
        offset: 5,
        formatter: (value: number) => {
          return value;
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: { size: 11 },
          maxRotation: 45,
          minRotation: 0,
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: { size: 10 },
        },
      },
    },
  };

  // Опции для линейной диаграммы SLA
  const slaLineChartOptions = {
    animation: false as const,
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { top: 10, bottom: 10, left: 10, right: 10 },
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          font: { size: 12 },
          padding: 15,
          usePointStyle: true,
        },
      },
      tooltip: {
        enabled: false,
      },
      datalabels: {
        display: true,
        color: '#1f2937',
        font: {
          size: 10,
          weight: 'bold' as const,
        },
        anchor: 'center' as const,
        align: 'bottom' as const,
        offset: -15,
        formatter: (value: number) => {
          return `${value}%`;
        },
      },
    },
    scales: {
      x: {
        display: false, // Убираем названия горизонтальной оси
        grid: {
          display: true, // Включаем вертикальную сетку
          color: 'rgba(0, 0, 0, 0.1)',
          drawBorder: false,
        },
        ticks: {
          display: false, // Убираем подписи на оси X
        },
      },
      y: {
        type: 'linear' as const,
        display: false, // Убираем вертикальную ось
        position: 'left' as const,
        grid: {
          display: false,
        },
        min: 0,
        max: 100,
      },
    },
  };

  const workloadChartOptions = {
    animation: false as const, // Отключаем анимацию для лучшей печати
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          filter: (item: any) => item.datasetIndex === 1, // Показываем только легенду для линии
          font: { size: 11 },
          usePointStyle: true,
          padding: 8,
        },
      },
      datalabels: {
        display: true,
        color: (context: any) => {
          // Для столбцов - темный цвет, для линии - красный
          return context.datasetIndex === 0 ? '#1f2937' : 'rgba(239, 68, 68, 1)';
        },
        font: { weight: 'bold' as const, size: 12 },
        formatter: (value: number, context: any) => {
          if (context.datasetIndex === 0) {
            return value.toLocaleString('ru-RU');
          } else {
            return Math.round(value).toLocaleString('ru-RU');
          }
        },
        anchor: (context: any) => context.datasetIndex === 0 ? 'end' as const : 'center' as const,
        align: (context: any) => context.datasetIndex === 0 ? 'top' as const : 'bottom' as const,
        offset: (context: any) => context.datasetIndex === 0 ? 5 : -5,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.parsed.y;
            if (context.datasetIndex === 0) {
              const growth = context.dataIndex === 1 && context.dataset.data[0] > 0
                ? ` (+${Math.round(((value - context.dataset.data[0]) / context.dataset.data[0]) * 100)}%)`
                : '';
              return `${context.dataset.label}: ${value.toLocaleString('ru-RU')}${growth}`;
            } else {
              return `Нагрузка на чел.: ${Math.round(value).toLocaleString('ru-RU')}`;
            }
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          font: { size: 11 },
          callback: (value: any) => value.toLocaleString('ru-RU'),
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      x: {
        ticks: {
          font: { size: 12, weight: 'bold' as const },
        },
        grid: {
          display: false,
        },
      },
    },
  };

  const purchasesWorkloadData = buildWorkloadChartData(
    workloadData.purchases.year2024,
    workloadData.purchases.year2025,
    'Закупки',
    2, // Количество сотрудников
    'rgba(59, 130, 246, 0.85)', // Синий
    'rgba(59, 130, 246, 1)'
  );
  
  // Объединенные данные для заказов и договоров (одно направление)
  const requestsAndContracts2024 = workloadData.purchaseRequests.year2024 + workloadData.contracts.year2024;
  const requestsAndContracts2025 = workloadData.purchaseRequests.year2025 + workloadData.contracts.year2025;
  const requestsAndContractsWorkloadData = buildWorkloadChartData(
    requestsAndContracts2024,
    requestsAndContracts2025,
    'Заказы и Договоры',
    4, // Количество сотрудников
    'rgba(168, 85, 247, 0.85)', // Фиолетовый
    'rgba(168, 85, 247, 1)'
  );

  const calculateGrowth = (year2024: number, year2025: number) => {
    if (year2024 === 0) return year2025 > 0 ? 100 : 0;
    return Math.round(((year2025 - year2024) / year2024) * 100);
  };

  const goToNextSlide = () => {
    setCurrentSlide((prev) => (prev < totalSlides - 1 ? prev + 1 : prev));
  };

  const goToPreviousSlide = () => {
    setCurrentSlide((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const goToSlide = (index: number) => {
    if (index >= 0 && index < totalSlides) {
      setCurrentSlide(index);
    }
  };


  // Настройка ReactToPrint для экспорта текущего слайда в PDF
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Презентация_Слайд_${currentSlide + 1}_${new Date().toISOString().split('T')[0]}`,
    pageStyle: `
      @page {
        size: A4 landscape;
        margin: 0mm;
      }
      @media print {
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
          background: white !important;
        }
        .no-print {
          display: none !important;
        }
        /* Сохраняем все цвета при печати */
        .bg-orange-600, [class*="bg-orange-"], 
        .bg-blue-50, [class*="bg-blue-"],
        .bg-orange-50, [class*="bg-orange-50"],
        .bg-gray-50, [class*="bg-gray-50"],
        .bg-gray-100, [class*="bg-gray-100"],
        .bg-purple-50, [class*="bg-purple-"],
        .bg-green-50, [class*="bg-green-"] {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        /* Убеждаемся, что фоны блоков сохраняются */
        .bg-orange-50,
        [class*="bg-orange-50"],
        div[class*="bg-orange-50"],
        .bg-orange-50.border-2,
        [class*="bg-orange-50"][class*="border-2"] {
          background-color: rgb(255, 247, 237) !important;
          background: rgb(255, 247, 237) !important;
          background-image: none !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        .bg-gray-50,
        [class*="bg-gray-50"],
        div[class*="bg-gray-50"],
        .bg-gray-50.border-2,
        [class*="bg-gray-50"][class*="border-2"] {
          background-color: rgb(249, 250, 251) !important;
          background: rgb(249, 250, 251) !important;
          background-image: none !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        /* Убеждаемся, что фоны блоков с relative позиционированием сохраняются */
        .relative.bg-orange-50,
        [class*="relative"][class*="bg-orange-50"],
        div.relative[class*="bg-orange-50"],
        div[class*="relative"][class*="bg-orange-50"],
        .flex.bg-orange-50,
        [class*="flex"][class*="bg-orange-50"],
        div[class*="flex"][class*="bg-orange-50"] {
          background-color: rgb(255, 247, 237) !important;
          background: rgb(255, 247, 237) !important;
          background-image: none !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        /* Убеждаемся, что все div с bg-orange-50 сохраняют фон */
        div.bg-orange-50,
        div[class*="bg-orange-50"] {
          background-color: rgb(255, 247, 237) !important;
          background: rgb(255, 247, 237) !important;
          background-image: none !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        /* Убираем серые контуры/рамки у всех элементов, кроме нужных границ */
        .absolute.bg-orange-600,
        span.absolute.bg-orange-600 {
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
        }
        /* Убираем серые контуры у всех элементов с абсолютным позиционированием */
        .absolute,
        [class*="absolute"] {
          outline: none !important;
          box-shadow: none !important;
        }
        /* Убираем серые контуры у бейджиков и декоративных элементов */
        span[class*="bg-orange-600"],
        span[class*="rounded-full"],
        .rounded-full[class*="bg-"],
        [class*="rounded-full"] {
          outline: none !important;
          border: none !important;
          box-shadow: none !important;
        }
        /* Убираем серые контуры у всех элементов с фоновыми цветами, кроме блоков с border-2 */
        [class*="bg-"]:not([class*="border-2"]):not([class*="border-"]) {
          outline: none !important;
          box-shadow: none !important;
        }
        /* Убираем серые контуры у всех элементов с rounded */
        [class*="rounded"] {
          outline: none !important;
        }
        /* Убираем серые контуры у элементов, которые не должны их иметь */
        *,
        *::before,
        *::after {
          outline: none !important;
          box-shadow: none !important;
        }
        /* Убираем серые контуры у всех типов элементов */
        div, span, p, h1, h2, h3, h4, h5, h6, img, canvas, svg, button, input, textarea, select, a, ul, ol, li, table, tr, td, th, thead, tbody {
          outline: none !important;
          box-shadow: none !important;
        }
        /* Сохраняем нужные границы блоков */
        .border-2,
        [class*="border-2"],
        .border,
        [class*="border"]:not([class*="border-r"]):not([class*="border-l"]):not([class*="border-t"]):not([class*="border-b"]) {
          /* Границы сохраняются, но убираем outline и box-shadow */
          outline: none !important;
          box-shadow: none !important;
        }
        /* Убираем серые контуры у всех span элементов */
        span,
        span * {
          outline: none !important;
          box-shadow: none !important;
        }
        /* Убираем серые контуры у div элементов, кроме тех, где границы нужны */
        div:not([class*="border-2"]):not([class*="border-"]) {
          outline: none !important;
          box-shadow: none !important;
        }
        /* Убираем серые контуры у всех изображений */
        img {
          outline: none !important;
          border: none !important;
          box-shadow: none !important;
        }
        /* Убираем серые контуры у всех canvas элементов */
        canvas {
          outline: none !important;
          border: none !important;
          box-shadow: none !important;
        }
        /* Убираем серые контуры у всех текстовых элементов */
        p, h1, h2, h3, h4, h5, h6, div, span {
          outline: none !important;
        }
        /* Убираем серый фон и контуры только у бейджиков (элементы с абсолютным позиционированием и bg-orange-600) */
        .absolute.bg-orange-600,
        span.absolute.bg-orange-600,
        .absolute[class*="bg-orange-600"],
        span[class*="absolute"][class*="bg-orange-600"],
        span[class*="bg-orange-600"][class*="absolute"] {
          background-color: rgb(234, 88, 12) !important;
          background: rgb(234, 88, 12) !important;
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        /* Убираем серые фоны у родительских элементов бейджиков, если они появились при печати */
        .relative > .absolute.bg-orange-600,
        .relative > span.absolute.bg-orange-600,
        .relative > span[class*="absolute"][class*="bg-orange-600"] {
          background-color: rgb(234, 88, 12) !important;
          background: rgb(234, 88, 12) !important;
        }
        /* Убираем все возможные серые фоны у бейджиков */
        span[class*="bg-orange-600"] {
          background-color: rgb(234, 88, 12) !important;
          background: rgb(234, 88, 12) !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        /* Убираем серые фоны из inline стилей у бейджиков */
        span[style*="background"][class*="bg-orange-600"],
        span[class*="bg-orange-600"][style*="background"] {
          background-color: rgb(234, 88, 12) !important;
          background: rgb(234, 88, 12) !important;
        }
        /* Убираем серый фон у родительских элементов бейджиков, НО сохраняем фон у блоков с bg-orange-50 */
        .relative:has(> .absolute.bg-orange-600):not([class*="bg-orange-50"]):not(.bg-orange-50),
        .relative:has(> span.absolute.bg-orange-600):not([class*="bg-orange-50"]):not(.bg-orange-50) {
          background-color: transparent !important;
          background: transparent !important;
        }
        /* Альтернативный способ - убираем серый фон у всех relative элементов, которые содержат бейджик */
        div.relative > span.absolute.bg-orange-600,
        div[class*="relative"] > span[class*="absolute"][class*="bg-orange-600"] {
          background-color: rgb(234, 88, 12) !important;
          background: rgb(234, 88, 12) !important;
        }
        /* Убираем серый фон у всех элементов с абсолютным позиционированием, которые содержат текст "23%" */
        span.absolute:contains("23%"),
        span[class*="absolute"]:contains("23%") {
          background-color: rgb(234, 88, 12) !important;
          background: rgb(234, 88, 12) !important;
        }
        /* Убираем серые фоны из всех возможных источников у бейджиков, НО не у родительских блоков с bg-orange-50 */
        *[class*="bg-orange-600"][class*="absolute"] *:not([class*="bg-orange-50"]):not(.bg-orange-50),
        *[class*="absolute"][class*="bg-orange-600"] *:not([class*="bg-orange-50"]):not(.bg-orange-50) {
          background-color: transparent !important;
          background: transparent !important;
        }
      }
    `,
  });

  // Функция для экспорта текущего слайда в PDF
  const exportToPDF = () => {
    handlePrint();
  };

  // Настройка ReactToPrint для экспорта всей презентации в PDF
  const handlePrintAll = useReactToPrint({
    contentRef: printAllRef,
    documentTitle: `Презентация_Все_слайды_${new Date().toISOString().split('T')[0]}`,
    onBeforePrint: () => {
      // Убеждаемся, что скрытый контейнер виден для подготовки к печати
      return new Promise<void>((resolve) => {
        if (printAllRef.current) {
          printAllRef.current.style.visibility = 'visible';
          printAllRef.current.style.position = 'static';
          printAllRef.current.style.left = 'auto';
          printAllRef.current.style.top = 'auto';
          // Даем время Chart.js отрендериться
          setTimeout(() => {
            resolve();
          }, 1000);
        } else {
          resolve();
        }
      });
    },
    pageStyle: `
      @page {
        size: A4 landscape;
        margin: 0mm;
      }
      @media print {
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
          background: white !important;
        }
        .no-print {
          display: none !important;
        }
        .print-only {
          visibility: visible !important;
          position: static !important;
          left: auto !important;
          top: auto !important;
          display: block !important;
        }
        .slide-page {
          page-break-after: always;
          page-break-inside: avoid;
          width: 297mm;
          height: 210mm;
          visibility: visible !important;
          display: block !important;
        }
        .slide-page:last-child {
          page-break-after: auto;
        }
        /* Убеждаемся, что все элементы видны при печати */
        .print-only * {
          visibility: visible !important;
        }
        .print-only canvas {
          display: block !important;
          visibility: visible !important;
        }
        .print-only img {
          visibility: visible !important;
        }
        /* Убираем серые контуры у всех элементов внутри print-only */
        .print-only *,
        .print-only *::before,
        .print-only *::after {
          outline: none !important;
          box-shadow: none !important;
        }
        .print-only div, .print-only span, .print-only p, .print-only h1, .print-only h2, .print-only h3, 
        .print-only h4, .print-only h5, .print-only h6, .print-only img, .print-only canvas, 
        .print-only svg, .print-only button, .print-only input, .print-only textarea, 
        .print-only select, .print-only a, .print-only ul, .print-only ol, .print-only li, 
        .print-only table, .print-only tr, .print-only td, .print-only th, 
        .print-only thead, .print-only tbody {
          outline: none !important;
          box-shadow: none !important;
        }
        .print-only img {
          outline: none !important;
          border: none !important;
          box-shadow: none !important;
        }
        .print-only canvas {
          outline: none !important;
          border: none !important;
          box-shadow: none !important;
        }
        /* Убираем серые контуры у всех элементов с фоновыми цветами внутри print-only */
        .print-only [class*="bg-"]:not([class*="border-2"]):not([class*="border-"]) {
          outline: none !important;
          box-shadow: none !important;
        }
        .print-only [class*="rounded"] {
          outline: none !important;
        }
        .print-only .absolute,
        .print-only [class*="absolute"] {
          outline: none !important;
          box-shadow: none !important;
        }
        /* КРИТИЧЕСКИ ВАЖНО: Сохраняем фоны блоков перед другими правилами */
        .print-only .bg-orange-50,
        .print-only [class*="bg-orange-50"],
        .print-only div[class*="bg-orange-50"] {
          background-color: rgb(255, 247, 237) !important;
          background: rgb(255, 247, 237) !important;
          background-image: none !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        .print-only .bg-gray-50,
        .print-only [class*="bg-gray-50"],
        .print-only div[class*="bg-gray-50"] {
          background-color: rgb(249, 250, 251) !important;
          background: rgb(249, 250, 251) !important;
          background-image: none !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        /* Сохраняем все цвета при печати */
        .bg-orange-600, [class*="bg-orange-"], 
        .bg-blue-50, [class*="bg-blue-"],
        .bg-orange-50, [class*="bg-orange-50"],
        .bg-gray-50, [class*="bg-gray-50"],
        .bg-gray-100, [class*="bg-gray-100"],
        .bg-purple-50, [class*="bg-purple-"],
        .bg-green-50, [class*="bg-green-"] {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        /* Убеждаемся, что фоны блоков сохраняются */
        .bg-orange-50,
        [class*="bg-orange-50"],
        div[class*="bg-orange-50"],
        .bg-orange-50.border-2,
        [class*="bg-orange-50"][class*="border-2"] {
          background-color: rgb(255, 247, 237) !important;
          background: rgb(255, 247, 237) !important;
          background-image: none !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        .bg-gray-50,
        [class*="bg-gray-50"],
        div[class*="bg-gray-50"],
        .bg-gray-50.border-2,
        [class*="bg-gray-50"][class*="border-2"] {
          background-color: rgb(249, 250, 251) !important;
          background: rgb(249, 250, 251) !important;
          background-image: none !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        /* Убеждаемся, что фоны блоков с relative позиционированием сохраняются */
        .relative.bg-orange-50,
        [class*="relative"][class*="bg-orange-50"],
        div.relative[class*="bg-orange-50"],
        div[class*="relative"][class*="bg-orange-50"],
        .flex.bg-orange-50,
        [class*="flex"][class*="bg-orange-50"],
        div[class*="flex"][class*="bg-orange-50"] {
          background-color: rgb(255, 247, 237) !important;
          background: rgb(255, 247, 237) !important;
          background-image: none !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        /* Убеждаемся, что все div с bg-orange-50 сохраняют фон */
        div.bg-orange-50,
        div[class*="bg-orange-50"] {
          background-color: rgb(255, 247, 237) !important;
          background: rgb(255, 247, 237) !important;
          background-image: none !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        /* Убираем серые контуры/рамки у всех элементов, кроме нужных границ */
        .absolute.bg-orange-600,
        span.absolute.bg-orange-600 {
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
        }
        /* Убираем серые контуры у всех элементов с абсолютным позиционированием */
        .absolute,
        [class*="absolute"] {
          outline: none !important;
          box-shadow: none !important;
        }
        /* Убираем серые контуры у бейджиков и декоративных элементов */
        span[class*="bg-orange-600"],
        span[class*="rounded-full"],
        .rounded-full[class*="bg-"],
        [class*="rounded-full"] {
          outline: none !important;
          border: none !important;
          box-shadow: none !important;
        }
        /* Убираем серые контуры у всех элементов с фоновыми цветами, кроме блоков с border-2 */
        [class*="bg-"]:not([class*="border-2"]):not([class*="border-"]) {
          outline: none !important;
          box-shadow: none !important;
        }
        /* Убираем серые контуры у всех элементов с rounded */
        [class*="rounded"] {
          outline: none !important;
        }
        /* Убираем серые контуры у элементов, которые не должны их иметь */
        *,
        *::before,
        *::after {
          outline: none !important;
          box-shadow: none !important;
        }
        /* Убираем серые контуры у всех типов элементов */
        div, span, p, h1, h2, h3, h4, h5, h6, img, canvas, svg, button, input, textarea, select, a, ul, ol, li, table, tr, td, th, thead, tbody {
          outline: none !important;
          box-shadow: none !important;
        }
        /* Сохраняем нужные границы блоков */
        .border-2,
        [class*="border-2"],
        .border,
        [class*="border"]:not([class*="border-r"]):not([class*="border-l"]):not([class*="border-t"]):not([class*="border-b"]) {
          /* Границы сохраняются, но убираем outline и box-shadow */
          outline: none !important;
          box-shadow: none !important;
        }
        /* Убираем серые контуры у всех span элементов */
        span,
        span * {
          outline: none !important;
          box-shadow: none !important;
        }
        /* Убираем серые контуры у div элементов, кроме тех, где границы нужны */
        div:not([class*="border-2"]):not([class*="border-"]) {
          outline: none !important;
          box-shadow: none !important;
        }
        /* Убираем серые контуры у всех изображений */
        img {
          outline: none !important;
          border: none !important;
          box-shadow: none !important;
        }
        /* Убираем серые контуры у всех canvas элементов */
        canvas {
          outline: none !important;
          border: none !important;
          box-shadow: none !important;
        }
        /* Убираем серые контуры у всех текстовых элементов */
        p, h1, h2, h3, h4, h5, h6, div, span {
          outline: none !important;
        }
        /* Убираем серый фон и контуры только у бейджиков (элементы с абсолютным позиционированием и bg-orange-600) */
        .absolute.bg-orange-600,
        span.absolute.bg-orange-600,
        .absolute[class*="bg-orange-600"],
        span[class*="absolute"][class*="bg-orange-600"],
        span[class*="bg-orange-600"][class*="absolute"] {
          background-color: rgb(234, 88, 12) !important;
          background: rgb(234, 88, 12) !important;
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        /* Убираем серые фоны у родительских элементов бейджиков, если они появились при печати */
        .relative > .absolute.bg-orange-600,
        .relative > span.absolute.bg-orange-600,
        .relative > span[class*="absolute"][class*="bg-orange-600"] {
          background-color: rgb(234, 88, 12) !important;
          background: rgb(234, 88, 12) !important;
        }
        /* Убираем все возможные серые фоны у бейджиков */
        span[class*="bg-orange-600"] {
          background-color: rgb(234, 88, 12) !important;
          background: rgb(234, 88, 12) !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        /* Убираем серые фоны из inline стилей у бейджиков */
        span[style*="background"][class*="bg-orange-600"],
        span[class*="bg-orange-600"][style*="background"] {
          background-color: rgb(234, 88, 12) !important;
          background: rgb(234, 88, 12) !important;
        }
        /* Убираем серый фон у родительских элементов бейджиков, НО сохраняем фон у блоков с bg-orange-50 */
        .relative:has(> .absolute.bg-orange-600):not([class*="bg-orange-50"]):not(.bg-orange-50),
        .relative:has(> span.absolute.bg-orange-600):not([class*="bg-orange-50"]):not(.bg-orange-50) {
          background-color: transparent !important;
          background: transparent !important;
        }
        /* Альтернативный способ - убираем серый фон у всех relative элементов, которые содержат бейджик */
        div.relative > span.absolute.bg-orange-600,
        div[class*="relative"] > span[class*="absolute"][class*="bg-orange-600"] {
          background-color: rgb(234, 88, 12) !important;
          background: rgb(234, 88, 12) !important;
        }
        /* Убираем серый фон у всех элементов с абсолютным позиционированием, которые содержат текст "23%" */
        span.absolute:contains("23%"),
        span[class*="absolute"]:contains("23%") {
          background-color: rgb(234, 88, 12) !important;
          background: rgb(234, 88, 12) !important;
        }
        /* Убираем серые фоны из всех возможных источников у бейджиков, НО не у родительских блоков с bg-orange-50 */
        *[class*="bg-orange-600"][class*="absolute"] *:not([class*="bg-orange-50"]):not(.bg-orange-50),
        *[class*="absolute"][class*="bg-orange-600"] *:not([class*="bg-orange-50"]):not(.bg-orange-50) {
          background-color: transparent !important;
          background: transparent !important;
        }
      }
    `,
  });

  // Функция для экспорта всей презентации в PDF
  const exportAllToPDF = () => {
    handlePrintAll();
  };

  const renderSlideContent = (slideIndex: number) => {
    // Используем ту же логику, что и для основного слайда
    if (slideIndex === 0) {
      return (
        <div className="w-full h-full p-6 flex flex-col relative" style={{ minHeight: 0 }}>
          <div className="flex items-start justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Экономия на закупках 2025</h1>
            <img src="/images/logo-small.svg" alt="Logo" className="w-10 h-10" />
          </div>
          <div
            className="h-1 w-full rounded-full mb-3"
            style={{
              background:
                'linear-gradient(90deg, rgba(168, 85, 247, 0.25) 0%, rgba(168, 85, 247, 0.25) 35%, rgba(255,255,255,1) 60%, rgba(255,255,255,1) 100%)',
            }}
          />
          <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-0 overflow-hidden" style={{ minHeight: 0 }}>
            <div className="p-3 flex flex-col" style={{ minHeight: 0 }}>
              <div className="text-xl font-bold text-gray-800">Конкурентные закупки</div>
              <div className="mt-4 grid grid-cols-2 gap-4 flex-1" style={{ minHeight: 0 }}>
                <div className="bg-gray-50 border-2 border-gray-300 rounded-xl px-4 py-6 flex flex-col justify-center items-center">
                  <div className="text-xl leading-7 font-semibold text-gray-700 text-center mb-3">Сумма закупок 2025</div>
                  <div className="text-3xl font-extrabold text-gray-900 text-center tabular-nums">{totalPurchasesAmount2025Label}</div>
                </div>
                <div className="bg-orange-50 border-2 border-orange-300 rounded-xl px-4 py-6 relative flex flex-col justify-center items-center">
                  <span className="absolute -top-3 -right-3 bg-orange-600 text-white text-base font-extrabold rounded-full px-4 py-2 shadow tabular-nums">
                    23%
                  </span>
                  <div className="text-xl leading-7 font-semibold text-gray-900 text-center mb-3">Экономия</div>
                  <div className="text-3xl font-extrabold text-gray-900 text-center tabular-nums">13 млрд</div>
                </div>
              </div>
            </div>
            <div className="p-3 flex" style={{ minHeight: 0 }}>
              <div className="w-full h-full bg-blue-50/50 border border-blue-200 rounded-2xl p-3 flex flex-col justify-between shadow-sm" style={{ minHeight: 0 }}>
                <div>
                  <div className="text-xl font-bold text-gray-800">Закупки на электронной торговой площадке</div>
                  <div className="mt-2">
                    {etpExamples.length === 0 ? (
                      <div className="text-xs text-gray-400">Нет данных</div>
                    ) : (
                      <ul className="space-y-1">
                        {etpExamples.map((text, idx) => (
                          <li key={idx} className="text-xs text-gray-700 flex gap-1">
                            <span className="text-gray-400">{idx + 1}.</span>
                            <span className="truncate" title={text}>{text}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
                      <div className="text-lg leading-5 font-semibold text-gray-700 text-center">Кол-во закупок</div>
                      <div className="text-xl font-extrabold text-gray-900 text-center tabular-nums">{etpPurchasesCount}</div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
                      <div className="text-lg leading-5 font-semibold text-gray-700 text-center">Сумма закупок</div>
                      <div className="text-xl font-extrabold text-gray-900 text-center tabular-nums">{etpPurchasesAmountLabel}</div>
                    </div>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-md px-3 py-2">
                    <div className="text-lg leading-5 font-semibold text-orange-800 text-center">Экономия</div>
                    <div className="text-xl font-extrabold text-orange-800 text-center tabular-nums">13 млрд</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-span-2 p-3 grid grid-cols-2 gap-4" style={{ minHeight: 0 }}>
              <div className="flex flex-col" style={{ minHeight: 0 }}>
                <div className="text-xl font-bold text-gray-800 mb-1">Все закупки</div>
                <div className="flex-1" style={{ minHeight: 0 }}>
                  <Bar data={purchasesPlanFactData} options={purchasesPlanFactOptions} />
                </div>
              </div>
              <div className="flex flex-col" style={{ minHeight: 0 }}>
                <div className="text-xl font-bold text-gray-800 mb-1">Категории закупок</div>
                <div className="flex-1" style={{ minHeight: 0 }}>
                  <Doughnut data={purchasesCategoryPieData} options={purchasesCategoryPieOptions} />
                </div>
              </div>
            </div>
          </div>
          <div className="absolute bottom-4 right-4 text-gray-400 text-sm font-medium">
            {slideIndex + 1}
          </div>
        </div>
      );
    } else if (slideIndex === 1) {
      return (
        <div className="w-full h-full p-6 flex flex-col" style={{ minHeight: 0 }}>
          <div className="flex items-start justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Внедрение Электронной торговой площадки</h1>
            <img src="/images/logo-small.svg" alt="Logo" className="w-10 h-10" />
          </div>
          <div
            className="h-1 w-full rounded-full mb-3"
            style={{
              background:
                'linear-gradient(90deg, rgba(168, 85, 247, 0.25) 0%, rgba(168, 85, 247, 0.25) 35%, rgba(255,255,255,1) 60%, rgba(255,255,255,1) 100%)',
            }}
          />
          <div className="flex-1 grid grid-cols-2 gap-6" style={{ minHeight: 0 }}>
            {/* Левая колонка: скриншоты в блоках 1 и 3 */}
            <div className="flex flex-col gap-4" style={{ minHeight: 0 }}>
              {/* Блок 1 - скриншот */}
              <div className="flex-1 relative" style={{ minHeight: 0 }}>
                <div className="absolute inset-0 bg-white rounded-xl border-2 border-gray-300 shadow-lg p-0.5 z-10 transform rotate-1 overflow-hidden">
                  <img 
                    src="/images/presentation/Все закупки.png" 
                    alt="Все закупки" 
                    className="w-full h-full object-cover rounded-lg"
                    style={{ transform: 'scale(1.15)' }}
                  />
                </div>
                <div className="absolute inset-0 bg-white rounded-xl border-2 border-gray-300 shadow-lg p-0.5 z-0 transform -rotate-1 translate-x-2 translate-y-2 opacity-60 overflow-hidden">
                  <img 
                    src="/images/presentation/Все закупки.png" 
                    alt="Все закупки" 
                    className="w-full h-full object-cover rounded-lg"
                    style={{ transform: 'scale(1.15)' }}
                  />
                </div>
              </div>

              {/* Блок 3 - скриншот */}
              <div className="flex-1 relative" style={{ minHeight: 0 }}>
                <div className="absolute inset-0 bg-white rounded-xl border-2 border-gray-300 shadow-lg p-0.5 z-10 transform -rotate-1 overflow-hidden">
                  <img 
                    src="/images/presentation/Профиль компании.png" 
                    alt="Профиль компании" 
                    className="w-full h-full object-cover rounded-lg"
                    style={{ transform: 'scale(1.15)' }}
                  />
                </div>
                <div className="absolute inset-0 bg-white rounded-xl border-2 border-gray-300 shadow-lg p-0.5 z-0 transform rotate-1 -translate-x-2 -translate-y-2 opacity-60 overflow-hidden">
                  <img 
                    src="/images/presentation/Профиль компании.png" 
                    alt="Профиль компании" 
                    className="w-full h-full object-cover rounded-lg"
                    style={{ transform: 'scale(1.15)' }}
                  />
                </div>
              </div>
            </div>

            {/* Правая колонка: тезисы */}
            <div className="flex-1 flex flex-col gap-4 overflow-y-auto" style={{ minHeight: 0 }}>
              <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-2">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{slide2PilotTitle}</h3>
                <p className="text-lg text-gray-800 leading-relaxed">{slide2PilotText}</p>
              </div>
              <div className="bg-gray-50 border-2 border-gray-300 rounded-xl p-2">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{slide2GoalsTitle}</h3>
                <ul className="space-y-2 text-lg text-gray-700">
                  {slide2Goals.map((goal, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>{goal}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4">
                <h3 className="text-3xl font-bold text-gray-900 mb-3">{slide2ResultsTitle}</h3>
                <ul className="space-y-2 text-xl text-gray-700">
                  {slide2Results.map((result, index) => {
                    const symbols = ['>', '>', '+'];
                    return (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-orange-600 font-bold">{symbols[index] || '•'}</span>
                        <span>{result}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        </div>
      );
    } else if (slideIndex === 2) {
      // Третий слайд - Нагрузка
      return (
        <div className="w-full h-full p-6 flex flex-col" style={{ minHeight: 0 }}>
          <div className="flex items-start justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Нагрузка</h1>
            <img src="/images/logo-small.svg" alt="Logo" className="w-10 h-10" />
          </div>

          <div
            className="h-1 w-full rounded-full mb-3"
            style={{
              background:
                'linear-gradient(90deg, rgba(168, 85, 247, 0.25) 0%, rgba(168, 85, 247, 0.25) 35%, rgba(255,255,255,1) 60%, rgba(255,255,255,1) 100%)',
            }}
          />

          <div className="flex-1 grid grid-cols-2 gap-6" style={{ minHeight: 0 }}>
            {/* Диаграмма: Закупки */}
            <div className="flex flex-col bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200 rounded-xl p-4 shadow-sm" style={{ minHeight: 0 }}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-lg font-bold text-gray-800">Закупки</div>
                <div className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-semibold">2 чел.</div>
              </div>
              <div style={{ height: '70%', minHeight: 0 }}>
                <Bar data={purchasesWorkloadData} options={workloadChartOptions} />
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Рост:</span>
                  <span className="text-sm font-bold text-green-600">
                    ↑ +{calculateGrowth(workloadData.purchases.year2024, workloadData.purchases.year2025)}%
                  </span>
                </div>
                <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-blue-400 to-blue-600 h-full rounded-full transition-all"
                    style={{ 
                      width: `${Math.min(100, (workloadData.purchases.year2025 / Math.max(workloadData.purchases.year2024, 1)) * 100)}%` 
                    }}
                  />
                </div>
                <div className="text-xs text-center text-gray-600">
                  Нагрузка: <span className="font-bold text-gray-800">
                    {Math.round(workloadData.purchases.year2025 / 2).toLocaleString('ru-RU')} на чел.
                  </span>
                </div>
              </div>
            </div>

            {/* Диаграмма: Заказы и Договоры (объединенное направление) */}
            <div className="flex flex-col bg-gradient-to-br from-purple-50 to-white border-2 border-purple-200 rounded-xl p-4 shadow-sm" style={{ minHeight: 0 }}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-lg font-bold text-gray-800">Заказы и Договоры</div>
                <div className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-semibold">4 чел.</div>
              </div>
              <div style={{ height: '70%', minHeight: 0 }}>
                <Bar data={requestsAndContractsWorkloadData} options={workloadChartOptions} />
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Рост:</span>
                  <span className="text-sm font-bold text-green-600">
                    ↑ +{calculateGrowth(requestsAndContracts2024, requestsAndContracts2025)}%
                  </span>
                </div>
                <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-purple-400 to-purple-600 h-full rounded-full transition-all"
                    style={{ 
                      width: `${Math.min(100, (requestsAndContracts2025 / Math.max(requestsAndContracts2024, 1)) * 100)}%` 
                    }}
                  />
                </div>
                <div className="text-xs text-center text-gray-600">
                  Нагрузка: <span className="font-bold text-gray-800">
                    {Math.round(requestsAndContracts2025 / 4).toLocaleString('ru-RU')} на чел.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* План 2026 по закупкам */}
          <div className="mt-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-800">План 2026 по закупкам</h3>
              <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">2026</div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/80 border border-green-200 rounded-lg p-3">
                <div className="text-xs text-gray-600 mb-1">Целевой объем</div>
                <div className="text-xl font-extrabold text-gray-900 tabular-nums">—</div>
              </div>
              <div className="bg-white/80 border border-green-200 rounded-lg p-3">
                <div className="text-xs text-gray-600 mb-1">Количество закупок</div>
                <div className="text-xl font-extrabold text-gray-900 tabular-nums">—</div>
              </div>
              <div className="bg-white/80 border border-green-200 rounded-lg p-3">
                <div className="text-xs text-gray-600 mb-1">Рост к 2025</div>
                <div className="text-xl font-extrabold text-green-600 tabular-nums">—</div>
              </div>
            </div>
          </div>
        </div>
      );
    } else if (slideIndex === 3) {
      // Четвертый слайд - SLA по закупкам
      return (
        <div className="w-full h-full p-6 flex flex-col" style={{ minHeight: 0 }}>
          <div className="flex items-start justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">SLA по закупкам</h1>
            <img src="/images/logo-small.svg" alt="Logo" className="w-10 h-10" />
          </div>
          <div
            className="h-1 w-full rounded-full mb-3"
            style={{
              background:
                'linear-gradient(90deg, rgba(168, 85, 247, 0.25) 0%, rgba(168, 85, 247, 0.25) 35%, rgba(255,255,255,1) 60%, rgba(255,255,255,1) 100%)',
            }}
          />
          <div className="flex-1 flex flex-col" style={{ minHeight: 0, gap: 0 }}>
            {/* Верхняя часть: линейная диаграмма */}
            <div className="flex-shrink-0" style={{ height: '17.5%', minHeight: '100px', maxHeight: '125px', marginBottom: '-10px' }}>
              <Chart type="line" data={slaLineChartData} options={slaLineChartOptions} />
            </div>
            
            {/* Нижняя часть: столбчатая диаграмма */}
            <div className="flex-1 flex items-center justify-center" style={{ minHeight: '300px', maxHeight: '400px', padding: '10px 0' }}>
              <div className="w-full h-full">
                <Bar data={slaBarChartData} options={slaBarChartOptions} />
              </div>
            </div>

            {/* Нижняя часть: блоки с тезисами */}
            <div className="flex-shrink-0 grid grid-cols-2 gap-4">
              {/* Блок "Итоги 2025" */}
              <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Итоги 2025</h3>
                <ul className="space-y-2 text-lg text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>Команда закупок при сохранении численности персонала на реализовала на X% больше закупочных процедур в 2025</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>При этом доля реализованных в срок закупок увеличилась на X% в 2025 году в сравнении с 2024</span>
                  </li>
                </ul>
              </div>

              {/* Блок "Точки роста" */}
              <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Точки роста</h3>
                <p className="text-lg text-gray-700 mb-3">
                  Показатель SLA все еще находится на невысоком уровне и требует внимания. Для максимизации SLA в 2026 будут произведены:
                </p>
                <ul className="space-y-2 text-lg text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 mt-1">•</span>
                    <span>Оптимизация орг. структуры закупок (см. сл. X)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 mt-1">•</span>
                    <span>Введен усиленный контроль над планированием и исполнением закупок (см. сл. X)</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      );
    } else if (slideIndex === 4) {
      // Пятый слайд - Закупки у единственного источника - Зона роста
      return (
        <div className="w-full h-full p-6 flex flex-col" style={{ minHeight: 0 }}>
          <div className="flex items-start justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Закупки у единственного источника - Зона роста</h1>
            <img src="/images/logo-small.svg" alt="Logo" className="w-10 h-10" />
          </div>
          <div
            className="h-1 w-full rounded-full mb-3"
            style={{
              background:
                'linear-gradient(90deg, rgba(168, 85, 247, 0.25) 0%, rgba(168, 85, 247, 0.25) 35%, rgba(255,255,255,1) 60%, rgba(255,255,255,1) 100%)',
            }}
          />
          <div className="flex-1 grid grid-cols-2 gap-6" style={{ minHeight: 0 }}>
            {/* Левая колонка: диаграмма */}
            <div className="flex items-center justify-center" style={{ minHeight: 0, padding: '10px 0' }}>
              <div className="w-full h-full" style={{ maxHeight: '100%' }}>
                <Bar data={zueiChartData} options={zueiChartOptions} />
              </div>
            </div>

            {/* Правая колонка: блоки с тезисами */}
            <div className="flex flex-col gap-4 overflow-y-auto" style={{ minHeight: 0 }}>
              {/* Блок "Выводы" */}
              <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Выводы</h3>
                <p className="text-lg text-gray-700">
                  ЗУЕИ составили <span className="font-bold">21 млрд UZS</span> ~<span className="font-bold">34%</span> от общего объема закупок в 2025 году, что привело к росту стоимости закупок и потерям экономии оценочно на <span className="font-bold">4,6 млрд UZS</span>
                </p>
              </div>

              {/* Блок "Цель" */}
              <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Цель (!)</h3>
                <p className="text-lg text-gray-700 mb-3">
                  <span className="font-bold">Цель 2026:</span> Снижение объема ЗУЕИ на <span className="font-bold">30-50%</span> за счет перехода от реактивной модели к плановой. Ключевые запланированные меры:
                </p>
                <ul className="space-y-2 text-lg text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">ü</span>
                    <span>Оптимизация орг. структуры закупок для высвобождения ресурса под планирование и контроль сроков (см. сл. X)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">ü</span>
                    <span>Внедрение системы UzProc на предыдущий слайд (см. приложение) для развитие аналитики, прозрачности и управляемости процессов</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">ü</span>
                    <span>Структурированное планирование закупок – формирование и соблюдение годового/квартального плана, снижение доли внеплановых закупок</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      );
    } else {
      // Для остальных слайдов - базовый шаблон
      const slideTitles = [
        'Экономия на закупках 2025',
        'Внедрение Электронной торговой площадки',
        'Нагрузка',
        'SLA по закупкам',
        'Закупки у единственного источника - Зона роста',
        'Реализованные проекты развития 2025',
        'План закупок 2026',
        'Проекты развития 2026',
        'uzProc',
        'Улучшение пользовательного опыта'
      ];
      
      return (
        <div className="w-full h-full p-6 flex flex-col" style={{ minHeight: 0 }}>
          <div className="flex items-start justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">{slideTitles[slideIndex] || `Слайд ${slideIndex + 1}`}</h1>
            <img src="/images/logo-small.svg" alt="Logo" className="w-10 h-10" />
          </div>
          <div
            className="h-1 w-full rounded-full mb-3"
            style={{
              background:
                'linear-gradient(90deg, rgba(168, 85, 247, 0.25) 0%, rgba(168, 85, 247, 0.25) 35%, rgba(255,255,255,1) 60%, rgba(255,255,255,1) 100%)',
            }}
          />
          <div className="flex-1 flex items-center justify-center" style={{ minHeight: 0, padding: '20px 0' }}>
            <div className="w-full h-full" style={{ maxHeight: '100%' }}>
              <Bar data={zueiChartData} options={zueiChartOptions} />
            </div>
          </div>
        </div>
      );
    }
  };

  // Обработка навигации клавиатурой
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPreviousSlide();
      } else if (e.key === 'ArrowRight') {
        goToNextSlide();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <div className="h-full flex flex-col items-center justify-center bg-gray-100 p-6 overflow-auto">
      {/* Панель управления */}
      <div className="w-full max-w-[1123px] mb-4 flex items-center justify-between gap-3 no-print">
        <div className="text-sm text-gray-600">
          Слайд {currentSlide + 1} / {totalSlides}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportToPDF}
            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg border border-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-2"
            title="Экспорт текущего слайда в PDF"
          >
            <Download className="w-4 h-4" />
            PDF (текущий)
          </button>
          <button
            onClick={exportAllToPDF}
            className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg border border-green-600 hover:bg-green-700 transition-colors flex items-center gap-2"
            title="Экспорт всей презентации в PDF"
          >
            <Download className="w-4 h-4" />
            PDF (вся презентация)
          </button>
          <button
            onClick={goToPreviousSlide}
            disabled={currentSlide === 0}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Предыдущий слайд
          </button>
          <button
            onClick={goToNextSlide}
            disabled={currentSlide === totalSlides - 1}
            className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Следующий слайд
          </button>
        </div>
      </div>

      {/* Контейнер слайда - A4 альбомная ориентация (297mm x 210mm) */}
      <div 
        ref={printRef}
        className={`relative bg-white overflow-hidden ${currentSlide === 0 ? '' : 'shadow-2xl rounded-lg'}`}
        style={{
          width: '1123px', // 297mm при 96 DPI
          height: '794px',  // 210mm при 96 DPI
          aspectRatio: '297/210'
        }}
      >
        {/* Слайд с анимацией */}
        <div 
          key={currentSlide}
          className="w-full h-full p-6 flex flex-col animate-fadeIn"
          style={{ minHeight: 0 }}
        >
          {currentSlide === 0 ? (
            // Первый слайд - Экономия
            <>
              <div className="flex items-start justify-between mb-2">
                <h1 className="text-3xl font-bold text-gray-900">Экономия на закупках 2025</h1>
                <img
                  src="/images/logo-small.svg"
                  alt="Logo"
                  className="w-10 h-10"
                />
                </div>

              {/* Разделитель как у логотипа: градиент, исчезающий справа */}
              <div
                className="h-1 w-full rounded-full mb-3"
                style={{
                  background:
                    'linear-gradient(90deg, rgba(168, 85, 247, 0.25) 0%, rgba(168, 85, 247, 0.25) 35%, rgba(255,255,255,1) 60%, rgba(255,255,255,1) 100%)',
                }}
              />

              {/* 4 равные части (2x2) */}
              <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-0 overflow-hidden" style={{ minHeight: 0 }}>
                {/* Верхний левый: Конкурентные закупки */}
                <div className="p-3 flex flex-col" style={{ minHeight: 0 }}>
                  <div className="text-xl font-bold text-gray-800">Конкурентные закупки</div>
                  <div className="mt-4 grid grid-cols-2 gap-4 flex-1" style={{ minHeight: 0 }}>
                    <div className="bg-gray-50 border-2 border-gray-300 rounded-xl px-4 py-6 flex flex-col justify-center items-center">
                      <div className="text-xl leading-7 font-semibold text-gray-700 text-center mb-3">Сумма закупок 2025</div>
                      <div className="text-3xl font-extrabold text-gray-900 text-center tabular-nums">{totalPurchasesAmount2025Label}</div>
              </div>
                    <div className="bg-orange-50 border-2 border-orange-300 rounded-xl px-4 py-6 relative flex flex-col justify-center items-center">
                      <span className="absolute -top-3 -right-3 bg-orange-600 text-white text-base font-extrabold rounded-full px-4 py-2 shadow tabular-nums">
                        23%
                      </span>
                      <div className="text-xl leading-7 font-semibold text-gray-900 text-center mb-3">Экономия</div>
                      <div className="text-3xl font-extrabold text-gray-900 text-center tabular-nums">13 млрд</div>
                    </div>
                  </div>
                    </div>

                {/* Верхний правый: placeholder */}
                <div className="p-3 flex" style={{ minHeight: 0 }}>
                  {/* Внутренний контейнер меньше блока, с цветом и закруглением */}
                  <div className="w-full h-full bg-blue-50/50 border border-blue-200 rounded-2xl p-3 flex flex-col justify-between shadow-sm" style={{ minHeight: 0 }}>
                    <div>
                      <div className="text-xl font-bold text-gray-800">Закупки на электронной торговой площадке</div>
                      <div className="mt-2">
                        {etpExamples.length === 0 ? (
                          <div className="text-xs text-gray-400">Нет данных</div>
                        ) : (
                          <ul className="space-y-1">
                            {etpExamples.map((text, idx) => (
                              <li key={idx} className="text-xs text-gray-700 flex gap-1">
                                <span className="text-gray-400">{idx + 1}.</span>
                                <span className="truncate" title={text}>
                                  {text}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                    </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
                          <div className="text-lg leading-5 font-semibold text-gray-700 text-center">Кол-во закупок</div>
                          <div className="text-xl font-extrabold text-gray-900 text-center tabular-nums">{etpPurchasesCount}</div>
                  </div>
                        <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
                          <div className="text-lg leading-5 font-semibold text-gray-700 text-center">Сумма закупок</div>
                          <div className="text-xl font-extrabold text-gray-900 text-center tabular-nums">{etpPurchasesAmountLabel}</div>
                </div>
                    </div>
                      <div className="bg-orange-50 border border-orange-200 rounded-md px-3 py-2">
                        <div className="text-lg leading-5 font-semibold text-orange-800 text-center">Экономия</div>
                        <div className="text-xl font-extrabold text-orange-800 text-center tabular-nums">13 млрд</div>
                  </div>
                </div>
                  </div>
                </div>

                {/* Нижняя строка: столбчатая диаграмма слева, pie chart справа */}
                <div className="col-span-2 p-3 grid grid-cols-2 gap-4" style={{ minHeight: 0 }}>
                  {/* Столбчатая диаграмма - Все закупки */}
                  <div className="flex flex-col" style={{ minHeight: 0 }}>
                    <div className="text-xl font-bold text-gray-800 mb-1">Все закупки</div>
                    <div className="flex-1" style={{ minHeight: 0 }}>
                      <Bar data={purchasesPlanFactData} options={purchasesPlanFactOptions} />
                    </div>
                  </div>
                  
                  {/* Doughnut chart - Категории закупок */}
                  <div className="flex flex-col" style={{ minHeight: 0 }}>
                    <div className="text-xl font-bold text-gray-800 mb-1">Категории закупок</div>
                    <div className="flex-1" style={{ minHeight: 0 }}>
                      <Doughnut data={purchasesCategoryPieData} options={purchasesCategoryPieOptions} />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Номер слайда справа внизу */}
              <div className="absolute bottom-4 right-4 text-gray-400 text-sm font-medium">
                {currentSlide + 1}
              </div>
            </>
          ) : currentSlide === 1 ? (
            // Второй слайд - Внедрение ЭТП
            <div className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
              <div className="flex items-start justify-between mb-2">
                <h1 className="text-3xl font-bold text-gray-900">Внедрение Электронной торговой площадки</h1>
                <img src="/images/logo-small.svg" alt="Logo" className="w-10 h-10" />
              </div>

              <div
                className="h-1 w-full rounded-full mb-3"
                style={{
                  background:
                    'linear-gradient(90deg, rgba(168, 85, 247, 0.25) 0%, rgba(168, 85, 247, 0.25) 35%, rgba(255,255,255,1) 60%, rgba(255,255,255,1) 100%)',
                }}
              />

              <div className="flex-1 grid grid-cols-2 gap-6" style={{ minHeight: 0 }}>
                {/* Левая колонка: скриншоты в блоках 1 и 3 */}
                <div className="flex flex-col gap-4" style={{ minHeight: 0 }}>
                  {/* Блок 1 - скриншот */}
                  <div className="flex-1 relative" style={{ minHeight: 0 }}>
                    <div className="absolute inset-0 bg-white rounded-xl border-2 border-gray-300 shadow-lg p-0.5 z-10 transform rotate-1 overflow-hidden">
                      <img 
                        src="/images/presentation/Все закупки.png" 
                        alt="Все закупки" 
                        className="w-full h-full object-cover rounded-lg"
                        style={{ transform: 'scale(1.15)' }}
                      />
                    </div>
                    <div className="absolute inset-0 bg-white rounded-xl border-2 border-gray-300 shadow-lg p-0.5 z-0 transform -rotate-1 translate-x-2 translate-y-2 opacity-60 overflow-hidden">
                      <img 
                        src="/images/presentation/Все закупки.png" 
                        alt="Все закупки" 
                        className="w-full h-full object-cover rounded-lg"
                        style={{ transform: 'scale(1.15)' }}
                      />
                    </div>
                  </div>

                  {/* Блок 3 - скриншот */}
                  <div className="flex-1 relative" style={{ minHeight: 0 }}>
                    <div className="absolute inset-0 bg-white rounded-xl border-2 border-gray-300 shadow-lg p-0.5 z-10 transform -rotate-1 overflow-hidden">
                      <img 
                        src="/images/presentation/Профиль компании.png" 
                        alt="Профиль компании" 
                        className="w-full h-full object-cover rounded-lg"
                        style={{ transform: 'scale(1.15)' }}
                      />
                    </div>
                    <div className="absolute inset-0 bg-white rounded-xl border-2 border-gray-300 shadow-lg p-0.5 z-0 transform rotate-1 -translate-x-2 -translate-y-2 opacity-60 overflow-hidden">
                      <img 
                        src="/images/presentation/Профиль компании.png" 
                        alt="Профиль компании" 
                        className="w-full h-full object-cover rounded-lg"
                        style={{ transform: 'scale(1.15)' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Правая колонка: тезисы */}
                <div className="flex-1 flex flex-col gap-4 overflow-y-auto" style={{ minHeight: 0 }}>
                  {/* Пилот */}
                  <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-2">
                    <h3 
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => setSlide2PilotTitle(e.currentTarget.textContent || 'Пилот')}
                      className="text-2xl font-bold text-gray-900 mb-3 outline-none focus:ring-2 focus:ring-blue-400 rounded px-1"
                    >
                      {slide2PilotTitle}
                    </h3>
                    <p 
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => setSlide2PilotText(e.currentTarget.textContent || '')}
                      className="text-lg text-gray-800 leading-relaxed outline-none focus:ring-2 focus:ring-blue-400 rounded px-1"
                    >
                      {slide2PilotText}
                    </p>
                  </div>

                  {/* Цели внедрения ЭТП */}
                  <div className="bg-gray-50 border-2 border-gray-300 rounded-xl p-2">
                    <h3 
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => setSlide2GoalsTitle(e.currentTarget.textContent || 'Цели Внедрения')}
                      className="text-2xl font-bold text-gray-900 mb-3 outline-none focus:ring-2 focus:ring-blue-400 rounded px-1"
                    >
                      {slide2GoalsTitle}
                    </h3>
                    <ul className="space-y-2 text-lg text-gray-700">
                      {slide2Goals.map((goal, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-blue-600 mt-1">•</span>
                          <span 
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => {
                              const newGoals = [...slide2Goals];
                              newGoals[index] = e.currentTarget.textContent || '';
                              setSlide2Goals(newGoals);
                            }}
                            className="outline-none focus:ring-2 focus:ring-blue-400 rounded px-1"
                          >
                            {goal}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Результаты */}
                  <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4">
                    <h3 
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => setSlide2ResultsTitle(e.currentTarget.textContent || 'Результаты')}
                      className="text-3xl font-bold text-gray-900 mb-3 outline-none focus:ring-2 focus:ring-orange-400 rounded px-1"
                    >
                      {slide2ResultsTitle}
                    </h3>
                    <ul className="space-y-2 text-xl text-gray-700">
                      {slide2Results.map((result, index) => {
                        const symbols = ['>', '>', '+'];
                        return (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-orange-600 font-bold">{symbols[index] || '•'}</span>
                            <span 
                              contentEditable
                              suppressContentEditableWarning
                              onBlur={(e) => {
                                const newResults = [...slide2Results];
                                newResults[index] = e.currentTarget.textContent || '';
                                setSlide2Results(newResults);
                              }}
                              className="outline-none focus:ring-2 focus:ring-orange-400 rounded px-1"
                            >
                              {result}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : currentSlide === 2 ? (
            // Третий слайд - Нагрузка
            <div className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
              <div className="flex items-start justify-between mb-2">
                <h1 className="text-3xl font-bold text-gray-900">Нагрузка</h1>
                <img src="/images/logo-small.svg" alt="Logo" className="w-10 h-10" />
              </div>

              <div
                className="h-1 w-full rounded-full mb-3"
                style={{
                  background:
                    'linear-gradient(90deg, rgba(168, 85, 247, 0.25) 0%, rgba(168, 85, 247, 0.25) 35%, rgba(255,255,255,1) 60%, rgba(255,255,255,1) 100%)',
                }}
              />

              <div className="flex-1 grid grid-cols-2 gap-6" style={{ minHeight: 0 }}>
                {/* Диаграмма: Закупки */}
                <div className="flex flex-col bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200 rounded-xl p-4 shadow-sm" style={{ minHeight: 0 }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-lg font-bold text-gray-800">Закупки</div>
                    <div className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-semibold">2 чел.</div>
                  </div>
                  <div style={{ height: '70%', minHeight: 0 }}>
                    <Bar data={purchasesWorkloadData} options={workloadChartOptions} />
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Рост:</span>
                      <span className="text-sm font-bold text-green-600">
                        ↑ +{calculateGrowth(workloadData.purchases.year2024, workloadData.purchases.year2025)}%
                      </span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-blue-400 to-blue-600 h-full rounded-full transition-all"
                        style={{ 
                          width: `${Math.min(100, (workloadData.purchases.year2025 / Math.max(workloadData.purchases.year2024, 1)) * 100)}%` 
                        }}
                      />
                    </div>
                    <div className="text-xs text-center text-gray-600">
                      Нагрузка: <span className="font-bold text-gray-800">
                        {Math.round(workloadData.purchases.year2025 / 2).toLocaleString('ru-RU')} на чел.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Диаграмма: Заказы и Договоры (объединенное направление) */}
                <div className="flex flex-col bg-gradient-to-br from-purple-50 to-white border-2 border-purple-200 rounded-xl p-4 shadow-sm" style={{ minHeight: 0 }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-lg font-bold text-gray-800">Заказы и Договоры</div>
                    <div className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-semibold">4 чел.</div>
                  </div>
                  <div style={{ height: '70%', minHeight: 0 }}>
                    <Bar data={requestsAndContractsWorkloadData} options={workloadChartOptions} />
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Рост:</span>
                      <span className="text-sm font-bold text-green-600">
                        ↑ +{calculateGrowth(requestsAndContracts2024, requestsAndContracts2025)}%
                      </span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-purple-400 to-purple-600 h-full rounded-full transition-all"
                        style={{ 
                          width: `${Math.min(100, (requestsAndContracts2025 / Math.max(requestsAndContracts2024, 1)) * 100)}%` 
                        }}
                      />
                    </div>
                    <div className="text-xs text-center text-gray-600">
                      Нагрузка: <span className="font-bold text-gray-800">
                        {Math.round(requestsAndContracts2025 / 4).toLocaleString('ru-RU')} на чел.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* План 2026 по закупкам */}
              <div className="mt-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-gray-800">План 2026 по закупкам</h3>
                  <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">2026</div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white/80 border border-green-200 rounded-lg p-3">
                    <div className="text-xs text-gray-600 mb-1">Целевой объем</div>
                    <div className="text-xl font-extrabold text-gray-900 tabular-nums">—</div>
                  </div>
                  <div className="bg-white/80 border border-green-200 rounded-lg p-3">
                    <div className="text-xs text-gray-600 mb-1">Количество закупок</div>
                    <div className="text-xl font-extrabold text-gray-900 tabular-nums">—</div>
                  </div>
                  <div className="bg-white/80 border border-green-200 rounded-lg p-3">
                    <div className="text-xs text-gray-600 mb-1">Рост к 2025</div>
                    <div className="text-xl font-extrabold text-green-600 tabular-nums">—</div>
                  </div>
                </div>
              </div>
            </div>
          ) : currentSlide === 3 ? (
            // Четвертый слайд - SLA по закупкам
            <div className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
              <div className="flex items-start justify-between mb-2">
                <h1 className="text-3xl font-bold text-gray-900">SLA по закупкам</h1>
                <img src="/images/logo-small.svg" alt="Logo" className="w-10 h-10" />
              </div>

              <div
                className="h-1 w-full rounded-full mb-3"
                style={{
                  background:
                    'linear-gradient(90deg, rgba(168, 85, 247, 0.25) 0%, rgba(168, 85, 247, 0.25) 35%, rgba(255,255,255,1) 60%, rgba(255,255,255,1) 100%)',
                }}
              />

              <div className="flex-1 flex flex-col" style={{ minHeight: 0, gap: 0 }}>
                {/* Верхняя часть: линейная диаграмма */}
                <div className="flex-shrink-0" style={{ height: '17.5%', minHeight: '100px', maxHeight: '125px', marginBottom: '-10px' }}>
                  <Chart type="line" data={slaLineChartData} options={slaLineChartOptions} />
                </div>
                
                {/* Нижняя часть: столбчатая диаграмма */}
                <div className="flex-1 flex items-center justify-center" style={{ minHeight: '300px', maxHeight: '400px', padding: '10px 0' }}>
                  <div className="w-full h-full">
                    <Bar data={slaBarChartData} options={slaBarChartOptions} />
                  </div>
                </div>

                {/* Нижняя часть: блоки с тезисами */}
                <div className="flex-shrink-0 grid grid-cols-2 gap-4">
                  {/* Блок "Итоги 2025" */}
                  <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Итоги 2025</h3>
                    <ul className="space-y-2 text-lg text-gray-700">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-1">•</span>
                        <span>Команда закупок при сохранении численности персонала на реализовала на X% больше закупочных процедур в 2025</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-1">•</span>
                        <span>При этом доля реализованных в срок закупок увеличилась на X% в 2025 году в сравнении с 2024</span>
                      </li>
                    </ul>
                  </div>

                  {/* Блок "Точки роста" */}
                  <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4">
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Точки роста</h3>
                    <p className="text-lg text-gray-700 mb-3">
                      Показатель SLA все еще находится на невысоком уровне и требует внимания. Для максимизации SLA в 2026 будут произведены:
                    </p>
                    <ul className="space-y-2 text-lg text-gray-700">
                      <li className="flex items-start gap-2">
                        <span className="text-orange-600 mt-1">•</span>
                        <span>Оптимизация орг. структуры закупок (см. сл. X)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-600 mt-1">•</span>
                        <span>Введен усиленный контроль над планированием и исполнением закупок (см. сл. X)</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : currentSlide === 4 ? (
            // Пятый слайд - Закупки у единственного источника - Зона роста
            <div className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
              <div className="flex items-start justify-between mb-2">
                <h1 className="text-3xl font-bold text-gray-900">Закупки у единственного источника - Зона роста</h1>
                <img src="/images/logo-small.svg" alt="Logo" className="w-10 h-10" />
              </div>

              <div
                className="h-1 w-full rounded-full mb-3"
                style={{
                  background:
                    'linear-gradient(90deg, rgba(168, 85, 247, 0.25) 0%, rgba(168, 85, 247, 0.25) 35%, rgba(255,255,255,1) 60%, rgba(255,255,255,1) 100%)',
                }}
              />

              <div className="flex-1 grid grid-cols-2 gap-6" style={{ minHeight: 0 }}>
                {/* Левая колонка: диаграмма */}
                <div className="flex items-center justify-center" style={{ minHeight: 0, padding: '10px 0' }}>
                  <div className="w-full h-full" style={{ maxHeight: '100%' }}>
                    <Bar data={zueiChartData} options={zueiChartOptions} />
                  </div>
                </div>

                {/* Правая колонка: блоки с тезисами */}
                <div className="flex flex-col gap-4 overflow-y-auto" style={{ minHeight: 0 }}>
                  {/* Блок "Выводы" */}
                  <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4">
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Выводы</h3>
                    <p className="text-lg text-gray-700">
                      ЗУЕИ составили <span className="font-bold">21 млрд UZS</span> ~<span className="font-bold">34%</span> от общего объема закупок в 2025 году, что привело к росту стоимости закупок и потерям экономии оценочно на <span className="font-bold">4,6 млрд UZS</span>
                    </p>
                  </div>

                  {/* Блок "Цель" */}
                  <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Цель (!)</h3>
                    <p className="text-lg text-gray-700 mb-3">
                      <span className="font-bold">Цель 2026:</span> Снижение объема ЗУЕИ на <span className="font-bold">30-50%</span> за счет перехода от реактивной модели к плановой. Ключевые запланированные меры:
                    </p>
                    <ul className="space-y-2 text-lg text-gray-700">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-1">ü</span>
                        <span>Оптимизация орг. структуры закупок для высвобождения ресурса под планирование и контроль сроков (см. сл. X)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-1">ü</span>
                        <span>Внедрение системы UzProc на предыдущий слайд (см. приложение) для развитие аналитики, прозрачности и управляемости процессов</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-1">ü</span>
                        <span>Структурированное планирование закупок – формирование и соблюдение годового/квартального плана, снижение доли внеплановых закупок</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : currentSlide === 5 ? (
            // Шестой слайд - Реализованные проекты развития 2025
            <div className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
              <div className="flex items-start justify-between mb-2">
                <h1 className="text-3xl font-bold text-gray-900">Реализованные проекты развития 2025</h1>
                <img src="/images/logo-small.svg" alt="Logo" className="w-10 h-10" />
              </div>

              <div
                className="h-1 w-full rounded-full mb-3"
                style={{
                  background:
                    'linear-gradient(90deg, rgba(168, 85, 247, 0.25) 0%, rgba(168, 85, 247, 0.25) 35%, rgba(255,255,255,1) 60%, rgba(255,255,255,1) 100%)',
                }}
              />

              <div className="flex-1 grid grid-cols-2 gap-4" style={{ minHeight: 0 }}>
                {/* Карточка 1: Вторсырье */}
                <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-gray-900">Вторсырье</h3>
                    <div className="bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded-full">Выполнено</div>
                  </div>
                </div>

                {/* Карточка 2: Оптимизация работы с договорами */}
                <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-gray-900">Оптимизация работы с договорами</h3>
                    <div className="bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded-full">Выполнено</div>
                  </div>
                </div>

                {/* Карточка 3: Автозаказы */}
                <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-gray-900">Автозаказы</h3>
                    <div className="bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded-full">Выполнено</div>
                  </div>
                </div>

                {/* Карточка 4: Изменение лимита */}
                <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-gray-900">Изменение лимита</h3>
                    <div className="bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded-full">Выполнено</div>
                  </div>
                </div>
              </div>
            </div>
          ) : currentSlide === 6 ? (
            // Седьмой слайд - План закупок 2026
            <div className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
              <div className="flex items-start justify-between mb-2">
                <h1 className="text-3xl font-bold text-gray-900">План закупок 2026</h1>
                <img src="/images/logo-small.svg" alt="Logo" className="w-10 h-10" />
              </div>

              <div
                className="h-1 w-full rounded-full mb-3"
                style={{
                  background:
                    'linear-gradient(90deg, rgba(168, 85, 247, 0.25) 0%, rgba(168, 85, 247, 0.25) 35%, rgba(255,255,255,1) 60%, rgba(255,255,255,1) 100%)',
                }}
              />

              <div className="flex-1 flex items-center justify-center text-gray-400" style={{ minHeight: 0 }}>
                Контент слайда будет добавлен позже
              </div>
            </div>
          ) : currentSlide === 7 ? (
            // Восьмой слайд - Проекты развития 2026
            <div className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
              <div className="flex items-start justify-between mb-2">
                <h1 className="text-3xl font-bold text-gray-900">Проекты развития 2026</h1>
                <img src="/images/logo-small.svg" alt="Logo" className="w-10 h-10" />
              </div>

              <div
                className="h-1 w-full rounded-full mb-3"
                style={{
                  background:
                    'linear-gradient(90deg, rgba(168, 85, 247, 0.25) 0%, rgba(168, 85, 247, 0.25) 35%, rgba(255,255,255,1) 60%, rgba(255,255,255,1) 100%)',
                }}
              />

              <div className="flex-1 flex items-center justify-center text-gray-400" style={{ minHeight: 0 }}>
                Контент слайда будет добавлен позже
              </div>
            </div>
          ) : currentSlide === 8 ? (
            // Девятый слайд - uzProc
            <div className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
              <div className="flex items-start justify-between mb-2">
                <h1 className="text-3xl font-bold text-gray-900">uzProc</h1>
                <img src="/images/logo-small.svg" alt="Logo" className="w-10 h-10" />
              </div>

              <div
                className="h-1 w-full rounded-full mb-3"
                style={{
                  background:
                    'linear-gradient(90deg, rgba(168, 85, 247, 0.25) 0%, rgba(168, 85, 247, 0.25) 35%, rgba(255,255,255,1) 60%, rgba(255,255,255,1) 100%)',
                }}
              />

              <div className="flex-1 flex items-center justify-center text-gray-400" style={{ minHeight: 0 }}>
                Контент слайда будет добавлен позже
              </div>
            </div>
          ) : currentSlide === 9 ? (
            // Десятый слайд - Улучшение пользовательного опыта
            <div className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
              <div className="flex items-start justify-between mb-2">
                <h1 className="text-3xl font-bold text-gray-900">Улучшение пользовательного опыта</h1>
                <img src="/images/logo-small.svg" alt="Logo" className="w-10 h-10" />
              </div>

              <div
                className="h-1 w-full rounded-full mb-3"
                style={{
                  background:
                    'linear-gradient(90deg, rgba(168, 85, 247, 0.25) 0%, rgba(168, 85, 247, 0.25) 35%, rgba(255,255,255,1) 60%, rgba(255,255,255,1) 100%)',
                }}
              />

              <div className="flex-1 flex items-center justify-center text-gray-400" style={{ minHeight: 0 }}>
                Контент слайда будет добавлен позже
              </div>
            </div>
          ) : (
            // Остальные слайды - макет
            <div className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
              <div className="flex items-start justify-between mb-2">
                <h1 className="text-3xl font-bold text-gray-900">Названия добавим позже</h1>
                <img src="/images/logo-small.svg" alt="Logo" className="w-10 h-10" />
              </div>

              <div
                className="h-1 w-full rounded-full mb-3"
                style={{
                  background:
                    'linear-gradient(90deg, rgba(168, 85, 247, 0.25) 0%, rgba(168, 85, 247, 0.25) 35%, rgba(255,255,255,1) 60%, rgba(255,255,255,1) 100%)',
                }}
              />

              <div className="flex-1 flex items-center justify-center text-gray-400" style={{ minHeight: 0 }}>
                  Контент слайда будет добавлен позже
              </div>
            </div>
          )}
        </div>

        {/* Кнопки навигации */}
        <button
          onClick={goToPreviousSlide}
          disabled={currentSlide === 0}
          className={`absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white shadow-lg hover:bg-gray-50 transition-colors ${
            currentSlide === 0
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:shadow-xl'
          }`}
          aria-label="Предыдущий слайд"
        >
          <ChevronLeft className="w-6 h-6 text-gray-700" />
        </button>

        <button
          onClick={goToNextSlide}
          disabled={currentSlide === totalSlides - 1}
          className={`absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white shadow-lg hover:bg-gray-50 transition-colors ${
            currentSlide === totalSlides - 1
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:shadow-xl'
          }`}
          aria-label="Следующий слайд"
        >
          <ChevronRight className="w-6 h-6 text-gray-700" />
        </button>
      </div>

      {/* Индикатор слайдов */}
      <div className="mt-6 flex items-center gap-2">
        {Array.from({ length: totalSlides }).map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`h-2 rounded-full transition-all ${
              index === currentSlide
                ? 'w-8 bg-blue-600'
                : 'w-2 bg-gray-300 hover:bg-gray-400'
            }`}
            aria-label={`Перейти к слайду ${index + 1}`}
          />
        ))}
      </div>

      {/* Счетчик слайдов */}
      <div className="mt-4 text-sm text-gray-600">
        {currentSlide + 1} / {totalSlides}
      </div>

      {/* Скрытый контейнер для экспорта всей презентации */}
      <div 
        ref={printAllRef} 
        style={{ 
          position: 'absolute', 
          left: '-9999px', 
          top: '-9999px', 
          width: '1123px',
          visibility: 'hidden',
          pointerEvents: 'none'
        }}
        className="print-only"
      >
        {Array.from({ length: totalSlides }).map((_, slideIndex) => (
          <div
            key={slideIndex}
            className="slide-page bg-white"
            style={{
              width: '1123px',
              height: '794px',
              pageBreakAfter: slideIndex < totalSlides - 1 ? 'always' : 'auto',
              marginBottom: '20px',
            }}
          >
            {renderSlideContent(slideIndex)}
          </div>
        ))}
      </div>
    </div>
  );
}


