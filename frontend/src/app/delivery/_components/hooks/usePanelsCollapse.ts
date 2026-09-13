'use client';

import { useCallback, useState } from 'react';
import { PANELS_STORAGE_KEY } from '../constants/delivery.constants';

interface CollapsedPanels {
  summary: boolean;
  chart: boolean;
}

const EXPANDED: CollapsedPanels = { summary: false, chart: false };

function readStored(): CollapsedPanels {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(PANELS_STORAGE_KEY) : null;
    return raw ? { ...EXPANDED, ...JSON.parse(raw) } : EXPANDED;
  } catch {
    // localStorage недоступен или значение повреждено — остаёмся развёрнутыми
    return EXPANDED;
  }
}

/**
 * Свёрнутые панели над таблицей (сводка, «По дням»). Состояние запоминается в localStorage.
 * Раздел рендерится только на клиенте (вкладка выбирается после монтирования страницы),
 * поэтому значение читается сразу при инициализации.
 */
export function usePanelsCollapse() {
  const [collapsed, setCollapsed] = useState<CollapsedPanels>(readStored);

  const update = useCallback((next: (prev: CollapsedPanels) => CollapsedPanels) => {
    setCollapsed(prev => {
      const value = next(prev);
      try {
        localStorage.setItem(PANELS_STORAGE_KEY, JSON.stringify(value));
      } catch {
        // не удалось сохранить — состояние всё равно применится до перезагрузки
      }
      return value;
    });
  }, []);

  const bothCollapsed = collapsed.summary && collapsed.chart;

  return {
    summaryCollapsed: collapsed.summary,
    chartCollapsed: collapsed.chart,
    bothCollapsed,
    toggleSummary: useCallback(() => update(p => ({ ...p, summary: !p.summary })), [update]),
    toggleChart: useCallback(() => update(p => ({ ...p, chart: !p.chart })), [update]),
    toggleBoth: useCallback(() => update(p => {
      const collapse = !(p.summary && p.chart);
      return { summary: collapse, chart: collapse };
    }), [update]),
  };
}
