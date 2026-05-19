'use client';

import { useKpiMonth } from './hooks/useKpiMonth';
import { useKpiSavingsData } from './hooks/useKpiSavingsData';
import { useKpiSlaData } from './hooks/useKpiSlaData';
import { useKpiCsiData } from './hooks/useKpiCsiData';
import { useKpiSettings, useKpiSlaSettings, useKpiCsiSettings } from './hooks/useKpiSettings';
import { KpiMonthSelector } from './ui/KpiMonthSelector';
import { KpiSummaryBlock } from './ui/KpiSummaryBlock';
import { KpiSavingsBlock } from './ui/KpiSavingsBlock';
import { KpiSlaBlock } from './ui/KpiSlaBlock';
import { KpiCsiBlock } from './ui/KpiCsiBlock';

export function KpiDashboard() {
  const { year, month, goPrev, goNext } = useKpiMonth();
  const savingsSettings = useKpiSettings();
  const slaSettings = useKpiSlaSettings();
  const csiSettings = useKpiCsiSettings();
  const savings = useKpiSavingsData(year, month);
  const sla = useKpiSlaData(year, month);
  const csi = useKpiCsiData(year, month);

  return (
    <div className="space-y-2">
      {/* Шапка: переключатель месяца */}
      <div className="bg-white rounded shadow px-3 py-2 flex items-center gap-3">
        <span className="text-xs font-medium text-gray-700">KPI премии</span>
        <KpiMonthSelector year={year} month={month} onPrev={goPrev} onNext={goNext} />
      </div>

      {/* Сводный блок премии */}
      <KpiSummaryBlock
        savings={savings.data?.byPurchaser ?? []}
        sla={sla.data?.byPurchaser ?? []}
        csi={csi.data?.byPurchaser ?? []}
        savingsSettings={savingsSettings.settings}
        slaSettings={slaSettings.settings}
        csiSettings={csiSettings.settings}
      />

      {/* Блок экономии */}
      <KpiSavingsBlock
        data={savings.data?.byPurchaser ?? []}
        settings={savingsSettings.settings}
        onSettingsChange={savingsSettings.updateSettings}
        onSettingsReset={savingsSettings.resetSettings}
        loading={savings.loading}
        error={savings.error}
        year={year}
        month={month}
      />

      {/* Блок SLA */}
      <KpiSlaBlock
        data={sla.data?.byPurchaser ?? []}
        settings={slaSettings.settings}
        onSettingsChange={slaSettings.updateSettings}
        onSettingsReset={slaSettings.resetSettings}
        loading={sla.loading}
        error={sla.error}
        year={year}
        month={month}
      />

      {/* Блок CSI */}
      <KpiCsiBlock
        data={csi.data?.byPurchaser ?? []}
        settings={csiSettings.settings}
        onSettingsChange={csiSettings.updateSettings}
        onSettingsReset={csiSettings.resetSettings}
        loading={csi.loading}
        error={csi.error}
        year={year}
        month={month}
      />
    </div>
  );
}
