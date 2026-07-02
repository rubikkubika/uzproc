import type { ResultView } from '../types/purchase-tracker.types';
import KindBadge from './KindBadge';

interface PurchaseTrackerResultCardProps {
  result: ResultView;
  onSelect: (id: number) => void;
  /** grid — фиксированная ширина карточки; list — на всю ширину колонки */
  variant?: 'grid' | 'list';
}

/** Карточка закупки в результатах поиска */
export default function PurchaseTrackerResultCard({ result, onSelect, variant = 'grid' }: PurchaseTrackerResultCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(result.id)}
      className={`flex cursor-pointer flex-col gap-[9px] rounded-2xl bg-white p-4 text-left ${
        variant === 'grid' ? 'w-[281px]' : 'w-full'
      }`}
      style={{ border: `1.5px solid ${result.border}`, boxShadow: result.shadow }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5">
          <span className="rounded-md bg-[#F2F4F7] px-2 py-[3px] text-xs font-bold text-[#475467]">
            № {result.id}
          </span>
          <KindBadge kind={result.kind} />
        </span>
        <span
          className="whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
          style={{ color: result.pillFg, background: result.pillBg }}
        >
          {result.statusShort}
        </span>
      </div>
      <div className="min-h-[36px] overflow-hidden text-[13.5px] font-semibold leading-[1.35] text-[#101828] line-clamp-2">
        {result.title}
      </div>
      <div className="flex justify-between text-xs text-[#667085]">
        <span>{result.budget}</span>
        <span>{result.initiator}</span>
      </div>
      <div className="flex gap-[5px]">
        {result.dots.map((dot, i) => (
          <div key={i} className="h-[5px] flex-1 rounded-[3px]" style={{ background: dot.bg }} />
        ))}
      </div>
    </button>
  );
}
