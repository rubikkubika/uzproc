'use client';

import { HelpCircle } from 'lucide-react';

interface TourButtonProps {
  onClick: () => void;
  /** Подсказка при наведении */
  title?: string;
}

/** Кнопка «?» запуска ознакомительного тура по разделу — располагается в правом верхнем углу страницы. */
export default function TourButton({ onClick, title = 'Обучение: тур по разделу' }: TourButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label="Обучение"
      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
    >
      <HelpCircle className="h-4 w-4" />
    </button>
  );
}
