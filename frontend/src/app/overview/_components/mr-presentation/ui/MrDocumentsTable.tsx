'use client';

import {
  BRAND,
  CARD_BG,
  CARD_SHADOW,
  FAINT,
  HEAT_LOW,
  HEAT_MID,
  INK,
  MONTH_SHORT,
  MUTED,
  PURPLE_DARK,
  PURPLE_MID,
  PURPLE_TINT,
  ROW_DIVIDER,
  SLIDE_BG,
} from '../constants/mr-presentation.constants';
import type { ContractDocumentsByPersonMonthResponse } from '../../hooks/useContractDocumentsByPersonMonth';

interface MrDocumentsTableProps {
  data: ContractDocumentsByPersonMonthResponse | null;
  /** Максимум строк, помещающихся на слайде. */
  maxRows?: number;
}

/** Заливка ячейки по количеству документов. */
function heatCell(value: number): { text: string; color: string; background: string } {
  if (value === 0) return { text: '—', color: FAINT, background: 'transparent' };
  if (value >= 60) return { text: String(value), color: '#ffffff', background: BRAND };
  if (value >= 40) return { text: String(value), color: INK, background: PURPLE_MID };
  if (value >= 20) return { text: String(value), color: INK, background: HEAT_MID };
  return { text: String(value), color: INK, background: HEAT_LOW };
}

const CELL = {
  padding: '11px 4px',
  textAlign: 'center' as const,
  borderBottom: `1px solid ${ROW_DIVIDER}`,
  fontWeight: 600,
  // Текст в цветной ячейке центрируем без half-leading — иначе в растре
  // цифра заметно смещается к верхней кромке заливки.
  lineHeight: 1,
};

/** Таблица «Кол-во документов по договорникам и месяцам». */
export function MrDocumentsTable({ data, maxRows = 7 }: MrDocumentsTableProps) {
  const rows = (data?.rows ?? []).slice(0, maxRows);
  const monthlyTotals = data?.monthlyTotals ?? Array(12).fill(0);

  return (
    <div
      style={{
        background: CARD_BG,
        borderRadius: 24,
        padding: '28px 32px',
        boxSizing: 'border-box',
        boxShadow: CARD_SHADOW,
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 18 }}>
        Кол-во документов по договорникам и месяцам
      </div>

      {rows.length === 0 ? (
        <div style={{ fontSize: 22, color: FAINT, padding: '40px 0', textAlign: 'center' }}>Нет данных за период</div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '260px repeat(12, 1fr) 90px',
            fontSize: 19,
            fontVariantNumeric: 'tabular-nums',
            borderTop: `1px solid ${ROW_DIVIDER}`,
          }}
        >
          <div style={{ ...CELL, padding: '12px 8px', textAlign: 'left', color: MUTED, fontSize: 17 }}>Договорник</div>
          {MONTH_SHORT.map((m) => (
            <div key={m} style={{ ...CELL, padding: '12px 4px', color: MUTED, fontSize: 17 }}>
              {m}
            </div>
          ))}
          <div style={{ ...CELL, padding: '12px 8px', textAlign: 'right', color: MUTED, fontSize: 17 }}>Итого</div>

          {rows.map((row) => (
            <div key={row.preparedByName} style={{ display: 'contents' }}>
              <div
                style={{
                  ...CELL,
                  padding: '11px 8px',
                  textAlign: 'left',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {row.preparedByName}
              </div>
              {row.monthlyCounts.map((value, i) => {
                const cell = heatCell(value);
                return (
                  <div key={i} style={{ ...CELL, color: cell.color, background: cell.background }}>
                    {cell.text}
                  </div>
                );
              })}
              <div style={{ ...CELL, padding: '11px 8px', textAlign: 'right', fontWeight: 800 }}>{row.total}</div>
            </div>
          ))}

          <div style={{ ...CELL, padding: '12px 8px', textAlign: 'left', fontWeight: 800, background: SLIDE_BG, borderRadius: '10px 0 0 10px' }}>
            Итого
          </div>
          {monthlyTotals.map((value, i) => (
            <div key={i} style={{ ...CELL, fontWeight: 800, background: SLIDE_BG, color: value === 0 ? FAINT : INK }}>
              {value === 0 ? '—' : value}
            </div>
          ))}
          <div
            style={{
              ...CELL,
              padding: '12px 8px',
              textAlign: 'right',
              fontWeight: 800,
              background: PURPLE_TINT,
              color: PURPLE_DARK,
              borderRadius: '0 10px 10px 0',
            }}
          >
            {data?.total ?? 0}
          </div>
        </div>
      )}
    </div>
  );
}
