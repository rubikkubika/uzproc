'use client';

import { HelpCircle } from 'lucide-react';

interface TourButtonProps {
  onClick: () => void;
  /** Подсказка при наведении */
  title?: string;
}

/** Кнопка запуска ознакомительного тура по разделу. */
export default function TourButton({ onClick, title = 'Ознакомительный тур по разделу' }: TourButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100"
    >
      <HelpCircle className="h-3.5 w-3.5" />
      Обучение
    </button>
  );
}
