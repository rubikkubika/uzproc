// Типы для формы оценки работы закупок по спецификациям (по ЦФО за месяц)

/** Спецификация, попадающая в оценку (берётся из API контрактов). */
export interface SpecificationItem {
  id: number;
  innerId: string | null;
  title: string | null; // Предмет
  preparedBy: string | null; // ФИО закупщика (договорника)
  budgetAmount: number | null; // Сумма
  currency: string | null;
  contractCreationDate: string | null; // Дата подписания
  synchronizationDate: string | null; // Дата синхронизации (по ней отбираем в месяц)
}

/** Данные формы оценки. Две оценки: скорость и бизнес-ориентированность. */
export interface SpecificationFeedbackFormData {
  speedRating: number;
  businessRating: number;
  comment: string;
}

/** Метка рейтинга (цвет + подпись) по диапазону значений. */
export interface RatingLabel {
  min: number;
  max: number;
  label: string;
  color: string;
}

/** Вопрос формы. */
export interface FeedbackQuestion {
  key: keyof Pick<SpecificationFeedbackFormData, 'speedRating' | 'businessRating'>;
  title: string;
  hint: string;
}
