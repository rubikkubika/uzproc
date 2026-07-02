'use client';

import { usePurchaseTracker } from './hooks/usePurchaseTracker';
import PurchaseTrackerDetails from './ui/PurchaseTrackerDetails';
import PurchaseTrackerResults from './ui/PurchaseTrackerResults';
import PurchaseTrackerSearch from './ui/PurchaseTrackerSearch';

interface PurchaseTrackerProps {
  /** Показывать упрощённые названия ролей вместо официальных */
  simpleLanguage?: boolean;
  /** Показывать баннер прогноза даты договора */
  showForecast?: boolean;
}

/**
 * Страница «Трекер закупок» (вариант 1a «Трек-лента»).
 * Инициатор ищет свою закупку → карточки → детальная трек-лента.
 */
export default function PurchaseTracker({ simpleLanguage = true, showForecast = true }: PurchaseTrackerProps) {
  const { query, onQueryChange, onChipClick, onSelect, results, empty, idle, loading, error, detail } =
    usePurchaseTracker({ simpleLanguage, showForecast });

  return (
    <div className="mx-auto w-full max-w-[960px] pb-2" style={{ background: '#F4F5F9', color: '#101828' }}>
      <PurchaseTrackerSearch query={query} onQueryChange={onQueryChange} onChipClick={onChipClick} />

      {loading && <div className="px-8 pt-4 text-sm text-[#98A2B3]">Загрузка…</div>}
      {error && <div className="px-8 pt-4 text-sm text-[#B42318]">{error}</div>}
      {idle && !loading && (
        <div className="px-8 pt-6 text-sm text-[#98A2B3]">
          Введите номер заявки, название или ФИО инициатора, чтобы найти закупку.
        </div>
      )}

      {!loading && !error && !idle && (
        detail ? (
          // Выбрана закупка: карточки колонкой слева, детали справа
          <div className="flex items-start gap-4 px-8 pt-4 pb-5">
            <div className="w-[300px] flex-none">
              <PurchaseTrackerResults results={results} empty={empty} onSelect={onSelect} variant="list" />
            </div>
            <div className="min-w-0 flex-1">
              <PurchaseTrackerDetails detail={detail} />
            </div>
          </div>
        ) : (
          // Ничего не выбрано: карточки сеткой
          <PurchaseTrackerResults results={results} empty={empty} onSelect={onSelect} variant="grid" />
        )
      )}
    </div>
  );
}
