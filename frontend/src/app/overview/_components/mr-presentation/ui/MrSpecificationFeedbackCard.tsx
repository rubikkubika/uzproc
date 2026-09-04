'use client';

import { MrStars } from './MrStars';
import {
  badgePadding,
  cfoDisplayName,
  formatAmountShort,
  formatDate,
  formatRating,
  personDisplayName,
  truncate,
} from '../utils/mrPresentationFormat';
import {
  CARD_BG,
  CARD_SHADOW,
  FAINT,
  INK,
  LINE,
  MUTED,
  PURPLE_DARK,
  PURPLE_TINT,
  ROW_DIVIDER,
  SLIDE_BG,
} from '../constants/mr-presentation.constants';
import type { SpecificationFeedbackDashboardCard } from '../types/mr-presentation.types';

/** Комментарий: блок кратен строке, поэтому обрезка проходит по её границе. */
const COMMENT_LINE_HEIGHT = 24;
const COMMENT_LINES = 5;
const COMMENT_HEIGHT = COMMENT_LINE_HEIGHT * COMMENT_LINES + 20;
const COMMENT_MAX_CHARS = 118;
/** Предельная длина названия ЦФО в чипе, символов. */
const CFO_MAX_CHARS = 16;
/** Предельная длина имени оценившего, символов. */
const RATED_BY_MAX_CHARS = 24;

interface MrSpecificationFeedbackCardProps {
  card: SpecificationFeedbackDashboardCard;
}

/** Карточка оценки работы закупок по спецификациям. */
export function MrSpecificationFeedbackCard({ card }: MrSpecificationFeedbackCardProps) {
  return (
    <div
      style={{
        background: CARD_BG,
        borderRadius: 20,
        padding: '22px 26px',
        boxSizing: 'border-box',
        boxShadow: CARD_SHADOW,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div
          style={{
            fontSize: 17,
            lineHeight: 1,
            fontWeight: 600,
            color: PURPLE_DARK,
            background: PURPLE_TINT,
            borderRadius: 8,
            ...badgePadding(17, 8, 12),
            whiteSpace: 'nowrap',
            minWidth: 0,
          }}
        >
          {truncate(cfoDisplayName(card.cfoName), CFO_MAX_CHARS) || '—'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <MrStars value={card.overall} size={16} gap={1} />
          <div style={{ fontSize: 22, fontWeight: 800 }}>{formatRating(card.overall)}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', fontSize: 17, flexShrink: 0, minWidth: 0 }}>
        <span style={{ color: MUTED, flexShrink: 0 }}>Оценил</span>
        <span style={{ fontWeight: 500, whiteSpace: 'nowrap', minWidth: 0 }}>
          {truncate(personDisplayName(card.ratedBy), RATED_BY_MAX_CHARS) || '—'}
        </span>
      </div>

      {card.comment ? (
        <div
          style={{
            flexShrink: 0,
            height: COMMENT_HEIGHT,
            overflow: 'hidden',
            fontSize: 19,
            lineHeight: `${COMMENT_LINE_HEIGHT}px`,
            background: SLIDE_BG,
            borderRadius: 12,
            padding: '10px 16px',
            boxSizing: 'border-box',
          }}
        >
          {truncate(card.comment, COMMENT_MAX_CHARS)}
        </div>
      ) : (
        <div
          style={{
            flexShrink: 0,
            height: COMMENT_HEIGHT,
            fontSize: 18,
            lineHeight: `${COMMENT_LINE_HEIGHT}px`,
            color: FAINT,
            border: `1.5px dashed ${LINE}`,
            borderRadius: 12,
            padding: '10px 16px',
            boxSizing: 'border-box',
          }}
        >
          Комментария нет
        </div>
      )}

      <div
        style={{
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
          fontSize: 17,
          color: MUTED,
          borderTop: `1px solid ${ROW_DIVIDER}`,
          paddingTop: 12,
          flexShrink: 0,
        }}
      >
        <div>
          Скорость <span style={{ fontWeight: 700, color: INK }}>{formatRating(card.speedRating)}</span>
        </div>
        <div>
          Исполнитель <span style={{ fontWeight: 700, color: INK }}>{formatRating(card.businessRating)}</span>
        </div>
        <div>
          Спец. <span style={{ fontWeight: 700, color: INK }}>{card.specificationCount ?? '—'}</span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexShrink: 0, marginTop: 'auto' }}>
        <div style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          <span style={{ fontSize: 15, color: MUTED, fontWeight: 500 }}>Сумма</span> {formatAmountShort(card.totalAmount)}
        </div>
        {card.ratedAt && <div style={{ fontSize: 16, color: FAINT }}>оценено {formatDate(card.ratedAt)}</div>}
      </div>
    </div>
  );
}
