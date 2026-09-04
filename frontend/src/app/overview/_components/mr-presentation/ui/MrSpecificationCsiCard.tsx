'use client';

import { MrStars } from './MrStars';
import { formatRating, ratingsLabel } from '../utils/mrPresentationFormat';
import { INK } from '../constants/mr-presentation.constants';
import type { SpecificationFeedbackDashboard } from '@/utils/specification-feedback.api';

interface MrSpecificationCsiCardProps {
  data: SpecificationFeedbackDashboard | null;
}

function Row({ label, value }: { label: string; value: number | null }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(255,255,255,.08)',
        borderRadius: 14,
        padding: '14px 20px',
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 500, lineHeight: 1 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <MrStars value={value} size={18} />
        <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1, width: 44, textAlign: 'right' }}>{formatRating(value)}</div>
      </div>
    </div>
  );
}

/** Тёмная карточка «Оценка инициаторов» по спецификациям. */
export function MrSpecificationCsiCard({ data }: MrSpecificationCsiCardProps) {
  const hasData = !!data && data.count > 0;

  return (
    <div
      style={{
        background: INK,
        color: '#ffffff',
        borderRadius: 24,
        padding: '32px 36px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,.7)',
          }}
        >
          Оценка инициаторов
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 6 }}>
          <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1 }}>
            {hasData ? formatRating(data!.avgOverall) : '—'}
          </div>
          <div style={{ fontSize: 22, color: 'rgba(255,255,255,.7)' }}>
            {hasData ? ratingsLabel(data!.count) : 'нет оценок'}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        <Row label="Скорость" value={data?.avgSpeed ?? null} />
        <Row label="Работа исполнителя" value={data?.avgBusiness ?? null} />
        <Row label="Общая оценка" value={data?.avgOverall ?? null} />
      </div>
    </div>
  );
}
