'use client';

import { useCallback, useState } from 'react';
import { PANELS_STORAGE_KEY } from '../constants/delivery.constants';

interface CollapsedPanels {
  chart: boolean;
}

const EXPANDED: CollapsedPanels = { chart: false };

function readStored(): CollapsedPanels {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(PANELS_STORAGE_KEY) : null;
    return raw ? { chart: Boolean(JSON.parse(raw).chart) } : EXPANDED;
  } catch {
    // localStorage недоступен или значение повреждено — остаёмся развёрнутыми
    return EXPANDED;
  }
}

/**
 * Свёрнута ли панель «По дням» над таблицей. Состояние запоминается в localStorage.
 * Раздел рендерится только на клиенте (вкладка выбирается после монтирования страницы),
 * поэтому значение читается сразу при инициализации.
 */
export function usePanelsCollapse() {
  const [collapsed, setCollapsed] = useState<CollapsedPanels>(readStored);

  const toggleChart = useCallback(() => {
    setCollapsed(prev => {
      const value = { chart: !prev.chart };
      try {
        localStorage.setItem(PANELS_STORAGE_KEY, JSON.stringify(value));
      } catch {
        // не удалось сохранить — состояние всё равно применится до перезагрузки
      }
      return value;
    });
  }, []);

  return { chartCollapsed: collapsed.chart, toggleChart };
}
