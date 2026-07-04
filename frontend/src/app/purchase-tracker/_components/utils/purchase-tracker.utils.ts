import {
  DONE_PILL,
  STATE_LABELS,
  STATE_PALETTE,
  STATUS_PILLS,
} from '../constants/purchase-tracker.constants';
import type {
  DetailView,
  Procurement,
  ResultView,
  StageView,
  StepView,
} from '../types/purchase-tracker.types';

/** Статус-пилюля закупки (для карточки результата и шапки детали) */
export function getStatusPill(item: Procurement) {
  return item.done ? DONE_PILL : STATUS_PILLS[item.stageIdx];
}

/** Совпадает ли закупка с поисковым запросом (по номеру, названию, ФИО инициатора) */
export function matchProcurement(item: Procurement, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    String(item.id).includes(q) ||
    item.title.toLowerCase().includes(q) ||
    item.initiator.toLowerCase().includes(q)
  );
}

/** Инициалы по ФИО (для аватара закупщика) */
function initials(fullName: string): string {
  return fullName
    .split(' ')
    .map((w) => w[0])
    .join('');
}

/** Только ФИО инициатора без должности/отдела: «ФИО (Отдел, Должность)» → «ФИО». */
function nameOnly(initiator: string): string {
  const paren = initiator.indexOf('(');
  return (paren >= 0 ? initiator.slice(0, paren) : initiator).trim();
}

/** Модель карточки результата поиска */
export function buildResultView(item: Procurement, selectedId: number): ResultView {
  const pill = getStatusPill(item);
  const selected = item.id === selectedId;
  return {
    id: item.id,
    title: item.title,
    budget: item.budget,
    initiator: nameOnly(item.initiator),
    statusShort: pill.label,
    pillBg: pill.bg,
    pillFg: pill.fg,
    border: selected ? '#7C3AED' : '#E6E8F0',
    shadow: selected ? '0 0 0 3px rgba(124,58,237,.13)' : '0 1px 2px rgba(16,24,40,.04)',
    dots: item.stages.map((stg) => ({
      bg: STATE_PALETTE[stg.state].dot,
      label: stg.name,
      fg: stg.state === 'wait' ? '#B0B7C3' : '#667085',
    })),
    selected,
    kind: item.kind,
  };
}

/** Модель одного этапа трек-ленты */
function buildStageView(
  stage: Procurement['stages'][number],
  index: number,
  total: number,
  simpleLanguage: boolean,
): StageView {
  const palette = STATE_PALETTE[stage.state];

  const steps: StepView[] = stage.steps.map((sp) => ({
    who: simpleLanguage ? sp.plain : sp.off,
    date: sp.date,
    days: sp.days ? `${sp.days} дн.` : '',
    isCurrent: sp.state === 'current',
    rowBg: sp.state === 'current' ? '#FFF7E0' : 'transparent',
    dot: STATE_PALETTE[sp.state].dot,
    fg: sp.state === 'wait' ? '#98A2B3' : '#344054',
  }));

  return {
    name: simpleLanguage ? stage.name : stage.off || stage.name,
    note: stage.note || '',
    date: stage.date || '',
    num: index + 1,
    isDone: stage.state === 'done',
    isCurrent: stage.state === 'current',
    isWait: stage.state === 'wait',
    dotBg: stage.state === 'wait' ? '#fff' : palette.dot,
    dotBorder: stage.state === 'wait' ? '2px solid #D8DDE6' : `2px solid ${palette.dot}`,
    animate: stage.state === 'current',
    nameFg: stage.state === 'wait' ? '#98A2B3' : '#101828',
    stateLabel: STATE_LABELS[stage.state],
    chipBg: palette.bg,
    chipFg: palette.fg,
    notLast: index < total - 1,
    lineBg: stage.state === 'done' ? '#16A34A' : '#E4E7EE',
    hasSteps: steps.length > 0,
    steps,
  };
}

/** Модель детальной карточки закупки */
export function buildDetailView(item: Procurement, simpleLanguage: boolean, showForecast: boolean): DetailView {
  const pill = getStatusPill(item);
  const total = item.stages.length;

  const signedLine =
    item.done && item.signed
      ? `Договор подписан ${item.signed} · ${item.contractor} · ${item.contractSum}`
      : '';

  return {
    id: item.id,
    title: item.title,
    budget: item.budget,
    initiator: nameOnly(item.initiator),
    created: item.created,
    buyer: item.buyer,
    phone: item.phone,
    buyerInit: initials(item.buyer),
    statusLabel: pill.label,
    pillBg: pill.bg,
    pillFg: pill.fg,
    plainBig: item.plain,
    forecast: item.forecast || '',
    showForecast: showForecast && !item.done && !!item.forecast,
    isDone: item.done,
    signedLine,
    stages: item.stages.map((stg, i) => buildStageView(stg, i, total, simpleLanguage)),
    kind: item.kind,
  };
}
