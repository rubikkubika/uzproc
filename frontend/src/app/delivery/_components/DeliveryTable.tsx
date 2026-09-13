'use client';

import { useDeliveryPage } from './hooks/useDeliveryPage';
import DeliveryTableTabs from './ui/DeliveryTableTabs';
import DeliveryToolbar from './ui/toolbar/DeliveryToolbar';
import DeliveryYearFilter from './ui/toolbar/DeliveryYearFilter';
import DeliveryActiveChips from './ui/toolbar/DeliveryActiveChips';
import DeliveryCollapsiblePanel from './ui/panel/DeliveryCollapsiblePanel';
import DeliveryResponsibleSummaryTable from './ui/summary/DeliveryResponsibleSummaryTable';
import SummaryPanelHeaderExtra from './ui/summary/SummaryPanelHeaderExtra';
import DeliveryDaysHeaderExtra from './ui/days/DeliveryDaysHeaderExtra';
import DeliveryDaysBody from './ui/days/DeliveryDaysBody';
import DeliveryTableHeader from './ui/table/DeliveryTableHeader';
import DeliveryTableBody from './ui/table/DeliveryTableBody';
import DeliveryTableScrollArea from './ui/table/DeliveryTableScrollArea';
import CreateDeliveryModal from './ui/CreateDeliveryModal';
import DeliveryDetailsModal from './ui/DeliveryDetailsModal';
import Tour from '@/app/_components/tour/ui/Tour';
import TourButton from '@/app/_components/tour/ui/TourButton';

export default function DeliveryTable() {
  const { table, chart, horizon, summary, summaryYear, heatmap, summarySelection, chips, panels, columns, rows, modals, tour, backUrl } =
    useDeliveryPage();

  if (table.error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <p className="text-red-500">Ошибка: {table.error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col flex-1 min-h-0 text-[12px] text-slate-900">
      <DeliveryTableTabs
        activeTab={table.activeTab}
        tabCounts={table.tabCounts}
        onTabChange={table.setActiveTab}
        actions={<TourButton onClick={tour.start} />}
      />

      <DeliveryToolbar
        onCreate={modals.openCreate}
        onReset={table.handleResetFilters}
        yearFilter={(
          <DeliveryYearFilter
            availableYears={table.availableYears}
            selectedYear={table.selectedYear}
            showNoDate={table.showNoDate}
            onShowAll={table.handleShowAll}
            onYearChange={table.handleYearChange}
            onShowNoDate={table.handleShowNoDate}
          />
        )}
        chips={<DeliveryActiveChips chips={chips} />}
        shown={table.allItems.length}
        total={table.data?.totalElements ?? 0}
        loading={table.loading}
        bothPanelsCollapsed={panels.bothCollapsed}
        onTogglePanels={panels.toggleBoth}
      />

      <div className="flex flex-col gap-2.5 px-5 py-2.5 border-b border-slate-200 flex-shrink-0">
        <DeliveryCollapsiblePanel
          tourId="responsible-summary"
          title="Сводка по ответственным"
          collapsed={panels.summaryCollapsed}
          onToggle={panels.toggleSummary}
          headerExtra={(
            <SummaryPanelHeaderExtra
              collapsed={panels.summaryCollapsed}
              heatmap={heatmap}
              year={summaryYear}
              sliceLabel={summarySelection.sliceLabel}
            />
          )}
        >
          <DeliveryResponsibleSummaryTable
            summary={summary.summary}
            heatmap={heatmap}
            loading={summary.loading}
            selectedResponsible={summarySelection.selectedResponsible}
            selectedCell={summarySelection.selectedCell}
            onResponsibleClick={summarySelection.onResponsibleClick}
            onShipmentStatusClick={summarySelection.onShipmentStatusClick}
            onPaymentStatusClick={summarySelection.onPaymentStatusClick}
            onOverdueClick={summarySelection.onOverdueClick}
            onDeliveredClick={summarySelection.onDeliveredClick}
          />
        </DeliveryCollapsiblePanel>

        <DeliveryCollapsiblePanel
          tourId="deadline-chart"
          title="По дням"
          collapsed={panels.chartCollapsed}
          onToggle={panels.toggleChart}
          headerExtra={(
            <DeliveryDaysHeaderExtra
              monthLabel={chart.monthLabel}
              legend={chart.legend}
              onPrevMonth={chart.goToPrevMonth}
              onNextMonth={chart.goToNextMonth}
            />
          )}
        >
          <DeliveryDaysBody
            cards={horizon.cards}
            onToggleHorizon={table.toggleHorizon}
            days={chart.days}
            month={chart.month}
            onToggleDay={chart.toggleDay}
          />
        </DeliveryCollapsiblePanel>
      </div>

      <DeliveryTableScrollArea scrollRef={table.scrollRef}>
        <DeliveryTableHeader
          columns={columns}
          filters={table.filters}
          sortField={table.sortField}
          sortDirection={table.sortDirection}
          onSort={table.handleSort}
        />
        <DeliveryTableBody
          rows={rows}
          loading={table.loading}
          loadingMore={table.loadingMore}
          hasMore={table.hasMore}
          loadMoreRef={table.loadMoreRef}
          onReset={table.handleResetFilters}
          onOpen={modals.openDetails}
          onChangePlannedDate={table.updatePlannedDeliveryDate}
          onChangeActualDate={table.updateActualDeliveryDate}
          onChangeEsfDate={table.updateEsfDate}
          backUrl={backUrl}
          onNavigate={table.rememberPosition}
        />
      </DeliveryTableScrollArea>

      <CreateDeliveryModal open={modals.createOpen} onClose={modals.closeCreate} onCreated={table.reload} />
      <DeliveryDetailsModal delivery={modals.selectedDelivery} onClose={modals.closeDetails} onSaved={table.reload} />
      <Tour tour={tour} title="Тур по разделу «Поставки»" />
    </div>
  );
}
