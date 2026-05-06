'use client';

import { useState, useEffect, useRef } from 'react';
import { Star } from 'lucide-react';
import { getBackendUrl } from '@/utils/api';
import { purchaserDisplayName } from '@/utils/purchaser';

/* ─── Типы ────────────────────────────────────────────────────────────── */

interface CsiFeedbackDto {
  id: number;
  purchaseRequestId: number;
  idPurchaseRequest: number | null;
  purchaseRequestInnerId: string;
  purchaseRequestSubject?: string;
  purchaser?: string;
  cfo?: string;
  usedUzproc?: boolean;
  uzprocRating?: number;
  speedRating: number;
  qualityRating: number;
  satisfactionRating: number;
  comment?: string;
  recipient?: string;
  recipientName?: string;
  createdAt: string;
}

interface CsiFeedbackPage {
  content: CsiFeedbackDto[];
  totalElements: number;
  totalPages: number;
  number: number;
}

/* ─── Группы ──────────────────────────────────────────────────────────── */

const CFO_GROUPS = [
  { label: 'Operations', sub: 'Warehouse · Logistics · Construction · Maintenance · PVZ', keywords: ['Warehouse', 'Logistics', 'Construction', 'Maintenance', 'PVZ'] },
  { label: 'Marketing', sub: null, keywords: ['Marketing', 'Маркет'] },
  { label: 'HR', sub: 'Facilities · HR · Labor Safety', keywords: ['Facilities', 'HR', 'Labor Safety', 'Labor'] },
  { label: 'IT', sub: null, keywords: ['IT'] },
];

function getGroup(cfo: string | undefined): string | null {
  if (!cfo) return null;
  for (const g of CFO_GROUPS) {
    if (g.keywords.some(k => cfo.toLowerCase().includes(k.toLowerCase()))) return g.label;
  }
  return null;
}

/* ─── Утилиты ─────────────────────────────────────────────────────────── */

const PAGE_SIZE = 100;

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getAverageRating(f: CsiFeedbackDto): number {
  const ratings = [f.speedRating, f.qualityRating, f.satisfactionRating];
  if (f.uzprocRating) ratings.push(f.uzprocRating);
  return ratings.reduce((a, b) => a + (b || 0), 0) / ratings.length;
}

function renderStars(rating: number) {
  const full = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  const empty = 5 - full - (hasHalf ? 1 : 0);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: full }).map((_, i) => (
        <Star key={`f-${i}`} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
      ))}
      {hasHalf && <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 opacity-50" />}
      {Array.from({ length: empty }).map((_, i) => (
        <Star key={`e-${i}`} className="w-3 h-3 text-gray-300" />
      ))}
      <span className="ml-1 text-xs text-gray-600">{rating.toFixed(1)}</span>
    </div>
  );
}

/* ─── Карточка ────────────────────────────────────────────────────────── */

