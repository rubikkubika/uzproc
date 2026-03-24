'use client';

import { Volume2 } from 'lucide-react';
import { Slide } from '../types/training.types';

interface SlideListProps {
  slides: Slide[];
  currentSlideIndex: number;
  onSlideSelect: (index: number) => void;
  audioUrls: Record<number, string>;
}

export default function SlideList({ slides, currentSlideIndex, onSlideSelect, audioUrls }: SlideListProps) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">
        Урок 1: Введение
      </h3>
      {slides.map((slide, index) => {
        const isActive = index === currentSlideIndex;
        const hasAudio = audioUrls[index] !== undefined;
        return (
          <button
            key={slide.id}
            onClick={() => onSlideSelect(index)}
            className={`w-full text-left px-3 py-2.5 rounded-lg transition-all text-sm border ${
              isActive
                ? 'bg-purple-50 border-purple-300 text-purple-900 shadow-sm'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  isActive
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {index + 1}
              </span>
              <span className={`font-medium truncate flex-1 ${isActive ? 'text-purple-900' : ''}`}>
                {slide.title}
              </span>
              {hasAudio && (
                <Volume2 className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-purple-500' : 'text-gray-400'}`} />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
