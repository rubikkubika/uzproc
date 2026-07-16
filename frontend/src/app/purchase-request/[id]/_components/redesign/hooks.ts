'use client';

import { useEffect, useRef, useState } from 'react';

/** Подгружаем шрифты дизайна один раз. */
export function useDesignFonts() {
  useEffect(() => {
    const id = 'redesign-google-fonts';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap';
    document.head.appendChild(link);
  }, []);
}

/** Высота закреплённой шапки — чтобы тёмная полоска прилипала сразу под ней. */
export function useStickyHeaderHeight() {
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const update = () => setHeaderHeight(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { headerRef, headerHeight };
}
