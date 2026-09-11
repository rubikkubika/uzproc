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

/** Состояние и управление туром (результат useTour). */
export interface TourController {
  active: boolean;
  /** Полный список шагов — для оглавления тура. */
  steps: TourStep[];
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  isFirst: boolean;
  isLast: boolean;
  start: () => void;
  stop: () => void;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
}
