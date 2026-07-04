import type { ResultView } from '../types/purchase-tracker.types';
import KindBadge from './KindBadge';
import { StarIcon } from './icons';

interface PurchaseTrackerResultCardProps {
  result: ResultView;
  onSelect: (id: number) => void;
  /** grid — фиксированная ширина карточки; list — на всю ширину колонки */
  variant?: 'grid' | 'list';
  /** Показывать «звёздочку» избранного (пользователь залогинен) */
  canFavorite?: boolean;
  /** Закупка в избранном */
  isFavorite?: boolean;
  /** Переключить избранное */
  onToggleFavorite?: (id: number) => void;
}

/** Карточка закупки в результатах поиска */
export default function PurchaseTrackerResultCard({
  result,
  onSelect,
  variant = 'grid',
  canFavorite = false,
  isFavorite = false,
  onToggleFavorite,
}: PurchaseTrackerResultCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(result.id)}
      className={`flex cursor-pointer flex-col gap-[9px] rounded-2xl bg-white p-4 text-left ${
        variant === 'grid' ? 'w-[340px]' : 'w-full'
      }`}
      style={{ border: `1.5px solid ${result.border}`, boxShadow: result.shadow }}
    >
      {/* Строка 1: номер + тип слева, статус на том же уровне справа (одной строкой), звёздочка с краю */}
      <div className="flex items-center justify-between gap-2">
        <span className="flex flex-none items-center gap-1.5">
          <span className="whitespace-nowrap rounded-md bg-[#F2F4F7] px-2 py-[3px] text-xs font-bold text-[#475467]">
            № {result.id}
          </span>
          <KindBadge kind={result.kind} />
        </span>
        <span className="flex flex-none items-center gap-1.5">
          <span
            className="whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ color: result.pillFg, background: result.pillBg }}
          >
            {result.statusShort}
          </span>
          {canFavorite && (
            <span
              role="button"
              tabIndex={0}
              aria-label={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
              title={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite?.(result.id);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleFavorite?.(result.id);
                }
              }}
              className="flex h-6 w-6 flex-none cursor-pointer items-center justify-center rounded-full hover:bg-[#F2F4F7]"
            >
              <StarIcon
                size={17}
                color={isFavorite ? '#F59E0B' : '#98A2B3'}
                fill={isFavorite ? '#F59E0B' : 'none'}
              />
            </span>
          )}
        </span>
      </div>

      <div className="min-h-[36px] overflow-hidden text-[13.5px] font-semibold leading-[1.35] text-[#101828] line-clamp-2">
        {result.title}
      </div>

      {/* Сумма — бейджик, ФИО инициатора справа (обрезается по ширине) */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="whitespace-nowrap rounded-md bg-[#F2F4F7] px-2 py-[3px] font-semibold text-[#475467]">
          {result.budget}
        </span>
        <span className="min-w-0 truncate text-right text-[#667085]" title={result.initiator}>
          {result.initiator}
        </span>
      </div>

      {/* Полоски статуса с названиями этапов */}
      <div className="flex gap-[5px]">
        {result.dots.map((dot, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div className="h-[5px] w-full rounded-[3px]" style={{ background: dot.bg }} />
            <span
              className="text-center text-[9px] leading-[1.15]"
              style={{ color: dot.fg }}
            >
              {dot.label}
            </span>
          </div>
        ))}
      </div>
    </button>
  );
}
