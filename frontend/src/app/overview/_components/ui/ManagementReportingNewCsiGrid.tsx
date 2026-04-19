'use client';

import { useState, useEffect, useRef } from 'react';
import { getBackendUrl } from '@/utils/api';
import { purchaserDisplayName } from '@/utils/purchaser';

/* ─── Design tokens ────────────────────────────────────────────────────── */
const T = {
  bg: 'oklch(0.985 0.003 80)',
  text: 'oklch(0.18 0.005 80)',
  muted: 'oklch(0.50 0.005 80)',
  faint: 'oklch(0.72 0.005 80)',
  line: 'oklch(0.92 0.004 80)',
  accent: 'oklch(0.72 0.15 65)',
  success: 'oklch(0.68 0.13 150)',
  warn: 'oklch(0.72 0.16 50)',
  danger: 'oklch(0.65 0.20 25)',
};
const font = `'Inter Tight', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif`;
const mono = `'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace`;

/* ─── Types ────────────────────────────────────────────────────────────── */
interface CsiFeedbackDto {
  id: number;
  purchaseRequestInnerId: string;
  idPurchaseRequest: number | null;
  purchaseRequestSubject?: string;
  purchaser?: string;
  cfo?: string;
  uzprocRating?: number;
  speedRating: number;
  qualityRating: number;
  satisfactionRating: number;
  comment?: string;
  recipient?: string;
  recipientName?: string;
  createdAt: string;
}

/* ─── Helpers ──────────────────────────────────────────────────────────── */
function avgRating(f: CsiFeedbackDto): number {
  const r = [f.speedRating, f.qualityRating, f.satisfactionRating];
  if (f.uzprocRating) r.push(f.uzprocRating);
  return r.reduce((a, b) => a + (b || 0), 0) / r.length;
}

function fmtDate(s: string) {
  const d = new Date(s);
  return {
    date: d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    time: d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
  };
}

/* ─── RatingBar ────────────────────────────────────────────────────────── */
function RatingBar({ value }: { value: number }) {
  const color = value >= 4.5 ? T.success : value >= 3.5 ? T.warn : T.danger;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 64, height: 4, background: T.line, borderRadius: 2, position: 'relative' }}>
        <div style={{
          position: 'absolute', inset: 0, width: `${(value / 5) * 100}%`,
          background: color, borderRadius: 2,
        }} />
      </div>
      <div style={{
        fontSize: 13, fontWeight: 600, color: T.text,
        fontFamily: mono, fontVariantNumeric: 'tabular-nums',
      }}>
        {value.toFixed(1)}
      </div>
    </div>
  );
}

