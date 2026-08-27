/** Прямоугольник подсвечиваемого элемента в координатах вьюпорта. */
export interface TourRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Строка списка внутри шага: термин (необязательный) и пояснение к нему. */
export interface TourListItem {
  /** Выделенный термин в начале строки — напр. «Дедл.» или «В работе». */
  term?: string;
  text: string;
}

/**
 * Блок описания шага. Текст подсказок собирается из блоков,
 * чтобы в карточке были абзацы и списки, а не сплошной текст.
 */
export type TourBlock =
  | { kind: 'text'; text: string }
  | { kind: 'list'; items: TourListItem[] }
  | { kind: 'note'; text: string };

/** Шаг тура по интерфейсу. */
export interface TourStep {
  /** Уникальный ключ шага. */
  id: string;
  /**
   * Значение атрибута `data-tour` подсвечиваемого элемента.
   * `null` — шаг без привязки к элементу (карточка по центру экрана).
   */
  target: string | null;
  title: string;
  /** Описание шага: абзацы, списки и выделенные примечания. */
  body: TourBlock[];
}

/** Позиция карточки шага, вычисленная относительно подсвеченного элемента. */
export interface TourPopoverPosition {
  top: number;
  left: number;
}
