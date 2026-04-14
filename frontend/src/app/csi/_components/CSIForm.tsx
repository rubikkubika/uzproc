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
  uzprocUsed: boolean | null;
  uzprocRating: number;
  comment: string;
}

// Моковые данные для отображения
const MOCK_PURCHASE_REQUEST_DATA = {
  purchaseRequestId: 'PR-2024-00123',
  subject: 'Закупка офисной мебели для нового офиса',
  amount: '15 500 000 UZS',
  purchaser: 'Иванов Иван Иванович',
};

const RATING_LABELS: { min: number; max: number; label: string; color: string }[] = [
  { min: 5.0, max: 5.0, label: 'Отлично', color: 'text-green-600' },
  { min: 4.0, max: 4.5, label: 'Хорошо', color: 'text-lime-600' },
  { min: 3.0, max: 3.5, label: 'Удовлетворительно', color: 'text-yellow-600' },
  { min: 2.0, max: 2.5, label: 'Ниже ожиданий', color: 'text-orange-500' },
  { min: 0.5, max: 1.5, label: 'Неудовлетворительно', color: 'text-red-500' },
];

function getRatingMeta(rating: number): { label: string; color: string } | null {
  if (rating === 0) return null;
  for (const entry of RATING_LABELS) {
    if (rating >= entry.min && rating <= entry.max) return entry;
  }
  return null;
}

const QUESTION_HINTS = {
  speedRating:
    'Оцените, насколько быстро была проведена закупка — от подачи заявки до заключения договора. Учитывайте, что срок зависит от сложности закупки (по Регламенту): Сложность 2 — 7 р.д., Сложность 3 — 15 р.д., Сложность 4 — договорная. Срок закупки может быть гарантирован, если закупка была в Плане закупок.',
  qualityRating:
    'Оцените качество итогового результата: соответствие ТЗ, выбранный поставщик, условия договора.',
  satisfactionRating:
    'Оцените работу закупщика: коммуникация, ориентированность на ваши потребности, помощь в решении вопросов.',
  uzprocRating: 'Оцените удобство системы uzProc при работе с заявкой.',
};

function StarRating({
  rating,
  onRatingChange,
}: {
  rating: number;
  onRatingChange: (rating: number) => void;
}) {
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
  const meta = getRatingMeta(hoveredValue ?? rating);

  return (
    <div className="flex items-center gap-2">
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
                <Star
                  className={`absolute inset-0 w-12 h-12 pointer-events-none ${isHovering ? 'fill-yellow-300 text-yellow-300' : 'fill-yellow-400 text-yellow-400'}`}
                />
              )}
              {isHalf && !isFull && (
                <div className="absolute inset-0 w-12 h-12 overflow-hidden pointer-events-none" style={{ clipPath: 'inset(0 50% 0 0)' }}>
                  <Star
                    className={`absolute inset-0 w-12 h-12 ${isHovering ? 'fill-yellow-300 text-yellow-300' : 'fill-yellow-400 text-yellow-400'}`}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>
      <div className="min-w-[110px]">
        {displayValue > 0 && (
          <span className={`text-sm font-medium ${meta?.color ?? 'text-gray-500'}`}>
            {displayValue.toFixed(1)}{meta ? ` — ${meta.label}` : ''}
          </span>
        )}
        {displayValue === 0 && (
          <span className="text-sm text-gray-400">Не оценено</span>
        )}
      </div>
    </div>
  );
}

function QuestionBlock({
  label,
  hint,
  rating,
  onRatingChange,
}: {
  label: string;
  hint: string;
  rating: number;
  onRatingChange: (r: number) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-0.5">{label}</label>
      <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded px-2 py-1 mb-1.5 leading-relaxed">
        {hint}
      </p>
      <StarRating rating={rating} onRatingChange={onRatingChange} />
    </div>
  );
}

