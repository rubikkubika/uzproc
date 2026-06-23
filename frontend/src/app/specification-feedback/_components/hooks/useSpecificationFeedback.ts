import { useCallback, useEffect, useState } from 'react';
import { SpecificationFeedbackFormData, SpecificationItem } from '../types/specification-feedback.types';
import {
  DEFAULT_CFO,
  DEFAULT_MONTH,
  DEFAULT_YEAR,
} from '../constants/specification-feedback.constants';
import { useSpecificationsData } from './useSpecificationsData';

/** Главный хук формы оценки спецификаций: состояние выбора, данные, оценки. */
export function useSpecificationFeedback() {
  const { fetchCfoNames, fetchSpecifications } = useSpecificationsData();

  // Выбор периода и ЦФО
  const [cfoNames, setCfoNames] = useState<string[]>([]);
  const [selectedCfo, setSelectedCfo] = useState<string>(DEFAULT_CFO);
  const [selectedYear, setSelectedYear] = useState<number>(DEFAULT_YEAR);
  const [selectedMonth, setSelectedMonth] = useState<number>(DEFAULT_MONTH);

  // Список спецификаций
  const [specifications, setSpecifications] = useState<SpecificationItem[]>([]);
  const [loadingSpecs, setLoadingSpecs] = useState(false);
  const [specsError, setSpecsError] = useState<string | null>(null);

  // Оценки
  const [formData, setFormData] = useState<SpecificationFeedbackFormData>({
    speedRating: 0,
    businessRating: 0,
    comment: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Загрузка списка ЦФО
  useEffect(() => {
    fetchCfoNames().then(setCfoNames);
  }, [fetchCfoNames]);

  // Загрузка спецификаций при изменении ЦФО/года/месяца
  useEffect(() => {
    let cancelled = false;
    setLoadingSpecs(true);
    setSpecsError(null);
    fetchSpecifications(selectedCfo, selectedYear, selectedMonth)
      .then((items) => {
        if (!cancelled) setSpecifications(items);
      })
      .catch(() => {
        if (!cancelled) {
          setSpecsError('Не удалось загрузить спецификации');
          setSpecifications([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSpecs(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchSpecifications, selectedCfo, selectedYear, selectedMonth]);

  const handleRatingChange = useCallback(
    (key: 'speedRating' | 'businessRating', value: number) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleCommentChange = useCallback((value: string) => {
    setFormData((prev) => ({ ...prev, comment: value }));
  }, []);

  // Сохранения пока нет — submit показывает экран благодарности (тестовый режим).
  const handleSubmit = useCallback(() => {
    if (!formData.speedRating || formData.speedRating <= 0) {
      alert('Пожалуйста, оцените скорость проведения закупки');
      return;
    }
    if (!formData.businessRating || formData.businessRating <= 0) {
      alert('Пожалуйста, оцените работу исполнителя');
      return;
    }
    setSubmitting(true);
    // Тестовый режим: имитируем отправку без сохранения в БД.
    setSubmitted(true);
    setSubmitting(false);
  }, [formData]);

  return {
    // выбор
    cfoNames,
    selectedCfo,
    setSelectedCfo,
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    // данные
    specifications,
    loadingSpecs,
    specsError,
    // форма
    formData,
    submitting,
    submitted,
    handleRatingChange,
    handleCommentChange,
    handleSubmit,
  };
}
