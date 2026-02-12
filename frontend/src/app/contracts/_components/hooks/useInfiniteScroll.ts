import { useEffect, RefObject } from 'react';

/**
 * Хук для бесконечной прокрутки (IntersectionObserver)
 */
export function useInfiniteScroll<T extends HTMLElement>(
  ref: RefObject<T | null>,
  options: {
    enabled: boolean;
    onLoadMore: () => void;
    threshold?: number;
  }
) {
  const { enabled, onLoadMore, threshold = 0.1 } = options;

  useEffect(() => {
    if (!enabled || !ref.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && enabled) onLoadMore();
      },
      { threshold }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [enabled, onLoadMore, threshold, ref]);
}
