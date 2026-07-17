'use client';

import { useKpiQuarter } from './hooks/useKpiQuarter';
import { useKpiSavingsData } from '../kpi/hooks/useKpiSavingsData';
import { useKpiSlaData } from '../kpi/hooks/useKpiSlaData';
import { useKpiCsiData } from '../kpi/hooks/useKpiCsiData';
import { useKpiSettings } from '../kpi/hooks/useKpiSettings';
import { KpiQuarterSelector } from './ui/KpiQuarterSelector';
import { KpiSummaryBlock } from '../kpi/ui/KpiSummaryBlock';
import { KpiSavingsBlock } from '../kpi/ui/KpiSavingsBlock';
import { KpiSlaBlock } from '../kpi/ui/KpiSlaBlock';
import { KpiCsiBlock } from '../kpi/ui/KpiCsiBlock';

/**
 * Дашборд «KPI премии 2» (только для пользователя с логином admin).
 * Логика идентична «KPI премии», но период — квартал, и в расчёт попадают
 * только закупки/отзывы, завершённые в выбранном квартале (не нарастающим итогом).
 */
export function KpiDashboard2() {
  const { year, quarter, goPrev, goNext } = useKpiQuarter();
  const { savings: savingsSettings, sla: slaSettings, csi: csiSettings } = useKpiSettings();
  // Последний месяц квартала — для месячного параметра переиспользуемых хуков (при заданном quarter не используется)
  const endMonth = quarter * 3;
  const savings = useKpiSavingsData(year, endMonth, quarter);
  const sla = useKpiSlaData(year, endMonth, quarter);
  const csi = useKpiCsiData(year, endMonth, quarter);

  return (
    <div className="space-y-2">
      {/* Шапка: переключатель квартала */}
      <div className="bg-white rounded shadow px-3 py-2 flex items-center gap-3">
        <span className="text-xs font-medium text-gray-700">KPI премии 2</span>
        <KpiQuarterSelector year={year} quarter={quarter} onPrev={goPrev} onNext={goNext} />
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
        month={endMonth}
        quarter={quarter}
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
        month={endMonth}
        quarter={quarter}
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
        month={endMonth}
        quarter={quarter}
      />
    </div>
  );
}
