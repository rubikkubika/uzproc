/** Утилиты форматирования для дашборда «SLA договоров». */

export const MONTH_NAMES = [
  'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
  'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек',
];

export const MONTH_NAMES_FULL = [
  'январе', 'феврале', 'марте', 'апреле', 'мае', 'июне',
  'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре',
];

/** Дата в формате ДД.ММ.ГГГГ; «—» если даты нет. */
export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Отклонение с явным знаком: «+2», «-1», «0»; «—» если отклонение не рассчитано. */
export function formatDelta(delta: number | null): string {
  if (delta == null) return '—';
  return delta > 0 ? `+${delta}` : String(delta);
}

/** Классы бейджа отклонения: просрочка — красный, точно в срок — серый, запас — зелёный. */
export function deltaBadgeClasses(delta: number | null): string {
  if (delta == null) return 'bg-gray-100 text-gray-400';
  if (delta < 0) return 'bg-red-600 text-white';
  if (delta === 0) return 'bg-gray-200 text-gray-700';
  return 'bg-green-600 text-white';
}

/** Форма документа с типовостью: «Договор (типовой)». */
export function formatDocumentForm(documentForm: string | null, isTypicalForm: boolean | null): string {
  if (!documentForm) return '—';
  if (isTypicalForm == null) return documentForm;
  return `${documentForm} (${isTypicalForm ? 'типовой' : 'нетиповой'})`;
}

/** Пара «факт / план» рабочих дней: «3 / 2»; «—» если факта нет. */
export function formatFactPlan(factual: number | null, planned: number | null): string {
  if (factual == null) return '—';
  return planned != null ? `${factual} / ${planned}` : String(factual);
}
