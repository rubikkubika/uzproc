'use client';

import React from 'react';
import StarRating from '../StarRating';
import { FEEDBACK_QUESTIONS } from '../constants/specification-feedback.constants';
import { SpecificationFeedbackFormData } from '../types/specification-feedback.types';

interface SpecificationFeedbackFormProps {
  formData: SpecificationFeedbackFormData;
  submitting: boolean;
  onRatingChange: (key: 'speedRating' | 'businessRating', value: number) => void;
  onCommentChange: (value: string) => void;
  onSubmit: () => void;
}

const fs = '17.5px';

/** Левая часть: форма с двумя вопросами (скорость, бизнес-ориентированность) и комментарием. */
export default function SpecificationFeedbackForm({
  formData,
  submitting,
  onRatingChange,
  onCommentChange,
  onSubmit,
}: SpecificationFeedbackFormProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-3"
    >
      <div className="space-y-3 border-b border-gray-200 pb-3">
        <h3 className="font-semibold text-gray-900" style={{ fontSize: '18px' }}>
          Оценка
        </h3>

        {FEEDBACK_QUESTIONS.map((question, index) => (
          <div key={question.key}>
            <label className="block font-medium text-gray-700 mb-0.5" style={{ fontSize: fs }}>
              {index + 1}. {question.title}
            </label>
            <p
              className="text-gray-500 bg-blue-50 border border-blue-100 rounded px-2.5 py-1.5 mb-1.5 leading-relaxed"
              style={{ fontSize: '13px' }}
            >
              {question.hint}
            </p>
            <StarRating
              rating={formData[question.key]}
              onRatingChange={(r) => onRatingChange(question.key, r)}
            />
          </div>
        ))}
      </div>

      {/* Комментарий */}
      <div>
        <label htmlFor="comment" className="block font-medium text-gray-700 mb-0.5" style={{ fontSize: fs }}>
          Опишите, чтобы мы могли улучшить
        </label>
        <textarea
          id="comment"
          value={formData.comment}
          onChange={(e) => onCommentChange(e.target.value)}
          rows={2}
          className="w-full px-2.5 py-1.5 text-gray-900 border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          style={{ fontSize: fs }}
          placeholder="Введите ваш комментарий (необязательно)"
        />
      </div>

      <div className="flex items-center justify-end pt-0.5">
        <button
          type="submit"
          disabled={submitting}
          className="flex-shrink-0 px-5 py-1.5 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ fontSize: fs }}
        >
          {submitting ? 'Отправка...' : 'Отправить'}
        </button>
      </div>
    </form>
  );
}
