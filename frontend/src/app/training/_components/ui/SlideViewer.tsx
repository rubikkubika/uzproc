'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Slide } from '../types/training.types';

interface SlideViewerProps {
  slide: Slide;
  currentIndex: number;
  totalSlides: number;
  canGoNext: boolean;
  canGoPrev: boolean;
  onNext: () => void;
  onPrev: () => void;
}

export default function SlideViewer({
  slide,
  currentIndex,
  totalSlides,
  canGoNext,
  canGoPrev,
  onNext,
  onPrev,
}: SlideViewerProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Slide content */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div
          className="w-full h-full"
          style={{ minHeight: '400px' }}
          dangerouslySetInnerHTML={{ __html: slide.htmlContent }}
        />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-4">
        <button
          onClick={onPrev}
          disabled={!canGoPrev}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            canGoPrev
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'bg-gray-50 text-gray-300 cursor-not-allowed'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          Назад
        </button>

        <span className="text-sm text-gray-500 font-medium">
          {currentIndex + 1} / {totalSlides}
        </span>

        <button
          onClick={onNext}
          disabled={!canGoNext}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            canGoNext
              ? 'bg-purple-600 text-white hover:bg-purple-700'
              : 'bg-gray-50 text-gray-300 cursor-not-allowed'
          }`}
        >
          Далее
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
