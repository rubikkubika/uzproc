import { useCallback, useEffect, useState } from 'react';
import {
  fetchSpecificationFeedbackForm,
  submitSpecificationFeedback,
  SpecificationFeedbackForm,
} from '@/utils/specification-feedback.api';
import { SpecificationFeedbackFormData, SpecificationItem } from '../types/specification-feedback.types';

/**
 * Хук публичной формы оценки по токену приглашения:
 * загрузка зафиксированного снимка спецификаций и сохранение оценки.
 */
export function useTokenSpecificationFeedback(token: string) {
  const [form, setForm] = useState<SpecificationFeedbackForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formData, setFormData] = useState<SpecificationFeedbackFormData>({
    speedRating: 0,
    businessRating: 0,
    comment: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    fetchSpecificationFeedbackForm(token, controller.signal)
      .then((data) => {
        setForm(data);
        if (data.submitted) {
          setSubmitted(true);
          setFormData({
            speedRating: data.speedRating ?? 0,
            businessRating: data.businessRating ?? 0,
            comment: data.comment ?? '',
          });
        }
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        setLoadError(err instanceof Error ? err.message : 'Ошибка загрузки');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [token]);

  const handleRatingChange = useCallback(
    (key: 'speedRating' | 'businessRating', value: number) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleCommentChange = useCallback((value: string) => {
    setFormData((prev) => ({ ...prev, comment: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!formData.speedRating || formData.speedRating <= 0) {
      alert('Пожалуйста, оцените скорость проведения закупки');
      return;
    }
    if (!formData.businessRating || formData.businessRating <= 0) {
      alert('Пожалуйста, оцените работу исполнителя');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitSpecificationFeedback(token, {
        speedRating: formData.speedRating,
        businessRating: formData.businessRating,
        comment: formData.comment,
      });
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSubmitting(false);
    }
  }, [token, formData]);

  // Снимок спецификаций в форму списка (id и дата — из снимка приглашения).
  const specifications: SpecificationItem[] = (form?.items ?? []).map((item, idx) => ({
    id: item.contractId ?? idx,
    innerId: item.innerId,
    title: item.title,
    preparedBy: item.preparedBy,
    budgetAmount: item.budgetAmount,
    currency: item.currency,
    contractCreationDate: item.synchronizationDate,
    synchronizationDate: item.synchronizationDate,
  }));

  return {
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
  };
}
