'use client';

import React, { useRef, useState } from 'react';
import { Star } from 'lucide-react';
import { getRatingMeta } from './utils/specification-feedback.utils';

interface StarRatingProps {
  rating: number;
  onRatingChange: (rating: number) => void;
}

/** Звёздная шкала 0.5–5.0 с половинками (идентична форме CSI). */
export default function StarRating({ rating, onRatingChange }: StarRatingProps) {
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleContainerMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - containerRect.left;
    const starSize = 48;
    const gap = 4;
    const totalStarWidth = starSize + gap;
    const starIndex = Math.floor(x / totalStarWidth);
    const star = starIndex + 1;
    if (star < 1 || star > 5) {
      setHoveredValue(null);
      return;
    }
    const positionInStar = x - starIndex * totalStarWidth;
    const isLeftHalf = positionInStar < starSize / 2;
    setHoveredValue(isLeftHalf ? star - 0.5 : star);
  };

  const handleStarClick = (star: number, e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isLeftHalf = x < rect.width / 2;
    onRatingChange(isLeftHalf ? star - 0.5 : star);
  };

  const displayValue = hoveredValue ?? rating;
  const meta = getRatingMeta(displayValue);

  return (
    <div className="flex items-center gap-3">
      <div
        ref={containerRef}
        className="flex items-center gap-1"
        onMouseMove={handleContainerMouseMove}
        onMouseLeave={() => setHoveredValue(null)}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const isHovering = hoveredValue !== null;
          const isFull = star <= displayValue;
          const isHalf = displayValue >= star - 0.5 && displayValue < star;
          return (
            <button
              key={star}
              type="button"
              onClick={(e) => handleStarClick(star, e)}
              className="relative w-12 h-12 flex-shrink-0 focus:outline-none cursor-pointer"
              aria-label={`Оценить ${star} звезд`}
            >
              <Star className="absolute inset-0 w-12 h-12 fill-gray-200 text-gray-300 pointer-events-none" />
              {isFull && (
                <Star
                  className={`absolute inset-0 w-12 h-12 pointer-events-none ${
                    isHovering ? 'fill-yellow-300 text-yellow-300' : 'fill-yellow-400 text-yellow-400'
                  }`}
                />
              )}
              {isHalf && !isFull && (
                <div
                  className="absolute inset-0 w-12 h-12 overflow-hidden pointer-events-none"
                  style={{ clipPath: 'inset(0 50% 0 0)' }}
                >
                  <Star
                    className={`absolute inset-0 w-12 h-12 ${
                      isHovering ? 'fill-yellow-300 text-yellow-300' : 'fill-yellow-400 text-yellow-400'
                    }`}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>
      <div className="min-w-[140px]">
        {displayValue > 0 ? (
          <span className={`font-medium ${meta?.color ?? 'text-gray-500'}`} style={{ fontSize: '15px' }}>
            {displayValue.toFixed(1)}
            {meta ? ` — ${meta.label}` : ''}
          </span>
        ) : (
          <span className="text-gray-400" style={{ fontSize: '15px' }}>
            Не оценено
          </span>
        )}
      </div>
    </div>
  );
}
