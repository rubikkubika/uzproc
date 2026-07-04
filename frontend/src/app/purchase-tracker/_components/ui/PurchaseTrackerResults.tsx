import { EMPTY_TEXT } from '../constants/purchase-tracker.constants';
import type { ResultView } from '../types/purchase-tracker.types';
import PurchaseTrackerResultCard from './PurchaseTrackerResultCard';

interface PurchaseTrackerResultsProps {
  results: ResultView[];
  empty: boolean;
  onSelect: (id: number) => void;
  /** grid — карточки сеткой (ничего не выбрано); list — колонкой (детали открыты) */
  variant?: 'grid' | 'list';
  /** Текст пустого состояния (по умолчанию — «ничего не найдено») */
  emptyText?: string;
  /** Показывать «звёздочку» избранного на карточках */
  canFavorite?: boolean;
  /** Проверка: закупка в избранном */
  isFavorite?: (id: number) => boolean;
  /** Переключить избранное */
  onToggleFavorite?: (id: number) => void;
}

/** Список/сетка карточек результатов поиска */
export default function PurchaseTrackerResults({
  results,
  empty,
  onSelect,
  variant = 'grid',
  emptyText = EMPTY_TEXT,
  canFavorite = false,
  isFavorite,
  onToggleFavorite,
}: PurchaseTrackerResultsProps) {
  const wrapperClass = variant === 'grid' ? 'flex flex-wrap gap-3 px-8 pt-4' : 'flex flex-col gap-3';

  return (
    <div className={wrapperClass}>
      {results.map((result) => (
        <PurchaseTrackerResultCard
          key={result.id}
          result={result}
          onSelect={onSelect}
          variant={variant}
          canFavorite={canFavorite}
          isFavorite={isFavorite?.(result.id) ?? false}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
      {empty && <div className="p-7 text-sm text-[#98A2B3]">{emptyText}</div>}
    </div>
  );
}
