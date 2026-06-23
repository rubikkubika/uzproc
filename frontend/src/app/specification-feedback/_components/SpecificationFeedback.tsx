'use client';

import React from 'react';
import { useSpecificationFeedback } from './hooks/useSpecificationFeedback';
import EvaluationSummary from './ui/EvaluationSummary';
import SpecificationFeedbackForm from './ui/SpecificationFeedbackForm';
import SpecificationsList from './ui/SpecificationsList';

/** Форма оценки работы закупок по спецификациям (по ЦФО за месяц). Тестовый режим. */
export default function SpecificationFeedback() {
  const {
    selectedCfo,
    selectedYear,
    selectedMonth,
    specifications,
    loadingSpecs,
    specsError,
    formData,
    submitting,
    submitted,
    handleRatingChange,
    handleCommentChange,
    handleSubmit,
  } = useSpecificationFeedback();

  // Сумма спецификаций и валюта (валюта берётся из первой спецификации).
  const totalSum = specifications.reduce((acc, s) => acc + (s.budgetAmount || 0), 0);
  const currency = specifications[0]?.currency ?? null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="bg-white rounded-lg shadow-lg p-4 max-w-screen-2xl mx-auto">
        {/* Логотип и название */}
        <div className="flex items-center gap-2 mb-2">
          <img src="/images/logo-small.svg" alt="Logo" style={{ width: '33.6px', height: '33.6px' }} />
          <h1 className="font-bold text-black" style={{ fontSize: '25.2px' }}>
            uzProc
          </h1>
        </div>

        {/* Две колонки: форма слева, список справа (списку больше места) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          <div className="lg:col-span-4">
            <h2 className="font-bold text-gray-900 mb-2" style={{ fontSize: '22px' }}>
              Оценка работы отдела закупок по договорному направлению
            </h2>

            {/* Важный блок */}
            <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-3">
              <p className="text-amber-800 leading-relaxed" style={{ fontSize: '14px' }}>
                <span className="font-semibold">Важно:</span> Оценка ставится по ЦФО за месяц. Оцениваются
                завершённые (подписанные) спецификации, у которых дата подписания приходится на
                выбранный месяц.
              </p>
            </div>

            {/* Сводка: период, сумма спецификаций, количество */}
            <EvaluationSummary
              cfo={selectedCfo}
              year={selectedYear}
              month={selectedMonth}
              totalSum={totalSum}
              currency={currency}
              count={specifications.length}
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
              <SpecificationFeedbackForm
                formData={formData}
                submitting={submitting}
                onRatingChange={handleRatingChange}
                onCommentChange={handleCommentChange}
                onSubmit={handleSubmit}
              />
            )}
          </div>

          <div className="lg:col-span-8">
            <SpecificationsList
              specifications={specifications}
              loading={loadingSpecs}
              error={specsError}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
