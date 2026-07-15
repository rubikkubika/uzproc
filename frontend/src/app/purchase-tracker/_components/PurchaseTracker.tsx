'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePurchaseTracker } from './hooks/usePurchaseTracker';
import PurchaseTrackerDetails from './ui/PurchaseTrackerDetails';
import PurchaseTrackerFavoritesSearch from './ui/PurchaseTrackerFavoritesSearch';
import PurchaseTrackerGroupedResults from './ui/PurchaseTrackerGroupedResults';
import PurchaseTrackerResults from './ui/PurchaseTrackerResults';
import PurchaseTrackerSearch from './ui/PurchaseTrackerSearch';
import PurchaseTrackerSidebar, { type TrackerTab } from './ui/PurchaseTrackerSidebar';

interface PurchaseTrackerProps {
  /** Показывать упрощённые названия ролей вместо официальных */
  simpleLanguage?: boolean;
  /** Показывать баннер прогноза даты договора */
  showForecast?: boolean;
}

/**
 * Страница «Трекер закупок» (вариант 1a «Трек-лента»).
 * Основная область — поиск среди всех закупок; вкладка «Избранное» дополнительно
 * показывает избранные закупки карточками в левом блоке под вкладками.
 */
export default function PurchaseTracker({ simpleLanguage = true, showForecast = true }: PurchaseTrackerProps) {
  const { userEmail, userRole, userId, userFullName, userInitiator, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TrackerTab>('mine');

  const {
    query,
    onQueryChange,
    onChipClick,
    clearSearch,
    onSelect,
    onSelectFavorite,
    results,
    empty,
    idle,
    loading,
    error,
    detail,
    canFavorite,
    isFavorite,
    onToggleFavorite,
    favoritesResults,
    favoritesLoading,
    favoritesError,
    favoritesEmpty,
    favoritesQuery,
    onFavoritesQueryChange,
    onSelectMine,
    mineResults,
    mineLoading,
    mineError,
    mineEmpty,
    mineQuery,
    onMineQueryChange,
  } = usePurchaseTracker({
    simpleLanguage,
    showForecast,
    userId,
    mineInitiator: userInitiator,
  });

  // Переключение вкладки очищает основной поиск (запрос + открытую деталь)
  const handleTabChange = (tab: TrackerTab) => {
    setActiveTab(tab);
    clearSearch();
  };

  const isFavoritesTab = activeTab === 'favorites';
  const isMineTab = activeTab === 'mine';
  const hasSearchResults = !idle && results.length > 0;

  // Карточки избранного — в левом блоке под вкладками
  const favoritesPanel = isFavoritesTab ? (
    <div className="flex flex-col gap-2">
      {favoritesLoading && <div className="px-1 text-xs text-[#98A2B3]">Загрузка…</div>}
      {favoritesError && <div className="px-1 text-xs text-[#B42318]">{favoritesError}</div>}
      {!favoritesLoading && !favoritesError && favoritesEmpty && (
        <div
          className="rounded-2xl bg-white px-4 py-3.5 text-[13px] leading-snug text-[#667085]"
          style={{ border: '1.5px solid #DFE3EB', boxShadow: '0 1px 2px rgba(16,24,40,.05)' }}
        >
          В избранном пока нет закупок. Добавляйте их «звёздочкой» в результатах поиска.
        </div>
      )}
      {!favoritesLoading && !favoritesError && !favoritesEmpty && (
        <>
          <PurchaseTrackerFavoritesSearch query={favoritesQuery} onQueryChange={onFavoritesQueryChange} />
          {favoritesResults.length > 0 ? (
            <PurchaseTrackerResults
              results={favoritesResults}
              empty={false}
              onSelect={onSelectFavorite}
              variant="list"
              canFavorite={canFavorite}
              isFavorite={isFavorite}
              onToggleFavorite={onToggleFavorite}
            />
          ) : (
            <div className="px-1 text-xs text-[#98A2B3]">В избранном ничего не найдено.</div>
          )}
        </>
      )}
    </div>
  ) : undefined;

  // Карточки «моих» заявок — в левом блоке под вкладками (аналогично избранному)
  const minePanel = isMineTab && userEmail ? (
    <div className="flex flex-col gap-2">
      {mineLoading && <div className="px-1 text-xs text-[#98A2B3]">Загрузка…</div>}
      {mineError && <div className="px-1 text-xs text-[#B42318]">{mineError}</div>}
      {!mineLoading && !mineError && mineEmpty && (
        <div
          className="rounded-2xl bg-white px-4 py-3.5 text-[13px] leading-snug text-[#667085]"
          style={{ border: '1.5px solid #DFE3EB', boxShadow: '0 1px 2px rgba(16,24,40,.05)' }}
        >
          У вас пока нет заявок.
        </div>
      )}
      {!mineLoading && !mineError && !mineEmpty && (
        <>
          <PurchaseTrackerFavoritesSearch
            query={mineQuery}
            onQueryChange={onMineQueryChange}
            placeholder="Поиск в моих заявках"
          />
          {mineResults.length > 0 ? (
            <PurchaseTrackerResults
              results={mineResults}
              empty={false}
              onSelect={onSelectMine}
              variant="list"
              canFavorite={canFavorite}
              isFavorite={isFavorite}
              onToggleFavorite={onToggleFavorite}
            />
          ) : (
            <div className="px-1 text-xs text-[#98A2B3]">Среди ваших заявок ничего не найдено.</div>
          )}
        </>
      )}
    </div>
  ) : undefined;

  return (
    <div
      className="flex w-full items-start gap-5 px-6 pb-2"
      style={{ background: '#F4F5F9', color: '#101828' }}
    >
      {/* Левый блок: логин + вкладки + карточки «Мои»/«Избранное» */}
      <PurchaseTrackerSidebar
        email={userEmail}
        fullName={userFullName}
        role={userRole}
        loading={authLoading}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      >
        {favoritesPanel}
        {minePanel}
      </PurchaseTrackerSidebar>

      {/* Основная колонка: поиск (среди всех закупок) + результаты/детали */}
      <div className="min-w-0 flex-1">
        <PurchaseTrackerSearch query={query} onQueryChange={onQueryChange} onChipClick={onChipClick} />

        {loading && <div className="px-8 pt-4 text-sm text-[#98A2B3]">Загрузка…</div>}
        {error && <div className="px-8 pt-4 text-sm text-[#B42318]">{error}</div>}

        {!loading && !error && (
          detail ? (
            // Открыта закупка: если есть результаты поиска — колонкой слева, иначе деталь на всю ширину
            hasSearchResults ? (
              <div className="flex items-start gap-4 px-8 pt-4 pb-5">
                <div className="w-[340px] flex-none">
                  <PurchaseTrackerResults
                    results={results}
                    empty={empty}
                    onSelect={onSelect}
                    variant="list"
                    grouped
                    canFavorite={canFavorite}
                    isFavorite={isFavorite}
                    onToggleFavorite={onToggleFavorite}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <PurchaseTrackerDetails detail={detail} />
                </div>
              </div>
            ) : (
              <div className="px-8 pt-4 pb-5">
                <PurchaseTrackerDetails detail={detail} />
              </div>
            )
          ) : idle ? (
            <div className="px-8 pt-6 text-sm text-[#98A2B3]">
              {isFavoritesTab
                ? 'Выберите закупку из избранного слева или найдите любую закупку через поиск.'
                : isMineTab && userEmail
                ? 'Выберите свою заявку слева или найдите любую закупку через поиск.'
                : 'Введите номер заявки, название или ФИО инициатора, чтобы найти закупку.'}
            </div>
          ) : (
            // Есть запрос, закупка не выбрана: сгруппированный вывод (в работе / подписано, заказы / закупки)
            <PurchaseTrackerGroupedResults
              results={results}
              empty={empty}
              onSelect={onSelect}
              canFavorite={canFavorite}
              isFavorite={isFavorite}
              onToggleFavorite={onToggleFavorite}
            />
          )
        )}
      </div>
    </div>
  );
}
