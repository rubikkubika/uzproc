'use client';

import type { CSSProperties } from 'react';
import { purchaserDisplayName } from '@/utils/purchaser';
import { MrStars } from './MrStars';
import {
  badgePadding,
  cfoDisplayName,
  csiAverage,
  formatDateTime,
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
  ratingColor,
} from '../constants/mr-presentation.constants';
import type { MrCsiFeedback } from '../types/mr-presentation.types';

interface MrFeedbackCardProps {
  feedback: MrCsiFeedback;
}

/**
 * Однострочные значения не режем средствами CSS: html2canvas клипует такой
 * элемент по кромке строки и срезает низ глифов. Текст укорачиваем заранее.
 */
const NOWRAP: CSSProperties = { whiteSpace: 'nowrap', minWidth: 0 };

/** Предельные длины однострочных полей карточки, символов. */
const CFO_MAX_CHARS = 28;
const SUBJECT_MAX_CHARS = 38;
const PERSON_MAX_CHARS = 28;
/** Блоки карточки не сжимаются: иначе строки текста схлопываются и обрезаются по высоте. */
const FIXED: CSSProperties = { flexShrink: 0 };

/** Комментарий: высота строки и число строк. Блок фиксирован по высоте и кратен
 *  строке, поэтому обрезка длинного текста всегда проходит по границе строки. */
const COMMENT_LINE_HEIGHT = 26;
const COMMENT_LINES = 4;
const COMMENT_PADDING_Y = 10;
const COMMENT_HEIGHT = COMMENT_LINE_HEIGHT * COMMENT_LINES + COMMENT_PADDING_Y * 2;
const COMMENT_MAX_CHARS = 130;

/** Высота строки футера и запас под перенос «Узпрок» на вторую строку. */
const FOOTER_LINE_HEIGHT = 22;
const FOOTER_LINES = 2;

/** Карточка оценки инициатора (сетка 4×2 на слайде обратной связи). */
export function MrFeedbackCard({ feedback }: MrFeedbackCardProps) {
  const rating = csiAverage(feedback);
  const scores: { label: string; value: number }[] = [
    { label: 'Скорость', value: feedback.speedRating },
    { label: 'Качество', value: feedback.qualityRating },
    { label: 'Закупщик', value: feedback.satisfactionRating },
  ];
  if (feedback.uzprocRating != null) scores.push({ label: 'Узпрок', value: feedback.uzprocRating });

  return (
    <div
      style={{
        background: CARD_BG,
        borderRadius: 20,
        padding: '18px 26px',
        boxSizing: 'border-box',
        boxShadow: CARD_SHADOW,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <div style={{ ...FIXED, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 21, fontWeight: 700, lineHeight: '26px', letterSpacing: '-.01em', fontVariantNumeric: 'tabular-nums' }}>
            {feedback.purchaseRequestInnerId || feedback.idPurchaseRequest || '—'}
          </div>
          <div style={{ fontSize: 18, lineHeight: '24px', color: MUTED }}>{formatDateTime(feedback.createdAt)}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <MrStars value={rating} size={20} />
          <div style={{ fontSize: 24, fontWeight: 800, color: ratingColor(rating) }}>{formatRating(rating)}</div>
        </div>
      </div>

      {feedback.cfo && (
        <div
          style={{
            ...FIXED,
            alignSelf: 'flex-start',
            maxWidth: '100%',
            fontSize: 18,
            lineHeight: 1,
            fontWeight: 600,
            color: PURPLE_DARK,
            background: PURPLE_TINT,
            borderRadius: 8,
            ...badgePadding(18, 8, 12),
            ...NOWRAP,
          }}
        >
          {truncate(cfoDisplayName(feedback.cfo), CFO_MAX_CHARS)}
        </div>
      )}

      {feedback.purchaseRequestSubject && (
        <div style={{ ...FIXED, fontSize: 19, lineHeight: '26px', fontWeight: 500, ...NOWRAP }}>
          {truncate(feedback.purchaseRequestSubject, SUBJECT_MAX_CHARS)}
        </div>
      )}

      <div
        style={{
          ...FIXED,
          display: 'grid',
          gridTemplateColumns: 'auto minmax(0, 1fr)',
          gap: '2px 12px',
          fontSize: 19,
          lineHeight: '26px',
        }}
      >
        <div style={{ color: MUTED }}>Закупщик</div>
        <div style={{ fontWeight: 500, ...NOWRAP }}>{truncate(purchaserDisplayName(feedback.purchaser), PERSON_MAX_CHARS)}</div>
        <div style={{ color: MUTED }}>Оценил</div>
        <div style={{ fontWeight: 500, ...NOWRAP }}>
          {truncate(personDisplayName(feedback.recipientName || feedback.recipient), PERSON_MAX_CHARS) || '—'}
        </div>
      </div>

      {feedback.comment ? (
        <div
          style={{
            flexShrink: 0,
            height: COMMENT_HEIGHT,
            overflow: 'hidden',
            fontSize: 19,
            lineHeight: `${COMMENT_LINE_HEIGHT}px`,
            color: INK,
            background: SLIDE_BG,
            borderRadius: 12,
            padding: '10px 16px',
            boxSizing: 'border-box',
          }}
        >
          {truncate(feedback.comment, COMMENT_MAX_CHARS)}
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
          ...FIXED,
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
          fontSize: 17,
          lineHeight: `${FOOTER_LINE_HEIGHT}px`,
          color: MUTED,
          borderTop: `1px solid ${ROW_DIVIDER}`,
          paddingTop: 10,
          marginTop: 'auto',
          minHeight: FOOTER_LINE_HEIGHT * FOOTER_LINES + 10,
          alignContent: 'flex-start',
        }}
      >
        {scores.map((s) => (
          <div key={s.label}>
            {s.label} <span style={{ fontWeight: 700, color: INK }}>{formatRating(s.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
