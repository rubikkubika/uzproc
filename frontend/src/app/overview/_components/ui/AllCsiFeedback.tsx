'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { Star } from 'lucide-react';
import { getBackendUrl } from '@/utils/api';
import { purchaserDisplayName } from '@/utils/purchaser';

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
  createdAt: string;
  updatedAt: string;
}

interface CsiFeedbackPage {
  content: CsiFeedbackDto[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

interface CsiStats {
  year: number;
  count: number;
  avgSpeed: number | null;
  avgQuality: number | null;
  avgSatisfaction: number | null;
  avgUzproc: number | null;
  avgOverall: number | null;
}

const PAGE_SIZE = 100;

/**
 * Компонент для отображения всех оценок CSI: фильтр по году, средние показатели за год, сетка 4 в ряд, до 100 записей с прокруткой.
 */
export default function AllCsiFeedback() {
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const availableYears = useMemo(() => {
    const years: number[] = [];
    for (let i = currentYear - 2; i <= currentYear + 1; i++) years.push(i);
    return years;
  }, [currentYear]);

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [feedbacks, setFeedbacks] = useState<CsiFeedbackDto[]>([]);
  const [stats, setStats] = useState<CsiStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
  const [truncatedComments, setTruncatedComments] = useState<Set<number>>(new Set());
  const commentRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const fetchStats = async (year: number) => {
    try {
      setStatsLoading(true);
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/csi-feedback/stats?year=${year}`);
      if (!res.ok) throw new Error('Ошибка загрузки показателей');
      const data = await res.json();
      setStats({
        year: data.year,
        count: data.count ?? 0,
        avgSpeed: data.avgSpeed ?? null,
        avgQuality: data.avgQuality ?? null,
        avgSatisfaction: data.avgSatisfaction ?? null,
        avgUzproc: data.avgUzproc ?? null,
        avgOverall: data.avgOverall ?? null,
      });
    } catch (err) {
      console.error('Error fetching CSI stats:', err);
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchPage = async (pageNum: number, append: boolean, year: number) => {
    try {
      if (pageNum === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const backendUrl = getBackendUrl();
      const params = new URLSearchParams({
        page: String(pageNum),
        size: String(PAGE_SIZE),
        sortBy: 'createdAt',
        sortDir: 'desc',
        year: String(year),
      });
      const response = await fetch(`${backendUrl}/api/csi-feedback?${params}`);

      if (!response.ok) {
        const body = await response.text();
        console.error('CSI feedback API error:', response.status, response.statusText, body);
        throw new Error(`Ошибка при загрузке оценок (${response.status})`);
      }

      const data: CsiFeedbackPage = await response.json();
      const list = data.content || [];

      if (append) {
        setFeedbacks((prev) => [...prev, ...list]);
      } else {
        setFeedbacks(list);
      }
      setTotalElements(data.totalElements);
      setTotalPages(data.totalPages);
      setPage(data.number);
    } catch (err) {
      console.error('Error fetching CSI feedbacks:', err);
      setError('Не удалось загрузить оценки');
      if (!append) {
        setFeedbacks([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchStats(selectedYear);
  }, [selectedYear]);

  useEffect(() => {
    setPage(0);
    fetchPage(0, false, selectedYear);
  }, [selectedYear]);

  const loadMore = () => {
    if (page + 1 < totalPages && !loadingMore) {
      fetchPage(page + 1, true, selectedYear);
    }
  };

  useEffect(() => {
    const checkTruncation = () => {
      const truncated = new Set<number>();
      commentRefs.current.forEach((element, id) => {
        if (element && !expandedComments.has(id) && element.scrollHeight > element.clientHeight) {
          truncated.add(id);
        }
      });
      setTruncatedComments(truncated);
    };

    if (feedbacks.length > 0) {
      setTimeout(checkTruncation, 100);
    }
  }, [feedbacks, expandedComments]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: fullStars }).map((_, i) => (
          <Star key={`full-${i}`} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
        ))}
        {hasHalfStar && (
          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 opacity-50" />
        )}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <Star key={`empty-${i}`} className="w-3 h-3 text-gray-300" />
        ))}
        <span className="ml-1 text-xs text-gray-600">{rating.toFixed(1)}</span>
      </div>
    );
  };

  const getAverageRating = (feedback: CsiFeedbackDto) => {
    const ratings = [
      feedback.speedRating,
      feedback.qualityRating,
      feedback.satisfactionRating,
    ];
    if (feedback.uzprocRating) {
      ratings.push(feedback.uzprocRating);
    }
    const sum = ratings.reduce((acc, rating) => acc + (rating || 0), 0);
    return sum / ratings.length;
  };

  const toggleCommentExpansion = (feedbackId: number) => {
    setExpandedComments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(feedbackId)) {
        newSet.delete(feedbackId);
      } else {
        newSet.add(feedbackId);
      }
      return newSet;
    });
  };

  const formatStat = (v: number | null) => (v != null ? v.toFixed(1) : '—');

  if (loading && feedbacks.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4">
        <div className="text-sm font-medium text-gray-700 mb-3">Оценки CSI</div>
        <div className="border border-gray-200 rounded-lg p-6 bg-gray-50 text-center">
          <div className="text-sm text-gray-500">Загрузка...</div>
        </div>
      </div>
    );
  }

  if (error && feedbacks.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4">
        <div className="text-sm font-medium text-gray-700 mb-3">Оценки CSI</div>
        <div className="border border-gray-200 rounded-lg p-6 bg-gray-50 text-center">
          <div className="text-sm text-red-500">{error}</div>
        </div>
      </div>
    );
  }

  const hasMore = page + 1 < totalPages;

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 w-full">
      {/* Фильтр по году и блок средних показателей */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <label htmlFor="csi-year-filter" className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Год получения оценки:
          </label>
          <select
            id="csi-year-filter"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-4 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
          <span className="text-xs font-medium text-gray-700">Средние показатели за {selectedYear} г.</span>
          {statsLoading ? (
            <span className="text-xs text-gray-500">Загрузка…</span>
          ) : stats ? (
            <>
              <span className="text-xs text-gray-600">Кол-во: <strong className="text-gray-900">{stats.count}</strong></span>
              <span className="text-xs text-gray-600">Средняя: <strong className="text-gray-900">{formatStat(stats.avgOverall)}</strong></span>
              <span className="text-xs text-gray-600">Скорость: {formatStat(stats.avgSpeed)}</span>
              <span className="text-xs text-gray-600">Качество: {formatStat(stats.avgQuality)}</span>
              <span className="text-xs text-gray-600">Закупщик: {formatStat(stats.avgSatisfaction)}</span>
              {stats.avgUzproc != null && (
                <span className="text-xs text-gray-600">Узпрок: {formatStat(stats.avgUzproc)}</span>
              )}
            </>
          ) : (
            <span className="text-xs text-gray-500">—</span>
          )}
        </div>
      </div>

      {feedbacks.length === 0 ? (
        <div className="border border-gray-200 rounded-lg p-6 bg-gray-50 text-center">
          <div className="text-sm text-gray-500">Оценок за {selectedYear} год пока нет</div>
          <div className="text-xs text-gray-400 mt-1">Они появятся после получения отзывов</div>
        </div>
      ) : (
        <>
          <div className="text-sm font-medium text-gray-700 mb-2">
            Оценки CSI
            <span className="ml-2 text-xs font-normal text-gray-500">(всего {totalElements})</span>
          </div>
          <div className="max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {feedbacks.map((feedback) => {
                const averageRating = getAverageRating(feedback);
                const isExpanded = expandedComments.has(feedback.id);
                return (
                  <div
                    key={feedback.id}
                    className="border border-gray-200 rounded p-1.5 bg-gray-50 min-w-0"
                  >
                    <div className="flex items-start justify-between mb-0.5 gap-1">
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
                          <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mt-0.5">
                            {feedback.cfo}
                          </span>
                        )}
                        {feedback.purchaseRequestSubject && (
                          <div className="mt-0.5 text-xs text-gray-700 truncate" title={feedback.purchaseRequestSubject}>
                            {feedback.purchaseRequestSubject}
                          </div>
                        )}
                        {feedback.purchaser && (
                          <div className="mt-0.5 text-xs text-gray-500 truncate">
                            {purchaserDisplayName(feedback.purchaser)}
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        {renderStars(averageRating)}
                      </div>
                    </div>

                    {feedback.comment && (
                      <div className="mt-1">
                        <div
                          ref={(el) => {
                            if (el) commentRefs.current.set(feedback.id, el);
                          }}
                          className={`text-xs text-gray-700 bg-white rounded p-1 border border-gray-200 ${
                            !isExpanded ? 'line-clamp-3' : ''
                          }`}
                        >
                          {feedback.comment}
                        </div>
                        {truncatedComments.has(feedback.id) && !isExpanded && (
                          <button
                            type="button"
                            onClick={() => toggleCommentExpansion(feedback.id)}
                            className="text-xs text-blue-600 hover:text-blue-800 mt-0.5"
                          >
                            Развернуть
                          </button>
                        )}
                      </div>
                    )}

                    <div className="mt-1 flex flex-wrap gap-1 text-xs text-gray-500">
                      <span>Скорость: {feedback.speedRating.toFixed(1)}</span>
                      <span>Качество: {feedback.qualityRating.toFixed(1)}</span>
                      <span>Закупщик: {feedback.satisfactionRating.toFixed(1)}</span>
                      {feedback.uzprocRating != null && (
                        <span>Узпрок: {feedback.uzprocRating.toFixed(1)}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {hasMore && (
              <div className="mt-3 flex justify-center">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900"
                >
                  {loadingMore ? 'Загрузка...' : 'Загрузить ещё'}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