function FeedbackCard({ feedback }: { feedback: CsiFeedbackDto }) {
  const [expanded, setExpanded] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const commentRef = useRef<HTMLDivElement>(null);
  const averageRating = getAverageRating(feedback);

  useEffect(() => {
    const el = commentRef.current;
    if (el && !expanded) {
      setTruncated(el.scrollHeight > el.clientHeight);
    }
  }, [feedback.comment, expanded]);

  return (
    <div className="mr-feedback-card border border-gray-200 rounded p-1 bg-gray-50 min-w-0">
      <div className="flex items-start justify-between mb-0 gap-1">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-xs font-medium text-gray-900">
              {feedback.purchaseRequestInnerId || feedback.idPurchaseRequest || '-'}
            </span>
            <span className="text-xs text-gray-500">
              {formatDate(feedback.createdAt)}
            </span>
          </div>
          {feedback.cfo && (
            <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mt-0">
              {feedback.cfo}
            </span>
          )}
          {feedback.purchaseRequestSubject && (
            <div className="mt-0 text-xs text-gray-700 truncate" title={feedback.purchaseRequestSubject}>
              {feedback.purchaseRequestSubject}
            </div>
          )}
        </div>
        <div className="flex-shrink-0">
          {renderStars(averageRating)}
        </div>
      </div>

      {(feedback.purchaser || feedback.recipient) && (
        <div className="text-xs text-gray-500 mt-0">
          {feedback.purchaser && <div>Закупщик: {purchaserDisplayName(feedback.purchaser)}</div>}
          {feedback.recipient && <div>Оценил: {feedback.recipientName || feedback.recipient}</div>}
        </div>
      )}

      <div className={`mt-0.5 rounded p-1 border border-gray-200 bg-white flex flex-col min-h-0 ${
        feedback.comment && expanded ? 'min-h-[3.5rem]' : 'h-[3.5rem] overflow-hidden'
      } mr-feedback-comment`}>
        {feedback.comment ? (
          expanded ? (
            <div ref={commentRef} className="text-xs text-gray-700">{feedback.comment}</div>
          ) : (
            <div className="relative w-full h-full min-h-0 flex flex-col items-start">
              <div ref={commentRef} className="text-xs text-gray-700 line-clamp-2 leading-normal w-full pr-20">
                {feedback.comment}
              </div>
              {truncated && (
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="absolute right-0 top-[1rem] text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap print:hidden"
                >
                  Развернуть
                </button>
              )}
            </div>
          )
        ) : (
          <div className="text-xs text-gray-400 flex-1 flex items-center min-h-0">Комментария нет</div>
        )}
      </div>

      <div className="mt-0.5 flex flex-wrap gap-1 text-xs text-gray-500">
        <span>Скорость: {feedback.speedRating.toFixed(1)}</span>
        <span>Качество: {feedback.qualityRating.toFixed(1)}</span>
        <span>Закупщик: {feedback.satisfactionRating.toFixed(1)}</span>
        {feedback.uzprocRating != null && <span>Узпрок: {feedback.uzprocRating.toFixed(1)}</span>}
      </div>
    </div>
  );
}

/* ─── Секция группы ───────────────────────────────────────────────────── */

function GroupSection({ label, sub, cards }: { label: string; sub: string | null; cards: CsiFeedbackDto[] }) {
  if (cards.length === 0) return null;
  return (
    <div className="mb-4">
      <div className="flex items-baseline gap-2 mb-1.5 px-0.5">
        <span className="text-xs font-semibold text-gray-700">{label}</span>
        {sub && <span className="text-xs text-gray-400">{sub}</span>}
        <span className="ml-auto text-xs text-gray-400">{cards.length}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5">
        {cards.map(f => <FeedbackCard key={f.id} feedback={f} />)}
      </div>
    </div>
  );
}

/* ─── Компонент ────────────────────────────────────────────────────────── */

interface ManagementReportingFeedbackGridProps {
  year: number;
}

export function ManagementReportingFeedbackGrid({ year }: ManagementReportingFeedbackGridProps) {
  const [feedbacks, setFeedbacks] = useState<CsiFeedbackDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const hasMore = page + 1 < totalPages;

  const fetchPage = async (pageNum: number, append: boolean) => {
    try {
      if (pageNum === 0) setLoading(true);
      else setLoadingMore(true);
      const params = new URLSearchParams({
        page: String(pageNum),
        size: String(PAGE_SIZE),
        sortBy: 'createdAt',
        sortDir: 'desc',
        year: String(year),
      });
      const res = await fetch(`${getBackendUrl()}/api/csi-feedback?${params}`);
      if (!res.ok) throw new Error();
      const data: CsiFeedbackPage = await res.json();
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
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) fetchPage(page + 1, true); },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, page]);

  if (loading) {
    return <div className="text-center text-xs text-gray-500 py-4">Загрузка оценок…</div>;
  }

  if (feedbacks.length === 0) {
    return (
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 text-center">
        <div className="text-xs text-gray-500">Оценок за {year} год пока нет</div>
      </div>
    );
  }

  const grouped = CFO_GROUPS.map(g => ({
    ...g,
    cards: feedbacks.filter(f => getGroup(f.cfo) === g.label),
  }));

  return (
    <div className="flex-1 min-h-0 overflow-auto custom-scrollbar pr-1">
      {/* Счётчик */}
      <div className="flex items-baseline justify-between mb-3 px-0.5">
        <span className="text-xs text-gray-400">{feedbacks.length} из {totalElements}</span>
      </div>

      {/* Группы */}
      {grouped.map(g => (
        <GroupSection key={g.label} label={g.label} sub={g.sub} cards={g.cards} />
      ))}

      {hasMore && (
        <div ref={sentinelRef} className="py-3 text-center print:hidden">
          {loadingMore && <span className="text-xs text-gray-500">Загрузка…</span>}
        </div>
      )}
    </div>
  );
}
