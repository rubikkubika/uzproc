'use client';

import { useEkDashboard } from './hooks/useEkDashboard';
import { EkCfoTable } from './ui/EkCfoTable';
import { EkConcentrationCard } from './ui/EkConcentrationCard';
import { EkFiltersBar } from './ui/EkFiltersBar';
import { EkModeBadges } from './ui/EkModeBadges';
import { EkRiskDistributionCard } from './ui/EkRiskDistributionCard';
import { EkShareCard } from './ui/EkShareCard';
import { EkSkeleton } from './ui/EkSkeleton';
import { EkStateCard } from './ui/EkStateCard';

/**
 * Дашборд «ЕК»: доля закупок у единственного источника по ЦФО за год назначения на закупщика.
 * Слева — итоги, распределение ЦФО по риску и структура суммы ЕК; справа — таблица по ЦФО.
 */
export function EkDashboardContent() {
  const { filters, data, derived, loading, error, retry, isEmpty, nearestYear, thresholds, sort, toggleSort } =
    useEkDashboard();
  const ready = !loading && !error && !isEmpty && data != null && derived != null;

  return (
    <div className="flex flex-col gap-3">
      <EkFiltersBar year={filters.year} availableYears={filters.availableYears} onYearChange={filters.setYear}>
        {!loading && data && derived && (
          <EkModeBadges
            yearType={data.yearType}
            amountsInBaseCurrency={data.amountsInBaseCurrency}
            baseCurrency={data.baseCurrency}
            exchangeRatesTitle={derived.exchangeRatesTitle}
          />
        )}
      </EkFiltersBar>

      {loading && <EkSkeleton />}

      {!loading && error && <EkStateCard variant="error" message={error} onRetry={retry} />}

      {isEmpty && (
        <EkStateCard variant="empty" year={filters.year} nearestYear={nearestYear} onShowYear={filters.setYear} />
      )}

      {ready && (
        <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-3 items-start">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
            <div className="sm:col-span-2 lg:col-span-1">
              <EkShareCard totals={derived.totals} currency={derived.currency} />
            </div>
            <EkRiskDistributionCard items={derived.riskDistribution} />
            <EkConcentrationCard segments={derived.concentration} currency={derived.currency} />
          </div>
          <EkCfoTable
            rows={derived.sortedRows}
            totals={derived.totals}
            data={data}
            totalsCurrency={derived.currency}
            thresholds={thresholds}
            sort={sort}
            onSort={toggleSort}
          />
        </div>
      )}
    </div>
  );
}
