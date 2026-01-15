'use client';

import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface CSIFormData {
  purchaseRequestId: string;
  subject: string;
  amount: string;
  speedRating: number;
  qualityRating: number;
  satisfactionRating: number;
  comment: string;
}

// Моковые данные для отображения
const MOCK_PURCHASE_REQUEST_DATA = {
  purchaseRequestId: 'PR-2024-00123',
  subject: 'Закупка офисной мебели для нового офиса',
  amount: '15 500 000 UZS',
  purchaser: 'Иванов Иван Иванович',
};

export default function CSIForm() {
  const [formData, setFormData] = useState<CSIFormData>({
    purchaseRequestId: MOCK_PURCHASE_REQUEST_DATA.purchaseRequestId,
    subject: MOCK_PURCHASE_REQUEST_DATA.subject,
    amount: MOCK_PURCHASE_REQUEST_DATA.amount,
    speedRating: 0,
    qualityRating: 0,
    satisfactionRating: 0,
    comment: '',
  });

  const [submitted, setSubmitted] = useState(false);

  const handleInputChange = (field: keyof CSIFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleRatingChange = (question: 'speedRating' | 'qualityRating' | 'satisfactionRating', rating: number) => {
    setFormData(prev => ({
      ...prev,
      [question]: rating,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Здесь будет логика отправки данных на бэкенд
    console.log('CSI Form Data:', formData);
    setSubmitted(true);
    // Сброс формы через 3 секунды
    setTimeout(() => {
      setFormData({
        purchaseRequestId: MOCK_PURCHASE_REQUEST_DATA.purchaseRequestId,
        subject: MOCK_PURCHASE_REQUEST_DATA.subject,
        amount: MOCK_PURCHASE_REQUEST_DATA.amount,
        speedRating: 0,
        qualityRating: 0,
        satisfactionRating: 0,
        comment: '',
      });
      setSubmitted(false);
    }, 3000);
  };

  const StarRating = ({ 
    rating, 
    onRatingChange, 
    question 
  }: { 
    rating: number; 
    onRatingChange: (rating: number) => void;
    question: 'speedRating' | 'qualityRating' | 'satisfactionRating';
  }) => {
    const [hoveredValue, setHoveredValue] = useState<number | null>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const handleContainerMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - containerRect.left;
      
      // Размер одной звезды с учетом gap (gap-1 = 4px)
      const starSize = 48; // w-12 = 48px
      const gap = 4; // gap-1 = 4px
      const totalStarWidth = starSize + gap;
      
      // Определяем, над какой звездой находится курсор
      const starIndex = Math.floor(x / totalStarWidth);
      const star = starIndex + 1;
      
      if (star < 1 || star > 5) {
        setHoveredValue(null);
        return;
      }
      
      // Позиция внутри звезды
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
          // Определяем, какая часть звезды должна быть закрашена для текущего рейтинга
          const isFilled = star <= rating;
          const isHalfFilled = rating >= star - 0.5 && rating < star;
          
          // Определяем, какая часть звезды должна быть закрашена при наведении
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
              {/* Фоновая звезда (серая) */}
              <Star className="absolute inset-0 w-12 h-12 fill-gray-200 text-gray-300 pointer-events-none" />
              
              {/* Предварительная закраска при наведении */}
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
              
              {/* Текущий рейтинг (показываем только если нет hover) */}
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

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 max-w-3xl mx-auto">
      {/* Логотип и название в левом верхнем углу */}
      <div className="flex items-center gap-2 mb-3">
        <img 
          src="/images/logo-small.svg" 
          alt="Logo" 
          className="w-6 h-6"
        />
        <h1 className="text-lg font-bold text-black">uzProc</h1>
      </div>
      
      <h2 className="text-xl font-bold text-gray-900 mb-4">Форма обратной связи по заявке на закупку</h2>
      
      {submitted ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <p className="text-green-800 font-medium text-sm">Спасибо! Ваш отзыв успешно отправлен.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Информация о заявке */}
          <div className="space-y-2 border-b border-gray-200 pb-3">
            <h3 className="text-base font-semibold text-gray-900">Информация о заявке</h3>
            
            <div className="grid grid-cols-[120px_1fr] gap-3 items-center">
              <label className="text-sm font-medium text-gray-700">
                Номер заявки:
              </label>
              <div className="px-2 py-1.5 text-sm text-gray-900 bg-gray-50 rounded border border-gray-200">
                {MOCK_PURCHASE_REQUEST_DATA.purchaseRequestId}
              </div>
            </div>

            <div className="grid grid-cols-[120px_1fr] gap-3 items-center">
              <label className="text-sm font-medium text-gray-700">
                Предмет:
              </label>
              <div className="px-2 py-1.5 text-sm text-gray-900 bg-gray-50 rounded border border-gray-200">
                {MOCK_PURCHASE_REQUEST_DATA.subject}
              </div>
            </div>

            <div className="grid grid-cols-[120px_1fr] gap-3 items-center">
              <label className="text-sm font-medium text-gray-700">
                Сумма:
              </label>
              <div className="px-2 py-1.5 text-sm text-gray-900 bg-gray-50 rounded border border-gray-200">
                {MOCK_PURCHASE_REQUEST_DATA.amount}
              </div>
            </div>

            <div className="grid grid-cols-[120px_1fr] gap-3 items-center">
              <label className="text-sm font-medium text-gray-700">
                Закупщик:
              </label>
              <div className="px-2 py-1.5 text-sm text-gray-900 bg-gray-50 rounded border border-gray-200">
                {MOCK_PURCHASE_REQUEST_DATA.purchaser}
              </div>
            </div>
          </div>

          {/* Вопросы с рейтингом */}
          <div className="space-y-3 border-b border-gray-200 pb-3">
            <h3 className="text-base font-semibold text-gray-900">Оценка</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Скорость проведения закупки
                </label>
                <StarRating
                  rating={formData.speedRating}
                  onRatingChange={(rating) => handleRatingChange('speedRating', rating)}
                  question="speedRating"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Качество результата
                </label>
                <StarRating
                  rating={formData.qualityRating}
                  onRatingChange={(rating) => handleRatingChange('qualityRating', rating)}
                  question="qualityRating"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
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
            <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
              Опишите, чтобы мы могли улучшить
            </label>
            <textarea
              id="comment"
              value={formData.comment}
              onChange={(e) => handleInputChange('comment', e.target.value)}
              rows={3}
              className="w-full px-2.5 py-1.5 text-sm text-gray-900 border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="Введите ваш комментарий (необязательно)"
            />
          </div>

          {/* Кнопка отправки */}
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-5 py-1.5 text-sm bg-blue-600 text-white font-medium rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Отправить
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

