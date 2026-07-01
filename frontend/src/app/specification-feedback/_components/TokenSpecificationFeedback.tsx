'use client';

import React from 'react';
import { useTokenSpecificationFeedback } from './hooks/useTokenSpecificationFeedback';
import { MONTHS } from './constants/specification-feedback.constants';
import EvaluationSummary from './ui/EvaluationSummary';
import SpecificationFeedbackForm from './ui/SpecificationFeedbackForm';
import SpecificationsList from './ui/SpecificationsList';

interface TokenSpecificationFeedbackProps {
  token: string;
}

/** Публичная форма оценки по токену приглашения (ЦФО за месяц). */
export default function TokenSpecificationFeedback({ token }: TokenSpecificationFeedbackProps) {
  const {
    form,
    loading,
    loadError,
    specifications,
    formData,
    submitting,
    submitted,
    submitError,
    handleRatingChange,
    handleCommentChange,
    handleSubmit,
  } = useTokenSpecificationFeedback(token);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (loadError || !form) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md text-center">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Ссылка недоступна</h1>
          <p className="text-gray-600 text-sm">{loadError ?? 'Приглашение не найдено'}</p>
        </div>
      </div>
    );
  }

  const totalSum = form.totalAmount ?? 0;
  const currency = specifications[0]?.currency ?? null;
  const monthLabel = MONTHS.find((m) => m.value === form.periodMonth)?.label ?? '';

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="bg-white rounded-lg shadow-lg p-4 max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-2 mb-2">
          <img src="/images/logo-small.svg" alt="Logo" style={{ width: '33.6px', height: '33.6px' }} />
          <h1 className="font-bold text-black" style={{ fontSize: '25.2px' }}>
            uzProc
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          <div className="lg:col-span-4">
            <h2 className="font-bold text-gray-900 mb-2" style={{ fontSize: '22px' }}>
              Оценка работы отдела закупок по договорному направлению
            </h2>

            <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-3">
              <p className="text-amber-800 leading-relaxed" style={{ fontSize: '14px' }}>
                <span className="font-semibold">Важно:</span> Оценка ставится по ЦФО{' '}
                <span className="font-semibold">{form.cfoName}</span> за{' '}
                <span className="font-semibold">
                  {monthLabel} {form.periodYear}
                </span>
                . Оцениваются завершённые (подписанные) спецификации, у которых дата подписания
                приходится на этот месяц.
              </p>
            </div>

            <EvaluationSummary
              cfo={form.cfoName}
              year={form.periodYear}
              month={form.periodMonth}
              totalSum={totalSum}
              currency={currency}
              count={form.specificationCount}
            />

            {submitted ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-green-800 font-medium" style={{ fontSize: '17.5px' }}>
                  Спасибо! Ваша оценка принята.
                </p>
                <p className="text-green-700 mt-1" style={{ fontSize: '14px' }}>
                  Вы помогаете улучшить процессы закупок.
                </p>
              </div>
            ) : (
              <>
                {submitError && (
                  <div className="bg-red-50 border border-red-200 rounded px-3 py-2 mb-2 text-red-700 text-sm">
                    {submitError}
                  </div>
                )}
                <SpecificationFeedbackForm
                  formData={formData}
                  submitting={submitting}
                  onRatingChange={handleRatingChange}
                  onCommentChange={handleCommentChange}
                  onSubmit={handleSubmit}
                />
              </>
            )}
          </div>

          <div className="lg:col-span-8">
            <SpecificationsList specifications={specifications} loading={false} error={null} />
          </div>
        </div>
      </div>
    </div>
  );
}
