import { FeedbackQuestion, RatingLabel } from '../types/specification-feedback.types';

/** ЦФО по умолчанию для теста. */
export const DEFAULT_CFO = 'M - Maintenance';

/** Месяц по умолчанию для теста (июнь, 1-based). */
export const DEFAULT_MONTH = 6;

/** Год по умолчанию для теста. */
export const DEFAULT_YEAR = 2026;

/** Тип документа для отбора спецификаций. */
export const DOCUMENT_FORM_SPECIFICATION = 'Спецификация';

/** Названия месяцев (1-based, индекс 0 не используется). */
export const MONTHS: { value: number; label: string }[] = [
  { value: 1, label: 'Январь' },
  { value: 2, label: 'Февраль' },
  { value: 3, label: 'Март' },
  { value: 4, label: 'Апрель' },
  { value: 5, label: 'Май' },
  { value: 6, label: 'Июнь' },
  { value: 7, label: 'Июль' },
  { value: 8, label: 'Август' },
  { value: 9, label: 'Сентябрь' },
  { value: 10, label: 'Октябрь' },
  { value: 11, label: 'Ноябрь' },
  { value: 12, label: 'Декабрь' },
];

/**
 * Вопросы формы. Формулировки и подсказки идентичны форме CSI
 * (см. frontend/src/app/csi/feedback/[token]/page.tsx).
 */
export const FEEDBACK_QUESTIONS: FeedbackQuestion[] = [
  {
    key: 'speedRating',
    title: 'Скорость обработки заявки',
    hint:
      'Скорость реагирования на потребность: насколько быстро отдел закупок отреагировал на вашу заявку и провёл её — от поступления потребности до поставки.',
  },
  {
    key: 'businessRating',
    title: 'Работа исполнителя (коммуникация и бизнес-ориентированность)',
    hint:
      'Оцените работу исполнителя: коммуникация, ориентированность на ваши потребности, помощь в решении вопросов.',
  },
];

/** Метки рейтинга (цвет + подпись), как в форме CSI. */
export const RATING_LABELS: RatingLabel[] = [
  { min: 5.0, max: 5.0, label: 'Отлично', color: 'text-green-600' },
  { min: 4.0, max: 4.5, label: 'Хорошо', color: 'text-lime-600' },
  { min: 3.0, max: 3.5, label: 'Удовлетворительно', color: 'text-yellow-600' },
  { min: 2.0, max: 2.5, label: 'Ниже ожиданий', color: 'text-orange-500' },
  { min: 0.5, max: 1.5, label: 'Неудовлетворительно', color: 'text-red-500' },
];
