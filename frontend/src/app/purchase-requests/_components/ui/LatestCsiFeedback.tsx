'use client';

import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { getBackendUrl } from '@/utils/api';

interface CsiFeedbackDto {
  id: number;
  purchaseRequestId: number;
  idPurchaseRequest: number | null;
  purchaseRequestInnerId: string;
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

/**
 * Компонент для отображения последних двух оценок CSI feedback с комментариями
 */
export default function LatestCsiFeedback() {
  const [feedbacks, setFeedbacks] = useState<CsiFeedbackDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLatestFeedbacks = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const backendUrl = getBackendUrl();
        const response = await fetch(
          `${backendUrl}/api/csi-feedback?page=0&size=2&sortBy=createdAt&sortDir=desc`
        );
        
        if (!response.ok) {
          throw new Error('Ошибка при загрузке оценок');
        }
        
        const data: CsiFeedbackPage = await response.json();
        setFeedbacks(data.content || []);
      } catch (err) {
        console.error('Error fetching latest CSI feedbacks:', err);
        setError('Не удалось загрузить оценки');
        setFeedbacks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestFeedbacks();
    
    // Обновляем каждые 30 секунд
    const interval = setInterval(fetchLatestFeedbacks, 30000);
    
    return () => clearInterval(interval);
  }, []);

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

  if (loading && feedbacks.length === 0) {
    return (
      <div className="space-y-2 w-80 flex-shrink-0">
        <div className="text-xs font-medium text-gray-500 mb-1">Последние оценки</div>
        <div className="border border-gray-200 rounded p-3 bg-gray-50 text-center">
          <div className="text-xs text-gray-400">Загрузка...</div>
        </div>
      </div>
    );
  }

  if (error && feedbacks.length === 0) {
    return (
      <div className="space-y-2 w-80 flex-shrink-0">
        <div className="text-xs font-medium text-gray-500 mb-1">Последние оценки</div>
        <div className="border border-gray-200 rounded p-3 bg-gray-50 text-center">
          <div className="text-xs text-red-500">{error}</div>
        </div>
      </div>
    );
  }

  if (feedbacks.length === 0) {
    return (
      <div className="space-y-2 w-80 flex-shrink-0">
        <div className="text-xs font-medium text-gray-500 mb-1">Последние оценки</div>
        <div className="border border-gray-200 rounded p-3 bg-gray-50 text-center">
          <div className="text-xs text-gray-400">Оценок пока нет</div>
          <div className="text-xs text-gray-400 mt-1">Они появятся после получения отзывов</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 w-80 flex-shrink-0">
      <div className="text-xs font-medium text-gray-500 mb-1">Последние оценки</div>
      {feedbacks.map((feedback) => {
        const averageRating = getAverageRating(feedback);
        return (
          <div
            key={feedback.id}
            className="border border-gray-200 rounded p-1.5 bg-gray-50"
          >
            <div className="flex items-start justify-between mb-0.5">
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <div className="text-xs font-medium text-gray-900">
                  {feedback.idPurchaseRequest || '-'}
                </div>
                <div className="text-xs text-gray-500">
                  {formatDate(feedback.createdAt)}
                </div>
              </div>
              <div className="ml-2 flex-shrink-0">
                {renderStars(averageRating)}
              </div>
            </div>
            
            {feedback.comment && (
              <div className="mt-1">
                <div className="text-xs text-gray-700 bg-white rounded p-1 border border-gray-200">
                  {feedback.comment}
                </div>
              </div>
            )}
            
            <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-gray-500">
              <span>Скорость: {feedback.speedRating.toFixed(1)}</span>
              <span>Качество: {feedback.qualityRating.toFixed(1)}</span>
              <span>Закупщик: {feedback.satisfactionRating.toFixed(1)}</span>
              {feedback.uzprocRating && (
                <span>Узпрок: {feedback.uzprocRating.toFixed(1)}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
