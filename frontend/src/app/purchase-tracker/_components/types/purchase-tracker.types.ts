/** Состояние этапа или шага согласования */
export type StageState = 'done' | 'current' | 'wait';

/** Один шаг внутри этапа (например, конкретный согласующий) */
export interface TrackerStep {
  /** Упрощённое (человеческое) название */
  plain: string;
  /** Официальное название роли/шага */
  off: string;
  state: StageState;
  /** Дата завершения (DD.MM), пусто если ещё не завершён */
  date: string;
  /** Длительность шага в днях (0 — не показывать) */
  days: number;
}

/** Крупный этап закупки */
export interface TrackerStage {
  /** Упрощённое название этапа */
  name: string;
  /** Официальное название этапа */
  off: string;
  state: StageState;
  /** Дата завершения этапа (DD.MM.YYYY) */
  date: string;
  /** Подпись под этапом */
  note: string;
  steps: TrackerStep[];
}

/** Закупка целиком */
export interface Procurement {
  id: number;
  title: string;
  budget: string;
  initiator: string;
  buyer: string;
  phone: string;
  /** Дата создания заявки, DD.MM.YYYY */
  created: string;
  /** Индекс текущего этапа (0..3) */
  stageIdx: 0 | 1 | 2 | 3;
  /** Договор подписан — закупка завершена */
  done: boolean;
  /** Прогноз даты договора, например «к 5 августа» */
  forecast?: string;
  /** Данные подписанного договора (только для done) */
  signed?: string;
  contractor?: string;
  contractSum?: string;
  /** Статус одной фразой */
  plain: string;
  stages: TrackerStage[];
  /** Тип: «Закупка» (требует закупки) или «Заказ» (прямой заказ) */
  kind: string;
}

/** Готовая к рендеру модель шага */
export interface StepView {
  who: string;
  date: string;
  days: string;
  isCurrent: boolean;
  rowBg: string;
  dot: string;
  fg: string;
}

/** Готовая к рендеру модель этапа */
export interface StageView {
  name: string;
  note: string;
  date: string;
  num: number;
  isDone: boolean;
  isCurrent: boolean;
  isWait: boolean;
  dotBg: string;
  dotBorder: string;
  animate: boolean;
  nameFg: string;
  stateLabel: string;
  chipBg: string;
  chipFg: string;
  notLast: boolean;
  lineBg: string;
  hasSteps: boolean;
  steps: StepView[];
}

/** Готовая к рендеру модель детальной карточки */
export interface DetailView {
  id: number;
  title: string;
  budget: string;
  initiator: string;
  created: string;
  buyer: string;
  phone: string;
  buyerInit: string;
  statusLabel: string;
  pillBg: string;
  pillFg: string;
  plainBig: string;
  forecast: string;
  showForecast: boolean;
  isDone: boolean;
  signedLine: string;
  stages: StageView[];
  kind: string;
}

/** Готовая к рендеру модель карточки результата поиска */
export interface ResultView {
  id: number;
  title: string;
  budget: string;
  initiator: string;
  statusShort: string;
  pillBg: string;
  pillFg: string;
  border: string;
  shadow: string;
  dots: { bg: string }[];
  selected: boolean;
  kind: string;
}
