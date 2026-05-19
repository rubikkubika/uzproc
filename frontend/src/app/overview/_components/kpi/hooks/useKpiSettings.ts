'use client';

import { useState, useCallback } from 'react';
import type { KpiBlockSettings } from '../types/kpi.types';
import {
  DEFAULT_KPI_SAVINGS_SETTINGS,
  DEFAULT_KPI_SLA_SETTINGS,
  DEFAULT_KPI_CSI_SETTINGS,
} from '../types/kpi.types';

const SAVINGS_STORAGE_KEY = 'kpi_savings_settings';
const SLA_STORAGE_KEY = 'kpi_sla_settings';
const CSI_STORAGE_KEY = 'kpi_csi_settings';

function loadFromStorage(storageKey: string, defaults: KpiBlockSettings): KpiBlockSettings {
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

function useKpiBlockSettings(storageKey: string, defaults: KpiBlockSettings) {
  const [settings, setSettings] = useState<KpiBlockSettings>(() => loadFromStorage(storageKey, defaults));

  const updateSettings = useCallback((patch: Partial<KpiBlockSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, JSON.stringify(next));
      }
      return next;
    });
  }, [storageKey]);

  const resetSettings = useCallback(() => {
    setSettings(defaults);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey, defaults]);

  return { settings, updateSettings, resetSettings };
}

export function useKpiSettings() {
  return useKpiBlockSettings(SAVINGS_STORAGE_KEY, DEFAULT_KPI_SAVINGS_SETTINGS);
}

export function useKpiSlaSettings() {
  return useKpiBlockSettings(SLA_STORAGE_KEY, DEFAULT_KPI_SLA_SETTINGS);
}

export function useKpiCsiSettings() {
  return useKpiBlockSettings(CSI_STORAGE_KEY, DEFAULT_KPI_CSI_SETTINGS);
}
