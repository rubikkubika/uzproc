'use client';

import { useDeliveryPage } from './hooks/useDeliveryPage';
import DeliveryTableTabs from './ui/DeliveryTableTabs';
import DeliveryToolbar from './ui/toolbar/DeliveryToolbar';
import DeliveryYearFilter from './ui/toolbar/DeliveryYearFilter';
import DeliveryActiveChips from './ui/toolbar/DeliveryActiveChips';
import DeliveryDaysMonthBar from './ui/days/DeliveryDaysMonthBar';
import DeliveryDaysBody from './ui/days/DeliveryDaysBody';
import DeliveryTableHeader from './ui/table/DeliveryTableHeader';
import DeliveryTableBody from './ui/table/DeliveryTableBody';
import DeliveryTableScrollArea from './ui/table/DeliveryTableScrollArea';
import CreateDeliveryModal from './ui/CreateDeliveryModal';
import DeliveryDetailsModal from './ui/DeliveryDetailsModal';
import DeliveryCommentsPopup from './ui/comments/DeliveryCommentsPopup';
import Tour from '@/app/_components/tour/ui/Tour';
import TourButton from '@/app/_components/tour/ui/TourButton';

export default function DeliveryTable() {
  const { table, chart, horizon, chips, columns, rows, modals, comments, tour, backUrl } =
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

      <div data-tour="deadline-chart" className="px-5 py-2.5 border-b border-slate-200 flex-shrink-0">
        <DeliveryDaysBody
          cards={horizon.cards}
          onToggleHorizon={table.toggleHorizon}
          monthBar={(
            <DeliveryDaysMonthBar
              monthLabel={chart.monthLabel}
              legend={chart.legend}
              onPrevMonth={chart.goToPrevMonth}
              onNextMonth={chart.goToNextMonth}
            />
          )}
          days={chart.days}
          month={chart.month}
          onToggleDay={chart.toggleDay}
        />
      </div>

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
      />

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
          onOpenComments={comments.open}
          openCommentsId={comments.popup?.deliveryId ?? null}
          backUrl={backUrl}
          onNavigate={table.rememberPosition}
        />
      </DeliveryTableScrollArea>

      <CreateDeliveryModal open={modals.createOpen} onClose={modals.closeCreate} onCreated={table.reload} />
      <DeliveryDetailsModal delivery={modals.selectedDelivery} onClose={modals.closeDetails} onSaved={table.reload} />
      <DeliveryCommentsPopup comments={comments} />
      <Tour tour={tour} title="Тур по разделу «Поставка»" />
    </div>
  );
}
