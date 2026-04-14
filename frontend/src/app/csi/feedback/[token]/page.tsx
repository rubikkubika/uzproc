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

  const RATING_LABELS: { min: number; max: number; label: string; color: string }[] = [
    { min: 5.0, max: 5.0, label: 'Отлично', color: 'text-green-600' },
    { min: 4.0, max: 4.5, label: 'Хорошо', color: 'text-lime-600' },
    { min: 3.0, max: 3.5, label: 'Удовлетворительно', color: 'text-yellow-600' },
    { min: 2.0, max: 2.5, label: 'Ниже ожиданий', color: 'text-orange-500' },
    { min: 0.5, max: 1.5, label: 'Неудовлетворительно', color: 'text-red-500' },
  ];

  const getRatingMeta = (rating: number) => {
    if (rating === 0) return null;
    for (const entry of RATING_LABELS) {
      if (rating >= entry.min && rating <= entry.max) return entry;
    }
    return null;
  };

  const QUESTION_HINTS = {
    speedRating: 'Оцените, насколько быстро была проведена закупка — от подачи заявки до заключения договора. Учитывайте, что срок зависит от сложности закупки (по Регламенту): Сложность 2 — 7 р.д., Сложность 3 — 15 р.д., Сложность 4 — договорная. Срок закупки может быть гарантирован, если закупка была в Плане закупок.',
    qualityRating: 'Оцените качество итогового результата: соответствие ТЗ, выбранный поставщик, условия договора.',
    satisfactionRating: 'Оцените работу закупщика: коммуникация, ориентированность на ваши потребности, помощь в решении вопросов.',
    uzprocRating: 'Оцените удобство системы uzProc при работе с заявкой.',
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
      if (star < 1 || star > 5) { setHoveredValue(null); return; }
      const positionInStar = x - (starIndex * totalStarWidth);
      const isLeftHalf = positionInStar < starSize / 2;
      setHoveredValue(isLeftHalf ? star - 0.5 : star);
    };

    const handleStarClick = (star: number, e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const isLeftHalf = x < rect.width / 2;
      onRatingChange(isLeftHalf ? star - 0.5 : star);
    };

    const displayValue = hoveredValue ?? rating;
    const meta = getRatingMeta(displayValue);

    return (
      <div className="flex items-center gap-3">
        <div
          ref={containerRef}
          className="flex items-center gap-1"
          onMouseMove={handleContainerMouseMove}
          onMouseLeave={() => setHoveredValue(null)}
        >
          {[1, 2, 3, 4, 5].map((star) => {
            const isHovering = hoveredValue !== null;
            const isFull = star <= displayValue;
            const isHalf = displayValue >= star - 0.5 && displayValue < star;
            return (
              <button
                key={star}
                type="button"
                onClick={(e) => handleStarClick(star, e)}
                className="relative w-12 h-12 flex-shrink-0 focus:outline-none cursor-pointer"
                aria-label={`Оценить ${star} звезд`}
              >
                <Star className="absolute inset-0 w-12 h-12 fill-gray-200 text-gray-300 pointer-events-none" />
                {isFull && (
                  <Star className={`absolute inset-0 w-12 h-12 pointer-events-none ${isHovering ? 'fill-yellow-300 text-yellow-300' : 'fill-yellow-400 text-yellow-400'}`} />
                )}
                {isHalf && !isFull && (
                  <div className="absolute inset-0 w-12 h-12 overflow-hidden pointer-events-none" style={{ clipPath: 'inset(0 50% 0 0)' }}>
                    <Star className={`absolute inset-0 w-12 h-12 ${isHovering ? 'fill-yellow-300 text-yellow-300' : 'fill-yellow-400 text-yellow-400'}`} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <div className="min-w-[140px]">
          {displayValue > 0 ? (
            <span className={`font-medium ${meta?.color ?? 'text-gray-500'}`} style={{ fontSize: '15px' }}>
              {displayValue.toFixed(1)}{meta ? ` — ${meta.label}` : ''}
            </span>
          ) : (
            <span className="text-gray-400" style={{ fontSize: '15px' }}>Не оценено</span>
          )}
        </div>
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

  const fs = '17.5px';

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="bg-white rounded-lg shadow-lg p-4 max-w-3xl mx-auto">
        {/* Логотип и название */}
        <div className="flex items-center gap-2 mb-2">
          <img src="/images/logo-small.svg" alt="Logo" style={{ width: '33.6px', height: '33.6px' }} />
          <h1 className="font-bold text-black" style={{ fontSize: '25.2px' }}>uzProc</h1>
        </div>

        <h2 className="font-bold text-gray-900 mb-2" style={{ fontSize: '22px' }}>Обратная связь по заявке на закупку</h2>

        {/* Важный блок */}
        <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-3">
          <p className="text-amber-800 leading-relaxed" style={{ fontSize: '14px' }}>
            <span className="font-semibold">Важно:</span> Данный опрос оценивает именно процесс закупки — от подачи заявки до подписания договора. Он не включает в себя оценку поставки товаров, работ и услуг.
          </p>
        </div>

        {submitted ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-green-800 font-medium" style={{ fontSize: fs }}>Спасибо! Ваш отзыв успешно отправлен.</p>
            <p className="text-green-700 mt-1" style={{ fontSize: '14px' }}>Оценку изменить невозможно. Вы помогаете улучшить процессы закупок.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Информация о заявке */}
            <div className="space-y-1.5 border-b border-gray-200 pb-2">
              <h3 className="font-semibold text-gray-900" style={{ fontSize: '18px' }}>Информация о заявке</h3>
              {[
                { label: 'Номер заявки:', value: purchaseRequestInfo.idPurchaseRequest || purchaseRequestInfo.innerId || '-' },
                { label: 'Наименование:', value: purchaseRequestInfo.purchaseRequestSubject || '-' },
                { label: 'Сумма:', value: formatCurrency(purchaseRequestInfo.budgetAmount, purchaseRequestInfo.currency) },
                { label: 'Закупщик:', value: purchaseRequestInfo.purchaser || '-' },
              ].map(({ label, value }) => (
                <div key={label} className="grid grid-cols-[130px_1fr] gap-2 items-center">
                  <label className="font-medium text-gray-700" style={{ fontSize: fs }}>{label}</label>
                  <div className="px-2 py-1.5 text-gray-900 bg-gray-50 rounded border border-gray-200" style={{ fontSize: fs }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Вопросы оценки */}
            <div className="space-y-3 border-b border-gray-200 pb-3">
              <h3 className="font-semibold text-gray-900" style={{ fontSize: '18px' }}>Оценка</h3>

              {/* Вопрос 1 */}
              <div>
                <label className="block font-medium text-gray-700 mb-0.5" style={{ fontSize: fs }}>
                  1. Скорость проведения закупки
                </label>
                <p className="text-gray-500 bg-blue-50 border border-blue-100 rounded px-2.5 py-1.5 mb-1.5 leading-relaxed" style={{ fontSize: '13px' }}>
                  {QUESTION_HINTS.speedRating}
                </p>
                <StarRating rating={formData.speedRating} onRatingChange={(r) => handleRatingChange('speedRating', r)} question="speedRating" />
              </div>

              {/* Вопрос 2 */}
              <div>
                <label className="block font-medium text-gray-700 mb-0.5" style={{ fontSize: fs }}>
                  2. Качество результата
                </label>
                <p className="text-gray-500 bg-blue-50 border border-blue-100 rounded px-2.5 py-1.5 mb-1.5 leading-relaxed" style={{ fontSize: '13px' }}>
                  {QUESTION_HINTS.qualityRating}
                </p>
                <StarRating rating={formData.qualityRating} onRatingChange={(r) => handleRatingChange('qualityRating', r)} question="qualityRating" />
              </div>

              {/* Вопрос 3 */}
              <div>
                <label className="block font-medium text-gray-700 mb-0.5" style={{ fontSize: fs }}>
                  3. Работа закупщика (коммуникация и бизнес-ориентированность)
                </label>
                <p className="text-gray-500 bg-blue-50 border border-blue-100 rounded px-2.5 py-1.5 mb-1.5 leading-relaxed" style={{ fontSize: '13px' }}>
                  {QUESTION_HINTS.satisfactionRating}
                </p>
                <StarRating rating={formData.satisfactionRating} onRatingChange={(r) => handleRatingChange('satisfactionRating', r)} question="satisfactionRating" />
              </div>
            </div>

            {/* Вопрос 4 — uzProc */}
            <div className="space-y-2 border-b border-gray-200 pb-3">
              <div>
                <p className="font-medium text-gray-700 mb-1" style={{ fontSize: fs }}>
                  4. Пользовались ли вы системой uzProc? <span className="text-gray-400 font-normal">(необязательно)</span>
                </p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="usedUzproc" value="true" checked={formData.usedUzproc === true}
                      onChange={() => handleInputChange('usedUzproc', true)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                    <span className="text-gray-900" style={{ fontSize: fs }}>Да</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="usedUzproc" value="false" checked={formData.usedUzproc === false}
                      onChange={() => { handleInputChange('usedUzproc', false); handleInputChange('uzprocRating', 0); }}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                    <span className="text-gray-900" style={{ fontSize: fs }}>Нет</span>
                  </label>
                </div>
              </div>

              {formData.usedUzproc === true && (
                <div>
                  <label className="block font-medium text-gray-700 mb-0.5" style={{ fontSize: fs }}>
                    Оцените удобство системы uzProc
                  </label>
                  <p className="text-gray-500 bg-blue-50 border border-blue-100 rounded px-2.5 py-1.5 mb-1.5 leading-relaxed" style={{ fontSize: '13px' }}>
                    {QUESTION_HINTS.uzprocRating}
                  </p>
                  <StarRating rating={formData.uzprocRating} onRatingChange={(r) => handleRatingChange('uzprocRating', r)} question="uzprocRating" />
                </div>
              )}
            </div>

            {/* Комментарий */}
            <div>
              <label htmlFor="comment" className="block font-medium text-gray-700 mb-0.5" style={{ fontSize: fs }}>
                Опишите, чтобы мы могли улучшить
              </label>
              <textarea
                id="comment"
                value={formData.comment}
                onChange={(e) => handleInputChange('comment', e.target.value)}
                rows={2}
                className="w-full px-2.5 py-1.5 text-gray-900 border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                style={{ fontSize: fs }}
                placeholder="Введите ваш комментарий (необязательно)"
              />
            </div>

            {/* Кнопка + предупреждение */}
            <div className="flex items-center justify-between pt-0.5">
              <p className="text-gray-400" style={{ fontSize: '13px' }}>
                Оценку можно отправить только один раз. После отправки изменить её невозможно.
              </p>
              <button
                type="submit"
                disabled={submitting}
                className="ml-4 flex-shrink-0 px-5 py-1.5 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontSize: fs }}
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
