import { EMPTY_TEXT } from '../constants/purchase-tracker.constants';
import type { ResultView } from '../types/purchase-tracker.types';
import PurchaseTrackerResultCard from './PurchaseTrackerResultCard';

interface PurchaseTrackerResultsProps {
  results: ResultView[];
  empty: boolean;
  onSelect: (id: number) => void;
  /** grid — карточки сеткой (ничего не выбрано); list — колонкой (детали открыты) */
  variant?: 'grid' | 'list';
}

/** Список/сетка карточек результатов поиска */
export default function PurchaseTrackerResults({ results, empty, onSelect, variant = 'grid' }: PurchaseTrackerResultsProps) {
  const wrapperClass = variant === 'grid' ? 'flex flex-wrap gap-3 px-8 pt-4' : 'flex flex-col gap-3';

  return (
    <div className={wrapperClass}>
      {results.map((result) => (
        <PurchaseTrackerResultCard key={result.id} result={result} onSelect={onSelect} variant={variant} />
      ))}
      {empty && <div className="p-7 text-sm text-[#98A2B3]">{EMPTY_TEXT}</div>}
    </div>
  );
}
