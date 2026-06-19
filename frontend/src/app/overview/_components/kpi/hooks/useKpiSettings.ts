'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getBackendUrl } from '@/utils/api';
import type { KpiBlockSettings } from '../types/kpi.types';
import {
  DEFAULT_KPI_SAVINGS_SETTINGS,
  DEFAULT_KPI_SLA_SETTINGS,
  DEFAULT_KPI_CSI_SETTINGS,
} from '../types/kpi.types';

type BlockKey = 'savings' | 'sla' | 'csi';

interface AllKpiSettings {
  savings: KpiBlockSettings;
  sla: KpiBlockSettings;
  csi: KpiBlockSettings;
}

/** API одного KPI-блока — совместимо с прежними хуками настроек. */
export interface KpiBlockSettingsApi {
  settings: KpiBlockSettings;
  updateSettings: (patch: Partial<KpiBlockSettings>) => void;
  resetSettings: () => void;
}

const DEFAULTS: AllKpiSettings = {
  savings: DEFAULT_KPI_SAVINGS_SETTINGS,
  sla: DEFAULT_KPI_SLA_SETTINGS,
  csi: DEFAULT_KPI_CSI_SETTINGS,
};

const SETTINGS_URL = () => `${getBackendUrl()}/api/overview/kpi/settings`;

/**
 * Настройки KPI-премии. Загружаются с бэкенда (общие для всех пользователей)
 * и сохраняются туда же при изменении (с дебаунсом, чтобы не слать запрос на каждый ввод).
 *
 * Возвращает по блоку («Экономия», «SLA», «CSI») объект с тем же интерфейсом,
 * что и прежние локальные хуки: { settings, updateSettings, resetSettings }.
 */
export function useKpiSettings() {
  const [all, setAll] = useState<AllKpiSettings>(DEFAULTS);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Загрузка настроек с бэкенда один раз при монтировании.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(SETTINGS_URL());
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setAll({
          savings: { ...DEFAULTS.savings, ...(data.savings ?? {}) },
          sla: { ...DEFAULTS.sla, ...(data.sla ?? {}) },
          csi: { ...DEFAULTS.csi, ...(data.csi ?? {}) },
        });
      } catch {
        // При ошибке остаёмся на значениях по умолчанию.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Сохранение всего набора настроек на бэкенд с дебаунсом.
  const persist = useCallback((next: AllKpiSettings) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch(SETTINGS_URL(), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      }).catch(() => {
        // Ошибку сохранения игнорируем: локальное состояние уже обновлено.
      });
    }, 600);
  }, []);

  const updateBlock = useCallback((key: BlockKey, patch: Partial<KpiBlockSettings>) => {
    setAll((prev) => {
      const next = { ...prev, [key]: { ...prev[key], ...patch } };
      persist(next);
      return next;
    });
  }, [persist]);

  const resetBlock = useCallback((key: BlockKey) => {
    setAll((prev) => {
      const next = { ...prev, [key]: DEFAULTS[key] };
      persist(next);
      return next;
    });
  }, [persist]);

  const makeBlock = (key: BlockKey): KpiBlockSettingsApi => ({
    settings: all[key],
    updateSettings: (patch) => updateBlock(key, patch),
    resetSettings: () => resetBlock(key),
  });

  return {
    savings: makeBlock('savings'),
    sla: makeBlock('sla'),
    csi: makeBlock('csi'),
  };
}
