'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import { getBackendUrl } from '@/utils/api';
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

type PurchasesByCfo = Record<string, number>;

interface PurchaseForPresentation {
  cfo: string | null;
  budgetAmount: number | null;
  name?: string | null;
  title?: string | null;
  purchaseSubject?: string | null;
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
  responsive: true,
  maintainAspectRatio: false,
  layout: {
    padding: { top: 2, bottom: 2, left: 2, right: 2 },
  },
  plugins: {
    legend: {
      display: false,
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
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = 5; // Пока 5 слайдов для макета
  const [purchasesByCfo, setPurchasesByCfo] = useState<PurchasesByCfo>({});
  const [purchases2025, setPurchases2025] = useState<PurchaseForPresentation[]>([]);

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
      <div className="w-full max-w-[1123px] mb-4 flex items-center justify-between gap-3">
        <div className="text-sm text-gray-600">
          Слайд {currentSlide + 1} / {totalSlides}
        </div>
        <div className="flex items-center gap-2">
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
        className="relative bg-white shadow-2xl rounded-lg overflow-hidden"
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
              <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-0 border border-gray-200 rounded-lg overflow-hidden" style={{ minHeight: 0 }}>
                {/* Верхний левый: Конкурентные закупки */}
                <div className="p-3 flex flex-col" style={{ minHeight: 0 }}>
                  <div className="text-xl font-bold text-gray-800">Конкурентные закупки</div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
                      <div className="text-lg leading-5 font-semibold text-gray-700 text-center">Сумма закупок 2025</div>
                      <div className="text-xl font-extrabold text-gray-900 text-center tabular-nums">{totalPurchasesAmount2025Label}</div>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-md px-3 py-2 relative">
                      <span className="absolute -top-2.5 -right-2.5 bg-orange-600 text-white text-[12px] font-extrabold rounded-full px-2.5 py-1 shadow tabular-nums">
                        23%
                      </span>
                      <div className="text-lg leading-5 font-semibold text-orange-800 text-center">Экономия</div>
                      <div className="text-xl font-extrabold text-orange-800 text-center tabular-nums">13 млрд сум</div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="space-y-2">
                      <div className="w-full flex items-center justify-between rounded-lg transition-colors relative text-sm px-2 py-1.5 text-gray-700 bg-white border-l-4 border-gray-300 border border-gray-200">
                        <span className="font-semibold text-gray-700">Закупочная экономия</span>
                        <span className="bg-white border border-gray-300 rounded-full px-3 py-1 text-base font-extrabold text-gray-900 tabular-nums shadow-sm">
                          7.8 млрд
                        </span>
                      </div>

                      <div className="w-full flex items-center justify-between rounded-lg transition-colors relative text-sm px-2 py-1.5 text-gray-700 bg-white border-l-4 border-gray-300 border border-gray-200">
                        <span className="font-semibold text-gray-700">Экономия от медианных цен</span>
                        <span className="bg-white border border-gray-300 rounded-full px-3 py-1 text-base font-extrabold text-gray-900 tabular-nums shadow-sm">
                          3.1 млрд
                        </span>
                      </div>

                      <div className="w-full flex items-center justify-between rounded-lg transition-colors relative text-sm px-2 py-1.5 text-gray-700 bg-white border-l-4 border-gray-300 border border-gray-200">
                        <span className="font-semibold text-gray-700">Бюджетная экономия</span>
                        <span className="bg-white border border-gray-300 rounded-full px-3 py-1 text-base font-extrabold text-gray-900 tabular-nums shadow-sm">
                          2.1 млрд
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1" style={{ minHeight: 0 }} />
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
                        <div className="text-xl font-extrabold text-orange-800 text-center tabular-nums">13 млрд сум</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Нижняя строка: одна диаграмма на 2 блока (3+4) */}
                <div className="col-span-2 p-3 flex flex-col relative" style={{ minHeight: 0 }}>
                  <div className="text-xl font-bold text-gray-800 mb-1">Все закупки</div>
                  <div className="flex-1" style={{ minHeight: 0 }}>
                    <Bar data={purchasesPlanFactData} options={purchasesPlanFactOptions} />
                  </div>
                </div>
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
                    <div className="absolute inset-0 bg-white rounded-xl border-2 border-gray-300 shadow-lg p-2 z-10 transform rotate-1">
                      <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                        <span className="text-xs text-gray-400">Скриншот 1</span>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-white rounded-xl border-2 border-gray-300 shadow-lg p-2 z-0 transform -rotate-1 translate-x-2 translate-y-2 opacity-60">
                      <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                        <span className="text-xs text-gray-400">Скриншот 1</span>
                      </div>
                    </div>
                  </div>

                  {/* Блок 3 - скриншот */}
                  <div className="flex-1 relative" style={{ minHeight: 0 }}>
                    <div className="absolute inset-0 bg-white rounded-xl border-2 border-gray-300 shadow-lg p-2 z-10 transform -rotate-1">
                      <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                        <span className="text-xs text-gray-400">Скриншот 2</span>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-white rounded-xl border-2 border-gray-300 shadow-lg p-2 z-0 transform rotate-1 -translate-x-2 -translate-y-2 opacity-60">
                      <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                        <span className="text-xs text-gray-400">Скриншот 2</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Правая колонка: тезисы */}
                <div className="flex-1 flex flex-col gap-4 overflow-y-auto" style={{ minHeight: 0 }}>
                  {/* Пилот */}
                  <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-gray-800 leading-relaxed">
                      В конце 3 квартале 2025 проведен пилот по осуществлению закупок через ЭТП
                    </p>
                  </div>

                  {/* Цели внедрения ЭТП */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h3 className="text-base font-bold text-gray-900 mb-3">Цели внедрения ЭТП</h3>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-1">•</span>
                        <span>Повышение прозрачности закупочных процедур для внутренних команд и поставщиков</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-1">•</span>
                        <span>Расширение конкурентной среды за счет публичного доступа поставщиков к закупкам</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-1">•</span>
                        <span>Снижение операционной нагрузки за счет автоматизации обработки коммерческих предложений – стандарт закупок во всех крупных компаниях</span>
                      </li>
                    </ul>
                  </div>

                  {/* Результаты */}
                  <div className="bg-orange-50/50 border border-orange-200 rounded-lg p-4">
                    <h3 className="text-base font-bold text-gray-900 mb-3">Результаты</h3>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start gap-2">
                        <span className="text-orange-600 font-bold">&gt;</span>
                        <span><strong>3,6 млрд. сум</strong> – объем фактически реализованной экономии с октября 2025</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-600 font-bold">&gt;</span>
                        <span><strong>X млрд сум</strong> – стоимость проведенных закупок через ЭТП, <strong>X</strong> – количество</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-600 font-bold">+</span>
                        <span>Дополнительные результаты будут добавлены</span>
                      </li>
                    </ul>
                  </div>
                </div>
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
    </div>
  );
}


