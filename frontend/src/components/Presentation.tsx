'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
              <div className="flex items-start justify-between mb-1">
                <h1 className="text-3xl font-bold text-gray-900">Экономия</h1>
                <div className="bg-green-100 border-2 border-green-500 rounded-lg px-4 py-2">
                  <div className="text-xs text-gray-600 mb-0.5 text-center">Сэкономлено</div>
                  <div className="text-xl font-bold text-green-700 text-center">более 300 тыс $</div>
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-1" style={{ minHeight: 0 }}>
                {/* Верхняя часть: диаграмма экономии и карточки */}
                <div className="flex items-start gap-3" style={{ height: '50%', minHeight: 0 }}>
                  <div className="w-2/3 h-full" style={{ minHeight: 0 }}>
                    <div className="text-sm font-semibold text-gray-700 mb-0.5">Общая экономия</div>
                    <div style={{ height: 'calc(100% - 1.5rem)' }}>
                      <Bar data={savingsData} options={savingsChartOptions} />
                    </div>
                  </div>
                  <div className="w-1/3 flex flex-col gap-1.5 pt-2">
                    <div className="bg-blue-50 p-2 rounded-lg border-l-4 border-blue-500">
                      <div className="text-xs text-gray-600 mb-0.5">План</div>
                      <div className="text-lg font-bold text-blue-700">100 млн ₽</div>
                    </div>
                    <div className="bg-green-50 p-2 rounded-lg border-l-4 border-green-500">
                      <div className="text-xs text-gray-600 mb-0.5">Факт</div>
                      <div className="text-lg font-bold text-green-700">85 млн ₽</div>
                    </div>
                    <div className="bg-orange-50 p-2 rounded-lg border-l-4 border-orange-500">
                      <div className="text-xs text-gray-600 mb-0.5">Экономия</div>
                      <div className="text-lg font-bold text-orange-700">15 млн ₽</div>
                      <div className="text-sm font-semibold text-orange-600">15%</div>
                    </div>
                  </div>
                </div>
                {/* Нижняя часть: диаграмма медианных цен */}
                <div className="flex items-start" style={{ height: '50%', minHeight: 0 }}>
                  <div className="w-2/3 h-full" style={{ minHeight: 0 }}>
                    <div className="text-sm font-semibold text-gray-700 mb-0.5">Медианные цены</div>
                    <div style={{ height: 'calc(100% - 1.5rem)' }}>
                      <Bar data={medianPriceData} options={medianPriceChartOptions} />
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            // Остальные слайды - макет
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-4xl font-bold text-gray-800 mb-4">
                  Слайд {currentSlide + 1}
                </h2>
                <p className="text-xl text-gray-600">
                  Контент слайда будет добавлен позже
                </p>
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


