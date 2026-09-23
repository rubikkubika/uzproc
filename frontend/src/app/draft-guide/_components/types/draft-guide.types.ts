/** Типы инструкции «Как работать с драфтом плана закупок» (страница /draft-guide). */

/** Строка списка: выделенный термин и пояснение к нему. */
export interface GuideListItem {
  term?: string;
  text: string;
}

/** Карточка в паре «что попадает / что не попадает». */
export interface GuideCard {
  title: string;
  tone: 'accent' | 'neutral';
  items: string[];
}

/** Строка-подсказка с цветным бейджем слева. */
export interface GuideBadge {
  tone: 'accent' | 'danger';
  label: string;
  text: string;
}

/** Строка таблицы «откуда берутся поля». */
export interface GuideFieldRow {
  field: string;
  source: string;
  check: string;
}

/** Карточка «что подтвердить на встрече с ЦФО». */
export interface GuideConfirmCard {
  label: string;
  title: string;
  text: string;
}

/**
 * Блок описания шага инструкции.
 * Тексты могут содержать плейсхолдеры `{year}`, `{prevYear}`, `{sla}` —
 * они подставляются из данных драфта (см. `draft-guide.utils`).
 */
export type GuideBlock =
  | { kind: 'text'; text: string }
  | { kind: 'list'; items: GuideListItem[] }
  | { kind: 'ordered'; items: string[] }
  | { kind: 'cards'; cards: GuideCard[] }
  | { kind: 'badges'; items: GuideBadge[] }
  | { kind: 'fields'; rows: GuideFieldRow[] }
  | { kind: 'confirm'; cards: GuideConfirmCard[] }
  | { kind: 'chips'; items: string[] }
  /** Схема окна отбора договоров по сроку окончания */
  | { kind: 'figure-selection' }
  /** Схема расчёта дат на строке Ганта */
  | { kind: 'figure-dates' }
  /** Сводка по закупщикам текущего драфта */
  | { kind: 'example-purchasers' }
  /** Формулировка предмета: неудачная из драфта и образец из инструкции */
  | { kind: 'example-subjects' }
  /** Цепочка «комментарий → глазик → статус» */
  | { kind: 'example-exclude' }
  /** Две позиции драфта: без отметки и с отметкой «Проверено закупщиком» */
  | { kind: 'example-checked' };

/** Шаг инструкции: номер выводится по порядку. */
export interface GuideStep {
  id: string;
  title: string;
  blocks: GuideBlock[];
}

/** Строка сводки по закупщикам драфта. */
export interface GuidePurchaserRow {
  purchaser: string;
  count: number;
}

/** Позиция драфта в примере отметки «Проверено закупщиком». */
export interface GuideCheckedRow {
  subject: string;
  purchaser: string | null;
  checked: boolean;
}

/** Формулировка предмета закупки, взятая из позиций драфта как пример «так не надо». */
export interface GuideSubjectExamples {
  /** Название контрагента или номер документа вместо предмета */
  bad: string | null;
}

/**
 * Данные текущего драфта, которыми наполняется инструкция:
 * год, сроки SLA и примеры из реальных позиций.
 */
export interface GuideData {
  /** Год драфта */
  year: number | null;
  /** Предыдущий год (начало окна отбора договоров) */
  prevYear: number | null;
  /** Сроки по сложности 1–4 из таблицы SLA драфта, напр. «14 / 18 / 26 / 41» */
  sla: string | null;
  /** Сводка по закупщикам: «Не назначен» первой строкой */
  purchasers: GuidePurchaserRow[];
  /** Формулировка предмета из драфта для примера «так не надо» */
  subjects: GuideSubjectExamples;
  /** Примеры позиций для отметки «Проверено закупщиком» */
  checked: GuideCheckedRow[];
}
