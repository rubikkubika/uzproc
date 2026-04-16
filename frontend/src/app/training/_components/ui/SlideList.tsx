'use client';

import { Volume2, Video } from 'lucide-react';
import { Slide, SlideBlock } from '../types/training.types';

interface SlideListProps {
  slides: Slide[];
  currentSlideIndex: number;
  onSlideSelect: (index: number) => void;
  audioUrls: Record<number, string>;
  videoUrls: Record<number, string>;
}

const BLOCK_CONFIG: Record<SlideBlock, { label: string; color: string; activeBg: string; activeBorder: string; activeText: string; badgeBg: string }> = {
  intro: {
    label: 'Блок 1 · Введение',
    color: 'text-purple-600',
    activeBg: 'bg-purple-50',
    activeBorder: 'border-purple-300',
    activeText: 'text-purple-900',
    badgeBg: 'bg-purple-600',
  },
  roadmap: {
    label: 'Блок 2 · Road Map',
    color: 'text-green-700',
    activeBg: 'bg-green-50',
    activeBorder: 'border-green-300',
    activeText: 'text-green-900',
    badgeBg: 'bg-green-600',
  },
  '1c': {
    label: 'Блок 3 · Запрос в 1С',
    color: 'text-violet-700',
    activeBg: 'bg-violet-50',
    activeBorder: 'border-violet-300',
    activeText: 'text-violet-900',
    badgeBg: 'bg-violet-600',
  },
};

export default function SlideList({
  slides,
  currentSlideIndex,
  onSlideSelect,
  audioUrls,
  videoUrls,
}: SlideListProps) {
  // Group slides by block, preserving order
  const blocks: SlideBlock[] = ['intro', 'roadmap', '1c'];

  return (
    <div className="flex flex-col gap-3">
      {blocks.map(block => {
        const blockSlides = slides.map((slide, idx) => ({ slide, idx })).filter(({ slide }) => slide.block === block);
        if (blockSlides.length === 0) return null;
        const cfg = BLOCK_CONFIG[block];

        return (
          <div key={block}>
            <div className={`text-xs font-bold uppercase tracking-wider mb-1.5 px-1 ${cfg.color}`}>
              {cfg.label}
            </div>
            <div className="flex flex-col gap-1.5">
              {blockSlides.map(({ slide, idx }) => {
                const isActive = idx === currentSlideIndex;
                const hasAudio = audioUrls[idx] !== undefined;
                const hasVideo = videoUrls[idx] !== undefined;
                return (
                  <button
                    key={slide.id}
                    onClick={() => onSlideSelect(idx)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-all text-sm border ${
                      isActive
                        ? `${cfg.activeBg} ${cfg.activeBorder} ${cfg.activeText} shadow-sm`
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                          isActive ? `${cfg.badgeBg} text-white` : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <span className={`font-medium truncate flex-1 text-xs ${isActive ? cfg.activeText : ''}`}>
                        {slide.title}
                      </span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {hasAudio && (
                          <Volume2 className={`w-3 h-3 ${isActive ? 'text-purple-500' : 'text-gray-400'}`} />
                        )}
                        {hasVideo && (
                          <Video className={`w-3 h-3 ${isActive ? 'text-blue-500' : 'text-gray-400'}`} />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
