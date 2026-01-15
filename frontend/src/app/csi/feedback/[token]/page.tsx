'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Star } from 'lucide-react';
import { getBackendUrl } from '@/utils/api';


interface CSIFormData {
  csiToken: string;
  usedUzproc: boolean | null;
  uzprocRating: number;
  speedRating: number;
  qualityRating: number;
  satisfactionRating: number;
  comment: string;
  recipient: string | null;
}

interface PurchaseRequestInfo {
  id: number;
  idPurchaseRequest: number | null;
  innerId: string | null;
  purchaseRequestSubject: string | null;
  budgetAmount: number | null;
  currency: string | null;
  purchaser: string | null;
  alreadySubmitted: boolean;
  recipient: string | null; // Получатель из приглашения
}

export default function CSIFeedbackPage() {
  const params = useParams();
  const token = params?.token as string;

  const [purchaseRequestInfo, setPurchaseRequestInfo] = useState<PurchaseRequestInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<CSIFormData>({
    csiToken: token || '',
    usedUzproc: null,
    uzprocRating: 0,
    speedRating: 0,
    qualityRating: 0,
    satisfactionRating: 0,
    comment: '',
    recipient: null,
  });

  // Загружаем данные заявки по токену
  useEffect(() => {
    if (!token) {
      setError('Токен не указан');
      setLoading(false);
      return;
    }

    const fetchPurchaseRequestInfo = async () => {
      try {
        const response = await fetch(`${getBackendUrl()}/api/csi-feedback/form/${token}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('Ссылка недействительна или заявка не найдена');
          } else {
            setError('Ошибка при загрузке данных заявки');
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        setPurchaseRequestInfo(data);

        // Устанавливаем получателя из приглашения
        if (data.recipient) {
          setFormData(prev => ({
            ...prev,
            recipient: data.recipient,
          }));
        }

        // Если отзыв уже был оставлен, показываем сообщение
        if (data.alreadySubmitted) {
          setSubmitted(true);
        }
      } catch (err) {
        console.error('Error fetching purchase request info:', err);
        setError('Ошибка при загрузке данных заявки');
      } finally {
        setLoading(false);
      }
    };

    fetchPurchaseRequestInfo();
  }, [token]);

  const handleInputChange = (field: keyof CSIFormData, value: string | number | boolean | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleRatingChange = (question: 'uzprocRating' | 'speedRating' | 'qualityRating' | 'satisfactionRating', rating: number) => {
    setFormData(prev => ({
      ...prev,
      [question]: rating,
    }));
  };

  const formatCurrency = (amount: number | null, currency: string | null) => {
    if (!amount) return '-';
    const formatted = new Intl.NumberFormat('ru-RU', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
    return `${formatted} ${currency || 'UZS'}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Валидация обязательных оценок по заявке
    if (!formData.speedRating || formData.speedRating <= 0) {
      alert('Пожалуйста, оцените скорость проведения закупки');
      return;
    }
    if (!formData.qualityRating || formData.qualityRating <= 0) {
      alert('Пожалуйста, оцените качество результата');
      return;
    }
    if (!formData.satisfactionRating || formData.satisfactionRating <= 0) {
      alert('Пожалуйста, оцените работу закупщика');
      return;
    }

    // Валидация оценки узпрока (обязательна только если пользовались системой)
    if (formData.usedUzproc === true) {
      if (!formData.uzprocRating || formData.uzprocRating <= 0) {
        alert('Пожалуйста, оцените узпрок, если вы пользовались системой');
        return;
      }
    }

    setSubmitting(true);
    try {
    // Подготавливаем данные для отправки: если не пользовались узпроком, не отправляем рейтинг
    const submitData = {
      ...formData,
      uzprocRating: formData.usedUzproc === true ? formData.uzprocRating : null,
      recipient: formData.recipient || null,
    };

      const response = await fetch(`${getBackendUrl()}/api/csi-feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Ошибка сервера' }));
        if (response.status === 409) {
          alert('Отзыв для этой заявки уже был оставлен. Проголосовать можно только один раз.');
        } else {
          alert(errorData.message || 'Ошибка при отправке отзыва');
        }
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
    } catch (err) {
      console.error('Error submitting feedback:', err);
      alert('Ошибка при отправке отзыва');
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({ 
    rating, 
    onRatingChange, 
    question 
  }: { 
    rating: number; 
    onRatingChange: (rating: number) => void;
    question: 'uzprocRating' | 'speedRating' | 'qualityRating' | 'satisfactionRating';
  }) => {
    const [hoveredValue, setHoveredValue] = useState<number | null>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const handleContainerMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - containerRect.left;
      
      const starSize = 48;
      const gap = 4;
      const totalStarWidth = starSize + gap;
      
      const starIndex = Math.floor(x / totalStarWidth);
      const star = starIndex + 1;
      
      if (star < 1 || star > 5) {
        setHoveredValue(null);
        return;
      }
      
      const positionInStar = x - (starIndex * totalStarWidth);
      const isLeftHalf = positionInStar < starSize / 2;
      const hoverValue = isLeftHalf ? star - 0.5 : star;
      setHoveredValue(hoverValue);
    };

    const handleStarClick = (star: number, e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const starWidth = rect.width;
      const isLeftHalf = x < starWidth / 2;
      const clickValue = isLeftHalf ? star - 0.5 : star;
      onRatingChange(clickValue);
    };

    const handleMouseLeave = () => {
      setHoveredValue(null);
    };

    return (
      <div 
        ref={containerRef}
        className="flex items-center gap-1" 
        onMouseMove={handleContainerMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= rating;
          const isHalfFilled = rating >= star - 0.5 && rating < star;
          
          const hoverValue = hoveredValue ?? rating;
          const isHoveredFull = star <= hoverValue;
          const isHoveredHalf = hoverValue >= star - 0.5 && hoverValue < star;
          const showHover = hoveredValue !== null;
          
          return (
            <button
              key={star}
              type="button"
              onClick={(e) => handleStarClick(star, e)}
              className="relative w-12 h-12 flex-shrink-0 focus:outline-none cursor-pointer"
              aria-label={`Оценить ${star} звезд`}
              title={`${star} звезд`}
            >
              <Star className="absolute inset-0 w-12 h-12 fill-gray-200 text-gray-300 pointer-events-none" />
              
              {showHover && (
                <>
                  {isHoveredFull && (
                    <Star className="absolute inset-0 w-12 h-12 fill-yellow-300 text-yellow-300 pointer-events-none" />
                  )}
                  {isHoveredHalf && !isHoveredFull && (
                    <div className="absolute inset-0 w-12 h-12 overflow-hidden pointer-events-none">
                      <Star className="absolute inset-0 w-12 h-12 fill-yellow-300 text-yellow-300" style={{ clipPath: 'inset(0 50% 0 0)' }} />
                    </div>
                  )}
                </>
              )}
              
              {!showHover && (
                <>
                  {isFilled && (
                    <Star className="absolute inset-0 w-12 h-12 fill-yellow-400 text-yellow-400 pointer-events-none" />
                  )}
                  {isHalfFilled && !isFilled && (
                    <div className="absolute inset-0 w-12 h-12 overflow-hidden pointer-events-none">
                      <Star className="absolute inset-0 w-12 h-12 fill-yellow-400 text-yellow-400" style={{ clipPath: 'inset(0 50% 0 0)' }} />
                    </div>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
          <div className="text-center">
            <div className="text-red-600 text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Ошибка</h2>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!purchaseRequestInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
          <div className="text-center">
            <p className="text-gray-600">Данные заявки не найдены</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="bg-white rounded-lg shadow-lg p-4 max-w-3xl mx-auto">
        {/* Логотип и название */}
        <div className="flex items-center gap-2 mb-3">
          <img 
            src="/images/logo-small.svg" 
            alt="Logo" 
            style={{ width: '33.6px', height: '33.6px' }}
          />
          <h1 className="font-bold text-black" style={{ fontSize: '25.2px' }}>uzProc</h1>
        </div>
        
        <h2 className="font-bold text-gray-900 mb-2" style={{ fontSize: '25px' }}>Обратная связь по заявке на закупку</h2>
        
        {submitted ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-2 mb-2">
            <p className="text-green-800 font-medium" style={{ fontSize: '17.5px' }}>Спасибо! Ваш отзыв успешно отправлен.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-2">
            {/* Информация о заявке */}
            <div className="space-y-1.5 border-b border-gray-200 pb-2">
              <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
                <label className="font-medium text-gray-700" style={{ fontSize: '17.5px' }}>
                  Номер заявки:
                </label>
                <div className="px-2 py-1.5 text-gray-900 bg-gray-50 rounded border border-gray-200" style={{ fontSize: '17.5px' }}>
                  {purchaseRequestInfo.idPurchaseRequest || purchaseRequestInfo.innerId || '-'}
                </div>
              </div>

              <div className="grid grid-cols-[120px_1fr] gap-3 items-center">
                <label className="font-medium text-gray-700" style={{ fontSize: '17.5px' }}>
                  Наименование:
                </label>
                <div className="px-2 py-1.5 text-gray-900 bg-gray-50 rounded border border-gray-200" style={{ fontSize: '17.5px' }}>
                  {purchaseRequestInfo.purchaseRequestSubject || '-'}
                </div>
              </div>

              <div className="grid grid-cols-[120px_1fr] gap-3 items-center">
                <label className="font-medium text-gray-700" style={{ fontSize: '17.5px' }}>
                  Сумма:
                </label>
                <div className="px-2 py-1.5 text-gray-900 bg-gray-50 rounded border border-gray-200" style={{ fontSize: '17.5px' }}>
                  {formatCurrency(purchaseRequestInfo.budgetAmount, purchaseRequestInfo.currency)}
                </div>
              </div>

              <div className="grid grid-cols-[120px_1fr] gap-3 items-center">
                <label className="font-medium text-gray-700" style={{ fontSize: '17.5px' }}>
                  Закупщик:
                </label>
                <div className="px-2 py-1.5 text-gray-900 bg-gray-50 rounded border border-gray-200" style={{ fontSize: '17.5px' }}>
                  {purchaseRequestInfo.purchaser || '-'}
                </div>
              </div>
            </div>

            {/* Вопросы с рейтингом */}
            <div className="space-y-2 border-b border-gray-200 pb-2">
              <h3 className="font-semibold text-gray-900" style={{ fontSize: '20px' }}>Оценка Заявки</h3>
              
              <div className="space-y-2">
                <div>
                  <label className="block font-medium text-gray-700 mb-1" style={{ fontSize: '17.5px' }}>
                    Скорость проведения закупки
                  </label>
                  <StarRating
                    rating={formData.speedRating}
                    onRatingChange={(rating) => handleRatingChange('speedRating', rating)}
                    question="speedRating"
                  />
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-1" style={{ fontSize: '17.5px' }}>
                    Качество результата
                  </label>
                  <StarRating
                    rating={formData.qualityRating}
                    onRatingChange={(rating) => handleRatingChange('qualityRating', rating)}
                    question="qualityRating"
                  />
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-1" style={{ fontSize: '17.5px' }}>
                    Работа закупщика (коммуникация и бизнес-ориентированность)
                  </label>
                  <StarRating
                    rating={formData.satisfactionRating}
                    onRatingChange={(rating) => handleRatingChange('satisfactionRating', rating)}
                    question="satisfactionRating"
                  />
                </div>
              </div>
            </div>

            {/* Комментарий */}
            <div>
              <label htmlFor="comment" className="block font-medium text-gray-700 mb-0.5" style={{ fontSize: '17.5px' }}>
                Опишите, чтобы мы могли улучшить
              </label>
              <textarea
                id="comment"
                value={formData.comment}
                onChange={(e) => handleInputChange('comment', e.target.value)}
                rows={2}
                className="w-full px-2.5 py-1.5 text-gray-900 border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                style={{ fontSize: '17.5px' }}
                placeholder="Введите ваш комментарий (необязательно)"
              />
            </div>

            {/* Оценка uzProc */}
            <div className="space-y-1.5 border-b border-gray-200 pb-2">
              <h3 className="font-semibold text-gray-900" style={{ fontSize: '20px' }}>Оценка uzProc</h3>
              
              <div>
                <label className="block font-medium text-gray-700 mb-1" style={{ fontSize: '17.5px' }}>
                  Пользовались ли вы новой системой для управления закупками uzProc?
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="usedUzproc"
                      value="true"
                      checked={formData.usedUzproc === true}
                      onChange={() => handleInputChange('usedUzproc', true)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-900" style={{ fontSize: '17.5px' }}>Да</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="usedUzproc"
                      value="false"
                      checked={formData.usedUzproc === false}
                      onChange={() => {
                        handleInputChange('usedUzproc', false);
                        handleInputChange('uzprocRating', 0);
                      }}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-900" style={{ fontSize: '17.5px' }}>Нет</span>
                  </label>
                </div>
              </div>

              {/* Рейтинг узпрок (показываем только если ответили "Да") */}
              {formData.usedUzproc === true && (
                <div>
                  <label className="block font-medium text-gray-700 mb-1" style={{ fontSize: '17.5px' }}>
                    Рейтинг узпрок
                  </label>
                  <StarRating
                    rating={formData.uzprocRating}
                    onRatingChange={(rating) => handleRatingChange('uzprocRating', rating)}
                    question="uzprocRating"
                  />
                </div>
              )}
            </div>

            {/* Кнопка отправки */}
            <div className="flex justify-end pt-0.5">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-1.5 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontSize: '17.5px' }}
              >
                {submitting ? 'Отправка...' : 'Отправить'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
