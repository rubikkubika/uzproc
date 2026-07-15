import { EMPTY_TEXT } from '../constants/purchase-tracker.constants';
import type { ResultView } from '../types/purchase-tracker.types';
import { groupResultsByStatus, type ResultGroupKey } from '../utils/purchase-tracker.utils';
import PurchaseTrackerResultCard from './PurchaseTrackerResultCard';

interface PurchaseTrackerResultsProps {
  results: ResultView[];
  empty: boolean;
  onSelect: (id: number) => void;
  /** grid — карточки сеткой (ничего не выбрано); list — колонкой (детали открыты) */
  variant?: 'grid' | 'list';
  /** Группировать карточки по статусу («В работе» → «Подписано» → «Архив»); только для variant="list" */
  grouped?: boolean;
  /** Текст пустого состояния (по умолчанию — «ничего не найдено») */
  emptyText?: string;
  /** Показывать «звёздочку» избранного на карточках */
  canFavorite?: boolean;
  /** Проверка: закупка в избранном */
  isFavorite?: (id: number) => boolean;
  /** Переключить избранное */
  onToggleFavorite?: (id: number) => void;
}

/** Порядок и заголовки групп для сгруппированного списка */
const GROUP_ORDER: { key: ResultGroupKey; title: string; accent: string }[] = [
  { key: 'inWork', title: 'В работе', accent: '#EE9A2E' },
  { key: 'signed', title: 'Подписано', accent: '#22C55E' },
  { key: 'archived', title: 'Архив', accent: '#9CA3AF' },
];

/** Список/сетка карточек результатов поиска */
export default function PurchaseTrackerResults({
  results,
  empty,
  onSelect,
  variant = 'grid',
  grouped = false,
  emptyText = EMPTY_TEXT,
  canFavorite = false,
  isFavorite,
  onToggleFavorite,
}: PurchaseTrackerResultsProps) {
  const renderCard = (result: ResultView) => (
    <PurchaseTrackerResultCard
      key={result.id}
      result={result}
      onSelect={onSelect}
      variant={variant}
      canFavorite={canFavorite}
      isFavorite={isFavorite?.(result.id) ?? false}
      onToggleFavorite={onToggleFavorite}
    />
  );

  // Сгруппированный список (при открытых деталях): «В работе» → «Подписано» → «Архив»
  if (grouped && variant === 'list') {
    const groups = groupResultsByStatus(results);
    return (
      <div className="flex flex-col gap-5">
        {GROUP_ORDER.map(({ key, title, accent }) => {
          const items = groups[key];
          if (items.length === 0) return null;
          return (
            <div key={key} className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
                <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#98A0AE]">{title}</span>
                <span
                  className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold"
                  style={{ background: '#E6E9EF', color: '#6B7280' }}
                >
                  {items.length}
                </span>
              </div>
              {items.map(renderCard)}
            </div>
          );
        })}
        {empty && <div className="p-7 text-sm text-[#98A2B3]">{emptyText}</div>}
      </div>
    );
  }

  const wrapperClass = variant === 'grid' ? 'flex flex-wrap gap-3 px-8 pt-4' : 'flex flex-col gap-3';

  return (
    <div className={wrapperClass}>
      {results.map(renderCard)}
      {empty && <div className="p-7 text-sm text-[#98A2B3]">{emptyText}</div>}
    </div>
  );
}
