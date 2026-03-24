import { useState, useCallback } from 'react';
import { WELCOME_SLIDES } from '../constants/welcome-slides';
import { useSlideAudio } from './useSlideAudio';

export function useTraining() {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const slides = WELCOME_SLIDES;
  const currentSlide = slides[currentSlideIndex];
  const totalSlides = slides.length;

  const goToSlide = useCallback((index: number) => {
    if (index >= 0 && index < totalSlides) {
      setCurrentSlideIndex(index);
    }
  }, [totalSlides]);

  const goNext = useCallback(() => {
    goToSlide(currentSlideIndex + 1);
  }, [currentSlideIndex, goToSlide]);

  const goPrev = useCallback(() => {
    goToSlide(currentSlideIndex - 1);
  }, [currentSlideIndex, goToSlide]);

  const canGoNext = currentSlideIndex < totalSlides - 1;
  const canGoPrev = currentSlideIndex > 0;

  const audio = useSlideAudio(currentSlideIndex);

  return {
    slides,
    currentSlide,
    currentSlideIndex,
    totalSlides,
    goToSlide,
    goNext,
    goPrev,
    canGoNext,
    canGoPrev,
    audio,
  };
}
