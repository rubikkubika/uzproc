'use client';

import { Star, X } from 'lucide-react';
import type { PurchaseRequest } from '../../types/purchase-request.types';

interface FeedbackDetails {
  recipient: string | null;
  speedRating: number | null;
  qualityRating: number | null;
  satisfactionRating: number | null;
  uzprocRating: number | null;
  usedUzproc: boolean | null;
  comment: string | null;
}

interface FeedbackDetailsModalProps {
  isOpen: boolean;
  request: PurchaseRequest | null;
  loading: boolean;
  feedbackDetails: FeedbackDetails | null;
  onClose: () => void;
}

export default function FeedbackDetailsModal({
  isOpen,
  request,
  loading,
  feedbackDetails,
  onClose,
}: FeedbackDetailsModalProps) {
  if (!isOpen || !request) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Детали оценки</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Загрузка...</p>
          </div>
        ) : feedbackDetails ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Получатель
              </label>
              <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                {feedbackDetails.recipient || '-'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Оценка скорости проведения закупки
                </label>
                <div className="flex items-center gap-2">
                  {feedbackDetails.speedRating ? (() => {
                    const rating = feedbackDetails.speedRating;
                    const fullStars = Math.floor(rating);
                    const hasHalfStar = rating % 1 >= 0.5;
                    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
                    return (
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: fullStars }).map((_, i) => (
                          <Star key={`full-${i}`} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        ))}
                        {hasHalfStar && (
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 opacity-50" />
                        )}
                        {Array.from({ length: emptyStars }).map((_, i) => (
                          <Star key={`empty-${i}`} className="w-4 h-4 text-gray-300" />
                        ))}
                        <span className="ml-1 text-sm text-gray-900">{rating.toFixed(1)}</span>
                      </div>
                    );
                  })() : <span className="text-sm text-gray-900">-</span>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Оценка качества результата
                </label>
                <div className="flex items-center gap-2">
                  {feedbackDetails.qualityRating ? (() => {
                    const rating = feedbackDetails.qualityRating;
                    const fullStars = Math.floor(rating);
                    const hasHalfStar = rating % 1 >= 0.5;
                    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
                    return (
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: fullStars }).map((_, i) => (
                          <Star key={`full-${i}`} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        ))}
                        {hasHalfStar && (
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 opacity-50" />
                        )}
                        {Array.from({ length: emptyStars }).map((_, i) => (
                          <Star key={`empty-${i}`} className="w-4 h-4 text-gray-300" />
                        ))}
                        <span className="ml-1 text-sm text-gray-900">{rating.toFixed(1)}</span>
                      </div>
                    );
                  })() : <span className="text-sm text-gray-900">-</span>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Оценка работы закупщика
                </label>
                <div className="flex items-center gap-2">
                  {feedbackDetails.satisfactionRating ? (() => {
                    const rating = feedbackDetails.satisfactionRating;
                    const fullStars = Math.floor(rating);
                    const hasHalfStar = rating % 1 >= 0.5;
                    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
                    return (
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: fullStars }).map((_, i) => (
                          <Star key={`full-${i}`} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        ))}
                        {hasHalfStar && (
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 opacity-50" />
                        )}
                        {Array.from({ length: emptyStars }).map((_, i) => (
                          <Star key={`empty-${i}`} className="w-4 h-4 text-gray-300" />
                        ))}
                        <span className="ml-1 text-sm text-gray-900">{rating.toFixed(1)}</span>
                      </div>
                    );
                  })() : <span className="text-sm text-gray-900">-</span>}
                </div>
              </div>

              {feedbackDetails.usedUzproc && feedbackDetails.uzprocRating && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Оценка узпрок
                  </label>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const rating = feedbackDetails.uzprocRating!;
                      const fullStars = Math.floor(rating);
                      const hasHalfStar = rating % 1 >= 0.5;
                      const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
                      return (
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: fullStars }).map((_, i) => (
                            <Star key={`full-${i}`} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          ))}
                          {hasHalfStar && (
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 opacity-50" />
                          )}
                          {Array.from({ length: emptyStars }).map((_, i) => (
                            <Star key={`empty-${i}`} className="w-4 h-4 text-gray-300" />
                          ))}
                          <span className="ml-1 text-sm text-gray-900">{rating.toFixed(1)}</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            {feedbackDetails.comment && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Комментарий
                </label>
                <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg whitespace-pre-wrap">
                  {feedbackDetails.comment}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">Оценка не найдена</p>
          </div>
        )}
      </div>
    </div>
  );
}
