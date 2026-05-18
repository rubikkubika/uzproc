'use client';

import { useState, useCallback } from 'react';
import type { KpiSavingsSettings } from '../types/kpi.types';
import { DEFAULT_KPI_SAVINGS_SETTINGS } from '../types/kpi.types';

const STORAGE_KEY = 'kpi_savings_settings';

function loadFromStorage(): KpiSavingsSettings {
  if (typeof window === 'undefined') return DEFAULT_KPI_SAVINGS_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_KPI_SAVINGS_SETTINGS;
    return { ...DEFAULT_KPI_SAVINGS_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_KPI_SAVINGS_SETTINGS;
  }
}

export function useKpiSettings() {
  const [settings, setSettings] = useState<KpiSavingsSettings>(loadFromStorage);

  const updateSettings = useCallback((patch: Partial<KpiSavingsSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_KPI_SAVINGS_SETTINGS);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return { settings, updateSettings, resetSettings };
}
