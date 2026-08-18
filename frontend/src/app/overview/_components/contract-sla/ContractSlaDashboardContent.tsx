'use client';

import { useContractSlaData } from './hooks/useContractSlaData';
import { useContractSlaFilters } from './hooks/useContractSlaFilters';
import { ContractSlaAverageBlock } from './ui/ContractSlaAverageBlock';
import { ContractSlaByPreparerTable } from './ui/ContractSlaByPreparerTable';
import { ContractSlaDocumentsBlock } from './ui/ContractSlaDocumentsBlock';
import { ContractSlaFiltersBar } from './ui/ContractSlaFiltersBar';
import { ContractSlaMonthChart } from './ui/ContractSlaMonthChart';
import { MONTH_NAMES_FULL, MONTH_NAMES_NOMINATIVE } from './utils/contractSlaDashboard.utils';

export interface ContractSlaDashboardContentProps {
  /** Вкладка активна — данные загружаются только тогда. */
  enabled: boolean;
}

/**
 * Дашборд «SLA договоров»: выполнение планового SLA этапов (подготовка, согласование, подписание)
 * по подписанным документам за год + списки подписанных в текущем месяце с нарушением СЛА и без.
 */
export function ContractSlaDashboardContent({ enabled }: ContractSlaDashboardContentProps) {
  const filters = useContractSlaFilters();
  const { data, loading, error } = useContractSlaData(
    filters.year,
    filters.preparedBy,
    filters.exclude1p,
    filters.selectedMonth,
    filters.organizations,
    enabled
  );

  // Месяц, документы которого показаны в блоках ниже: выбранный на диаграмме либо текущий (с бэкенда)
  const shownMonth = data?.currentMonth ?? filters.selectedMonth;
  const monthLabel = data ? `подписанные в ${MONTH_NAMES_FULL[data.currentMonth - 1]} ${data.year} г.` : '';
  const monthBadge = shownMonth != null ? `${MONTH_NAMES_NOMINATIVE[shownMonth - 1]} ${filters.year}` : undefined;

  return (
    <div className="space-y-0.5 sm:space-y-1">
      <ContractSlaFiltersBar
        year={filters.year}
        availableYears={filters.availableYears}
        onYearChange={filters.setYear}
        organizations={filters.organizations}
        onOrganizationToggle={filters.toggleOrganization}
        onOrganizationsSelectAll={filters.selectAllOrganizations}
        onOrganizationsDeselectAll={filters.deselectAllOrganizations}
        preparedBy={filters.preparedBy}
        exclude1p={filters.exclude1p}
        onExclude1pChange={filters.setExclude1p}
        onResetFilters={filters.resetFilters}
      />

      <div className="flex gap-1.5 sm:gap-2 w-full min-w-0 items-stretch">
        <ContractSlaAverageBlock
          year={filters.year}
          averagePercentage={data?.averagePercentage ?? null}
          totalSigned={data?.totalSigned ?? 0}
          metSla={data?.metSla ?? 0}
          loading={loading}
          error={error}
        />
        <ContractSlaByPreparerTable
          year={filters.year}
          rows={data?.slaByPreparer ?? []}
          loading={loading}
          error={error}
          selectedPreparer={filters.preparedBy}
          onPreparerClick={filters.togglePreparedBy}
        />
        <ContractSlaMonthChart
          year={filters.year}
          slaByMonth={data?.slaByMonth ?? []}
          loading={loading}
          error={error}
          selectedMonth={filters.selectedMonth}
          onMonthSelect={filters.toggleMonth}
        />
      </div>

      <ContractSlaDocumentsBlock
        title="С нарушением СЛА"
        subtitle={monthLabel}
        monthBadge={monthBadge}
        monthBadgeSelected={filters.selectedMonth != null}
        onMonthBadgeClick={() => filters.setSelectedMonth(null)}
        rows={data?.documentsWithViolation ?? []}
        variant="violation"
        loading={loading}
        error={error}
      />
      <ContractSlaDocumentsBlock
        title="Без нарушения СЛА"
        subtitle={monthLabel}
        monthBadge={monthBadge}
        monthBadgeSelected={filters.selectedMonth != null}
        onMonthBadgeClick={() => filters.setSelectedMonth(null)}
        rows={data?.documentsWithoutViolation ?? []}
        variant="ok"
        loading={loading}
        error={error}
      />
    </div>
  );
}
