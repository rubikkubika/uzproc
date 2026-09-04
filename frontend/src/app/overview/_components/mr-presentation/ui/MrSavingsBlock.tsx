'use client';

import type { CSSProperties } from 'react';
import { MrFactChip, MrKpiHeader, MrTargetChip } from './MrKpiChips';
import { formatMoney, purchasesLabel } from '../utils/mrPresentationFormat';
import {
  BRAND,
  CARD_BG,
  CARD_SHADOW,
  FAINT,
  INK,
  MUTED,
  PURPLE_DARK,
  PURPLE_TINT,
  SAVINGS_TARGET_PERCENT,
  SLIDE_BG,
} from '../constants/mr-presentation.constants';
import type { SavingsData } from '../../hooks/useOverviewSavingsData';

interface MrSavingsBlockProps {
  data: SavingsData | null;
}

const LABEL: CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  letterSpacing: '.04em',
  textTransform: 'uppercase',
  color: MUTED,
  whiteSpace: 'nowrap',
};

const VALUE: CSSProperties = {
  fontSize: 30,
  fontWeight: 800,
  letterSpacing: '-.02em',
  lineHeight: 1.1,
  marginTop: 6,
  whiteSpace: 'nowrap',
};

const SUB: CSSProperties = { fontSize: 17, color: MUTED, marginTop: 4, whiteSpace: 'nowrap' };
const SIGN: CSSProperties = { fontSize: 28, color: FAINT, textAlign: 'center', fontWeight: 600, alignSelf: 'center' };

function TermCard({ label, value, count, accent }: { label: string; value: string; count: number; accent?: boolean }) {
  return (
    <div
      style={{
        background: accent ? CARD_BG : SLIDE_BG,
        border: accent ? `2px solid ${BRAND}` : 'none',
        borderRadius: 16,
        padding: '14px 18px',
      }}
    >
      <div style={{ ...LABEL, color: accent ? PURPLE_DARK : MUTED }}>{label}</div>
      <div style={{ ...VALUE, fontSize: accent ? 32 : 30 }}>{value}</div>
      <div style={SUB}>{purchasesLabel(count)}</div>
    </div>
  );
}

/** Блок «Экономия» на слайде основных KPI. */
export function MrSavingsBlock({ data }: MrSavingsBlockProps) {
  const percent = data && data.totalBudget > 0 ? (data.totalSavings / data.totalBudget) * 100 : null;

  return (
    <div
      style={{
        background: CARD_BG,
        borderRadius: 24,
        padding: '36px 40px',
        boxSizing: 'border-box',
        boxShadow: CARD_SHADOW,
      }}
    >
      <MrKpiHeader title="Экономия">
        <MrTargetChip>{SAVINGS_TARGET_PERCENT}% от бюджета закупок</MrTargetChip>
        {percent != null && <MrFactChip ok={percent >= SAVINGS_TARGET_PERCENT}>{percent.toFixed(1)}%</MrFactChip>}
      </MrKpiHeader>

      {!data ? (
        <div style={{ fontSize: 22, color: FAINT, padding: '40px 0' }}>Нет данных за период</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 20 }}>
            <div style={{ background: INK, color: '#ffffff', borderRadius: 18, padding: '22px 26px' }}>
              <div style={{ ...LABEL, fontSize: 18, letterSpacing: '.08em', color: 'rgba(255,255,255,.7)' }}>
                Бюджет закупок
              </div>
              <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.1, marginTop: 8 }}>
                {formatMoney(data.totalBudget)}
              </div>
              <div style={{ fontSize: 20, color: 'rgba(255,255,255,.7)', marginTop: 6 }}>
                {purchasesLabel(data.totalBudgetCount)}
              </div>
            </div>

            <div style={{ background: PURPLE_TINT, color: INK, borderRadius: 18, padding: '22px 26px' }}>
              <div style={{ ...LABEL, fontSize: 18, letterSpacing: '.08em', color: PURPLE_DARK }}>% экономии</div>
              <div
                style={{
                  fontSize: 52,
                  fontWeight: 800,
                  letterSpacing: '-.02em',
                  lineHeight: 1.1,
                  marginTop: 8,
                  color: PURPLE_DARK,
                }}
              >
                {percent != null ? `${percent.toFixed(1)}%` : '—'}
              </div>
              <div style={{ fontSize: 20, color: MUTED, marginTop: 6 }}>от бюджета закупок</div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.1fr 20px 1fr 20px 1fr 20px 1fr',
              gap: 8,
              alignItems: 'stretch',
            }}
          >
            <TermCard accent label="Общая экономия" value={formatMoney(data.totalSavings)} count={data.totalCount} />
            <div style={SIGN}>=</div>
            <TermCard label="От медианы" value={formatMoney(data.savingsFromMedian)} count={data.fromMedianCount} />
            <div style={SIGN}>+</div>
            <TermCard
              label="От сущ. договора"
              value={formatMoney(data.savingsFromExistingContract)}
              count={data.fromExistingContractCount}
            />
            <div style={SIGN}>+</div>
            <TermCard label="Комбинированный" value={formatMoney(data.savingsUntyped)} count={data.untypedCount} />
          </div>
        </>
      )}
    </div>
  );
}
