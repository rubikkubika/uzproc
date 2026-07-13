'use client';

import { useState } from 'react';
import { EMPTY_TEXT } from '../constants/purchase-tracker.constants';
import type { ResultView } from '../types/purchase-tracker.types';
import { isPurchaseKind } from '../utils/purchase-tracker.utils';
import PurchaseTrackerResultCard from './PurchaseTrackerResultCard';

/** Сколько карточек показывать в колонке до нажатия «Загрузить остальное» */
const COLUMN_LIMIT = 6;

interface CardHandlers {
  onSelect: (id: number) => void;
  canFavorite: boolean;
  isFavorite?: (id: number) => boolean;
  onToggleFavorite?: (id: number) => void;
}

interface BlockTone {
  /** Акцент полосы слева и точки в шапке */
  accent: string;
  /** Цвет текста названия группы */
  headerFg: string;
  /** Фон пилюли-счётчика группы */
  pillBg: string;
}

interface PurchaseTrackerGroupedResultsProps extends CardHandlers {
  results: ResultView[];
  empty: boolean;
  emptyText?: string;
}

/** Подраздел одного типа («Заказы» или «Закупки») */
function ResultColumn({
  title,
  items,
  total,
  handlers,
  wrap = false,
}: {
  title: string;
  items: ResultView[];
  total: number;
  handlers: CardHandlers;
  /** true — карточки переносятся в несколько рядов (на всю ширину блока); false — один столбец */
  wrap?: boolean;
}) {
  return (
    <div className="min-w-0 flex-1">
      {/* Заголовок подраздела: лейбл + счётчик-пилюля */}
      <div className="mb-4 flex items-center gap-[9px]">
        <span className="text-[12px] font-bold uppercase tracking-[0.07em] text-[#98A0AE]">{title}</span>
        <span
          className="inline-flex h-[21px] min-w-[21px] items-center justify-center rounded-full px-1.5 text-[12px] font-bold"
          style={{ background: '#E6E9EF', color: '#6B7280' }}
        >
          {total}
        </span>
      </div>
      {total === 0 ? (
        <div className="p-0.5 text-[26px] leading-none text-[#C2C8D2]">—</div>
      ) : (
        <div className={wrap ? 'flex flex-wrap gap-3' : 'flex flex-col gap-3'}>
          {items.map((result) => (
            <PurchaseTrackerResultCard
              key={result.id}
              result={result}
              variant="grid"
              onSelect={handlers.onSelect}
              canFavorite={handlers.canFavorite}
              isFavorite={handlers.isFavorite?.(result.id) ?? false}
              onToggleFavorite={handlers.onToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Группа «В работе» либо «Подписано»: полоса-акцент слева + две колонки с hairline-разделителем */
function ResultBlock({
  title,
  tone,
  items,
  handlers,
}: {
  title: string;
  tone: BlockTone;
  items: ResultView[];
  handlers: CardHandlers;
}) {
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) return null;

  // Заказы — слева, закупки — справа; порядок внутри сохраняем (сортировка «как сейчас»)
  const orders = items.filter((r) => !isPurchaseKind(r.kind));
  const purchases = items.filter((r) => isPurchaseKind(r.kind));

  const hiddenTotal = Math.max(0, orders.length - COLUMN_LIMIT) + Math.max(0, purchases.length - COLUMN_LIMIT);

  const visibleOrders = expanded ? orders : orders.slice(0, COLUMN_LIMIT);
  const visiblePurchases = expanded ? purchases : purchases.slice(0, COLUMN_LIMIT);

  return (
    <section className="flex gap-5">
      {/* Тонкая вертикальная полоса-акцент слева (тянется на всю высоту группы) */}
      <div className="w-1 flex-shrink-0 rounded-full" style={{ background: tone.accent }} />

      <div className="min-w-0 flex-1">
        {/* Компактная шапка группы: точка + название + счётчик */}
        <div className="mb-[26px] flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: tone.accent }} />
          <h3 className="text-[17px] font-extrabold uppercase tracking-[0.05em]" style={{ color: tone.headerFg }}>
            {title}
          </h3>
          <span
            className="inline-flex h-[26px] min-w-[26px] items-center justify-center rounded-full px-[9px] text-[14px] font-bold"
            style={{ background: tone.pillBg, color: tone.headerFg }}
          >
            {items.length}
          </span>
        </div>

        {/* Тело группы: если один из подразделов пуст — другой занимает всю ширину; иначе «Заказы» | hairline | «Закупки» */}
        {orders.length === 0 ? (
          <ResultColumn title="Закупки" items={visiblePurchases} total={purchases.length} handlers={handlers} wrap />
        ) : purchases.length === 0 ? (
          <ResultColumn title="Заказы" items={visibleOrders} total={orders.length} handlers={handlers} wrap />
        ) : (
          <div className="flex items-stretch">
            <div className="min-w-0 flex-1 pr-4">
              <ResultColumn title="Заказы" items={visibleOrders} total={orders.length} handlers={handlers} />
            </div>
            <div className="w-px flex-shrink-0" style={{ background: '#E1E4EA' }} />
            <div className="min-w-0 flex-1 pl-4">
              <ResultColumn title="Закупки" items={visiblePurchases} total={purchases.length} handlers={handlers} />
            </div>
          </div>
        )}

        {hiddenTotal > 0 && (
          <div className="pt-4">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mx-auto block cursor-pointer rounded-full border border-[#DFE3EB] bg-white px-4 py-1.5 text-xs font-semibold text-[#475467] hover:bg-[#F2F4F7]"
            >
              {expanded ? 'Свернуть' : `Загрузить остальное (${hiddenTotal})`}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

/** Тона выделенных групп */
const TONE_IN_WORK: BlockTone = { accent: '#EE9A2E', headerFg: '#B4741B', pillBg: '#FBEBD3' };
const TONE_SIGNED: BlockTone = { accent: '#22C55E', headerFg: '#15803D', pillBg: '#D6F3E0' };
const TONE_ARCHIVE: BlockTone = { accent: '#9CA3AF', headerFg: '#6B7280', pillBg: '#E5E7EB' };

/**
 * Сгруппированные результаты поиска трекера:
 * сверху группа «В работе», ниже — «Подписано», затем серая «Архив» (терминальные/скрытые);
 * в каждой группе заказы слева, закупки справа, разделены тонким вертикальным hairline-разделителем.
 */
export default function PurchaseTrackerGroupedResults({
  results,
  empty,
  emptyText = EMPTY_TEXT,
  onSelect,
  canFavorite,
  isFavorite,
  onToggleFavorite,
}: PurchaseTrackerGroupedResultsProps) {
  const handlers: CardHandlers = { onSelect, canFavorite, isFavorite, onToggleFavorite };

  // «Архив» имеет приоритет: терминальные/скрытые заявки не попадают в «В работе»/«Подписано».
  const archived = results.filter((r) => r.archived);
  const inWork = results.filter((r) => !r.archived && !r.done);
  const signed = results.filter((r) => !r.archived && r.done);

  if (empty) {
    return <div className="px-8 pt-4 pb-5 text-sm text-[#98A2B3]">{emptyText}</div>;
  }

  return (
    <div className="flex flex-col gap-12 px-5 pt-4 pb-5">
      <ResultBlock title="В работе" tone={TONE_IN_WORK} items={inWork} handlers={handlers} />
      <ResultBlock title="Подписано" tone={TONE_SIGNED} items={signed} handlers={handlers} />
      <ResultBlock title="Архив" tone={TONE_ARCHIVE} items={archived} handlers={handlers} />
    </div>
  );
}
