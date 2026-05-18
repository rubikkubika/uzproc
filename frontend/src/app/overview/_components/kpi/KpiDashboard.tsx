'use client';

import { useKpiMonth } from './hooks/useKpiMonth';
import { useKpiSavingsData } from './hooks/useKpiSavingsData';
import { useKpiSettings } from './hooks/useKpiSettings';
import { KpiMonthSelector } from './ui/KpiMonthSelector';
import { KpiSavingsBlock } from './ui/KpiSavingsBlock';

export function KpiDashboard() {
  const { year, month, goPrev, goNext } = useKpiMonth();
  const { settings, updateSettings, resetSettings } = useKpiSettings();
  const { data, loading, error } = useKpiSavingsData(year, month);

  return (
    <div className="space-y-2">
      {/* Шапка: переключатель месяца */}
      <div className="bg-white rounded shadow px-3 py-2 flex items-center gap-3">
        <span className="text-xs font-medium text-gray-700">KPI премии</span>
        <KpiMonthSelector year={year} month={month} onPrev={goPrev} onNext={goNext} />
      </div>

      {/* Блок экономии */}
      <KpiSavingsBlock
        data={data?.byPurchaser ?? []}
        settings={settings}
        onSettingsChange={updateSettings}
        onSettingsReset={resetSettings}
        loading={loading}
        error={error}
        year={year}
        month={month}
      />

      {/* Заглушки для SLA и CSI — будут добавлены позже */}
      <div className="bg-white rounded-lg shadow px-3 py-4 text-center text-xs text-gray-400">
        SLA — в разработке
      </div>
      <div className="bg-white rounded-lg shadow px-3 py-4 text-center text-xs text-gray-400">
        CSI — в разработке
      </div>
    </div>
  );
}