export default function CSIForm() {
  const [formData, setFormData] = useState<CSIFormData>({
    purchaseRequestId: MOCK_PURCHASE_REQUEST_DATA.purchaseRequestId,
    subject: MOCK_PURCHASE_REQUEST_DATA.subject,
    amount: MOCK_PURCHASE_REQUEST_DATA.amount,
    speedRating: 0,
    qualityRating: 0,
    satisfactionRating: 0,
    uzprocUsed: null,
    uzprocRating: 0,
    comment: '',
  });

  const [submitted, setSubmitted] = useState(false);

  const handleRatingChange = (field: keyof CSIFormData, rating: number) => {
    setFormData((prev) => ({ ...prev, [field]: rating }));
  };

  const handleUzprocUsed = (value: boolean) => {
    setFormData((prev) => ({ ...prev, uzprocUsed: value, uzprocRating: value ? prev.uzprocRating : 0 }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('CSI Form Data:', formData);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4 max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-3">
          <img src="/images/logo-small.svg" alt="Logo" className="w-6 h-6" />
          <h1 className="text-lg font-bold text-black">uzProc</h1>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 font-medium text-sm">Спасибо! Ваш отзыв успешно отправлен.</p>
          <p className="text-green-700 text-xs mt-1">Оценку изменить невозможно. Вы помогаете улучшить процессы закупок.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-3 max-w-3xl mx-auto">
      {/* Шапка */}
      <div className="flex items-center gap-2 mb-1.5">
        <img src="/images/logo-small.svg" alt="Logo" className="w-6 h-6" />
        <h1 className="text-lg font-bold text-black">uzProc</h1>
      </div>

      <h2 className="text-base font-bold text-gray-900 mb-2">Форма обратной связи по заявке на закупку</h2>

      {/* Важный блок */}
      <div className="bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5 mb-3">
        <p className="text-xs text-amber-800 leading-relaxed">
          <span className="font-semibold">Важно:</span> Данный опрос оценивает именно процесс закупки — от подачи заявки до подписания договора. Он не включает в себя оценку поставки товаров, работ и услуг.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        {/* Информация о заявке */}
        <div className="space-y-1 border-b border-gray-200 pb-2">
          <h3 className="text-sm font-semibold text-gray-900">Информация о заявке</h3>

          {[
            { label: 'Номер заявки:', value: MOCK_PURCHASE_REQUEST_DATA.purchaseRequestId },
            { label: 'Предмет:', value: MOCK_PURCHASE_REQUEST_DATA.subject },
            { label: 'Сумма:', value: MOCK_PURCHASE_REQUEST_DATA.amount },
            { label: 'Закупщик:', value: MOCK_PURCHASE_REQUEST_DATA.purchaser },
          ].map(({ label, value }) => (
            <div key={label} className="grid grid-cols-[120px_1fr] gap-2 items-center">
              <label className="text-xs font-medium text-gray-700">{label}</label>
              <div className="px-2 py-1 text-xs text-gray-900 bg-gray-50 rounded border border-gray-200">{value}</div>
            </div>
          ))}
        </div>

        {/* Вопросы оценки */}
        <div className="space-y-3 border-b border-gray-200 pb-2">
          <h3 className="text-sm font-semibold text-gray-900">Оценка</h3>

          <QuestionBlock
            label="1. Скорость проведения закупки"
            hint={QUESTION_HINTS.speedRating}
            rating={formData.speedRating}
            onRatingChange={(r) => handleRatingChange('speedRating', r)}
          />

          <QuestionBlock
            label="2. Качество результата"
            hint={QUESTION_HINTS.qualityRating}
            rating={formData.qualityRating}
            onRatingChange={(r) => handleRatingChange('qualityRating', r)}
          />

          <QuestionBlock
            label="3. Работа закупщика (коммуникация и бизнес-ориентированность)"
            hint={QUESTION_HINTS.satisfactionRating}
            rating={formData.satisfactionRating}
            onRatingChange={(r) => handleRatingChange('satisfactionRating', r)}
          />
        </div>

        {/* Вопрос 4 — uzProc */}
        <div className="space-y-2 border-b border-gray-200 pb-2">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">
              4. Пользовались ли вы системой uzProc? <span className="text-gray-400 font-normal">(необязательно)</span>
            </p>
            <div className="flex gap-2">
              {[true, false].map((val) => (
                <button
                  key={String(val)}
                  type="button"
                  onClick={() => handleUzprocUsed(val)}
                  className={`px-4 py-1 text-sm rounded border transition-colors ${
                    formData.uzprocUsed === val
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {val ? 'Да' : 'Нет'}
                </button>
              ))}
            </div>
          </div>

          {formData.uzprocUsed === true && (
            <QuestionBlock
              label="Оцените удобство системы uzProc"
              hint={QUESTION_HINTS.uzprocRating}
              rating={formData.uzprocRating}
              onRatingChange={(r) => handleRatingChange('uzprocRating', r)}
            />
          )}
        </div>

        {/* Комментарий */}
        <div>
          <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-0.5">
            Опишите, чтобы мы могли улучшить
          </label>
          <textarea
            id="comment"
            value={formData.comment}
            onChange={(e) => setFormData((prev) => ({ ...prev, comment: e.target.value }))}
            rows={2}
            className="w-full px-2.5 py-1.5 text-sm text-gray-900 border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            placeholder="Введите ваш комментарий (необязательно)"
          />
        </div>

        {/* Кнопка + предупреждение */}
        <div className="flex items-center justify-between pt-0.5">
          <p className="text-xs text-gray-400">
            Оценку можно отправить только один раз. После отправки изменить её невозможно.
          </p>
          <button
            type="submit"
            className="ml-4 flex-shrink-0 px-5 py-1.5 text-sm bg-blue-600 text-white font-medium rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Отправить
          </button>
        </div>
      </form>
    </div>
  );
}