/* ─── CSICard ──────────────────────────────────────────────────────────── */
function CsiCard({ card }: { card: CsiFeedbackDto }) {
  const rating = avgRating(card);
  const { date, time } = fmtDate(card.createdAt);
  const details: Record<string, number> = {
    Скорость: card.speedRating,
    Качество: card.qualityRating,
    Закупщик: card.satisfactionRating,
    ...(card.uzprocRating != null ? { Узпрок: card.uzprocRating } : {}),
  };

  return (
    <div style={{
      padding: '20px 24px',
      borderRight: `1px solid ${T.line}`,
      borderBottom: `1px solid ${T.line}`,
      display: 'flex', flexDirection: 'column', gap: 10,
      fontFamily: font,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <div style={{ fontSize: 10, color: T.faint, fontFamily: mono, marginBottom: 3 }}>
            {card.purchaseRequestInnerId || card.idPurchaseRequest || '—'}
          </div>
          <div style={{ fontSize: 10, color: T.muted, fontFamily: mono }}>
            {date} · {time}
          </div>
        </div>
        <RatingBar value={rating} />
      </div>

      {/* Category + title */}
      <div>
        {card.cfo && (
          <div style={{
            display: 'inline-block', fontSize: 10, fontWeight: 500,
            color: T.muted, padding: '2px 6px',
            border: `1px solid ${T.line}`,
            marginBottom: 6,
          }}>
            {card.cfo}
          </div>
        )}
        <div style={{ fontSize: 13, fontWeight: 500, color: T.text, lineHeight: 1.35 }}>
          {card.purchaseRequestSubject || '—'}
        </div>
      </div>

      {/* Meta */}
      <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5 }}>
        {card.purchaser && (
          <div>Закупщик: <span style={{ color: T.text }}>{purchaserDisplayName(card.purchaser)}</span></div>
        )}
        {card.recipient && (
          <div>Оценил: <span style={{ color: T.text, fontFamily: mono, fontSize: 10 }}>
            {card.recipientName || card.recipient}
          </span></div>
        )}
      </div>

      {/* Comment */}
      {card.comment ? (
        <div style={{
          fontSize: 11, color: T.text, padding: '8px 10px',
          background: T.bg, borderLeft: `2px solid ${T.accent}`,
          fontStyle: 'italic', lineHeight: 1.45,
        }}>
          «{card.comment}»
        </div>
      ) : (
        <div style={{ fontSize: 10, color: T.faint, fontStyle: 'italic' }}>без комментария</div>
      )}

      {/* Detail breakdown */}
      <div style={{
        display: 'flex', gap: 12, flexWrap: 'wrap',
        paddingTop: 8, borderTop: `1px dashed ${T.line}`,
      }}>
        {Object.entries(details).map(([k, v]) => (
          <div key={k} style={{ fontSize: 10, color: T.muted, fontFamily: mono }}>
            {k}: <span style={{ color: T.text, fontWeight: 600 }}>{v.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Filter pills ─────────────────────────────────────────────────────── */
const FILTER_OPTIONS = [
  { label: 'Все', value: 'all' },
  { label: '5★', value: '5' },
  { label: '4★', value: '4' },
  { label: '< 4★', value: 'below4' },
];

/* ─── Main grid ────────────────────────────────────────────────────────── */
interface Props {
  year: number;
}

export function ManagementReportingNewCsiGrid({ year }: Props) {
  const [feedbacks, setFeedbacks] = useState<CsiFeedbackDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const sentinelRef = useRef<HTMLDivElement>(null);

  const hasMore = page + 1 < totalPages;

  const fetchPage = async (pageNum: number, append: boolean) => {
    try {
      if (pageNum === 0) setLoading(true);
      else setLoadingMore(true);
      const params = new URLSearchParams({ page: String(pageNum), size: '100', sortBy: 'createdAt', sortDir: 'desc', year: String(year) });
      const res = await fetch(`${getBackendUrl()}/api/csi-feedback?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (append) setFeedbacks(prev => [...prev, ...(data.content || [])]);
      else setFeedbacks(data.content || []);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
      setPage(data.number);
    } catch {
      if (!append) setFeedbacks([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setPage(0);
    fetchPage(0, false);
  }, [year]);

  useEffect(() => {
    if (!hasMore || loadingMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const obs = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) fetchPage(page + 1, true); },
      { rootMargin: '200px' }
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, page]);

  const filtered = feedbacks.filter(f => {
    const r = avgRating(f);
    if (ratingFilter === '5') return r >= 4.9;
    if (ratingFilter === '4') return r >= 4.0 && r < 4.9;
    if (ratingFilter === 'below4') return r < 4.0;
    return true;
  });

  return (
    <div>
      {/* Section header */}
      <div style={{
        padding: '24px 40px 16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        fontFamily: font,
      }}>
        <div>
          <div style={{
            fontSize: 11, color: T.muted, letterSpacing: 0.8,
            textTransform: 'uppercase', marginBottom: 6,
          }}>
            Последние оценки CSI
          </div>
          <div style={{ fontSize: 18, fontWeight: 500, color: T.text }}>
            {loading ? '…' : `${filtered.length} из ${totalElements}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setRatingFilter(opt.value)}
              style={{
                padding: '4px 10px', fontSize: 11, fontWeight: 500,
                background: ratingFilter === opt.value ? T.text : 'transparent',
                color: ratingFilter === opt.value ? T.bg : T.muted,
                border: `1px solid ${ratingFilter === opt.value ? T.text : T.line}`,
                borderRadius: 999, cursor: 'pointer', fontFamily: font,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{ borderTop: `1px solid ${T.line}` }}>
        {loading ? (
          <div style={{ padding: '32px 40px', fontSize: 13, color: T.muted, fontFamily: font }}>
            Загрузка оценок…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '32px 40px', fontSize: 13, color: T.faint, fontFamily: font }}>
            Оценок за {year} год нет
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {filtered.map((c, i) => <CsiCard key={c.id ?? i} card={c} />)}
          </div>
        )}
      </div>

      {hasMore && (
        <div ref={sentinelRef} style={{ padding: '12px 40px', textAlign: 'center' }}>
          {loadingMore && (
            <span style={{ fontSize: 12, color: T.faint, fontFamily: mono }}>Загрузка…</span>
          )}
        </div>
      )}
    </div>
  );
}
