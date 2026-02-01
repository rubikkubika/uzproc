'use client';

import { useEffect, useState, useRef } from 'react';
import { Star } from 'lucide-react';
import { getBackendUrl } from '@/utils/api';

interface CsiFeedbackDto {
  id: number;
  purchaseRequestId: number;
  idPurchaseRequest: number | null;
  purchaseRequestInnerId: string;
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

const PAGE_SIZE = 30;

/**
 * Компонент для отображения всех оценок CSI в формате как «Последние оценки»
 */
export default function AllCsiFeedback() {
  const [feedbacks, setFeedbacks] = useState<CsiFeedbackDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
  const [truncatedComments, setTruncatedComments] = useState<Set<number>>(new Set());
  const commentRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const fetchPage = async (pageNum: number, append: boolean) => {
    try {
      if (pageNum === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const backendUrl = getBackendUrl();
      const response = await fetch(
        `${backendUrl}/api/csi-feedback?page=${pageNum}&size=${PAGE_SIZE}&sortBy=createdAt&sortDir=desc`
      );

      if (!response.ok) {
        throw new Error('Ошибка при загрузке оценок');
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
    fetchPage(0, false);
  }, []);

  const loadMore = () => {
    if (page + 1 < totalPages && !loadingMore) {
      fetchPage(page + 1, true);
    }
  };

  // Проверяем, какие комментарии обрезаны
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

  if (feedbacks.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4">
        <div className="text-sm font-medium text-gray-700 mb-3">Оценки CSI</div>
        <div className="border border-gray-200 rounded-lg p-6 bg-gray-50 text-center">
          <div className="text-sm text-gray-500">Оценок пока нет</div>
          <div className="text-xs text-gray-400 mt-1">Они появятся после получения отзывов</div>
        </div>
      </div>
    );
  }

  const hasMore = page + 1 < totalPages;

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="text-sm font-medium text-gray-700 mb-3">
        Оценки CSI
        <span className="ml-2 text-xs font-normal text-gray-500">
          (всего {totalElements})
        </span>
      </div>
      <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
        {feedbacks.map((feedback) => {
          const averageRating = getAverageRating(feedback);
          const isExpanded = expandedComments.has(feedback.id);
          return (
            <div
              key={feedback.id}
              className="border border-gray-200 rounded p-1.5 bg-gray-50"
            >
              <div className="flex items-start justify-between mb-0.5">
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <div className="text-xs font-medium text-gray-900">
                    {feedback.purchaseRequestInnerId || feedback.idPurchaseRequest || '-'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(feedback.createdAt)}
                  </div>
                  {feedback.cfo && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {feedback.cfo}
                    </span>
                  )}
                </div>
                <div className="ml-2 flex-shrink-0">
                  {renderStars(averageRating)}
                </div>
              </div>

              {feedback.comment && (
                <div className="mt-1">
                  <div
                    ref={(el) => {
                      if (el) {
                        commentRefs.current.set(feedback.id, el);
                      }
                    }}
                    className={`text-xs text-gray-700 bg-white rounded p-1 border border-gray-200 ${
                      !isExpanded ? 'line-clamp-3' : ''
                    }`}
                  >
                    {feedback.comment}
                  </div>
                  {truncatedComments.has(feedback.id) && !isExpanded && (
                    <button
                      onClick={() => toggleCommentExpansion(feedback.id)}
                      className="text-xs text-blue-600 hover:text-blue-800 mt-0.5"
                    >
                      Развернуть
                    </button>
                  )}
                </div>
              )}

              <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-gray-500">
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
  );
}
