/**
 * Отклонения от дедлайнов этапов договора (считаются на бэкенде).
 *
 * Этап «Подготовка» (время на подготовку и запуск, включая согласование с КА):
 * - Договор / Дополнительное соглашение: типовой — 2, нетиповой — 4;
 * - Спецификация: типовая — 1, нетиповая — 3;
 * - Импортный договор пока считается как нетиповой (4).
 *
 * Этап «Согласование» (согласование в 1С ДО):
 * - Договор: типовой — 3, нетиповой — 5;
 * - Дополнительное соглашение: 5;
 * - Спецификация: 1;
 * - Импортный договор пока считается как нетиповой (5).
 *
 * Этап «Подписание» (регистрация, для спецификаций — синхронизация):
 * - Договор / Дополнительное соглашение: 2;
 * - Спецификация: 1.
 *
 * Все сроки — в рабочих днях, день назначения не считается.
 * Дельта = план − факт: плюс — запас по сроку, минус — просрочка.
 */

/** Визуальный вариант бейджа отклонения. */
export type SlaDeltaVariant = 'ok' | 'low' | 'overdue' | 'zero';

/** Доля остатка от планового срока, ниже которой запас считается «на грани» (жёлтый). */
const LOW_REMAINDER_PERCENT = 30;

/** Остаток срока в процентах от планового (только для положительной дельты). */
export function getRemainderPercent(delta: number, planned: number | null): number | null {
  if (planned == null || planned <= 0 || delta <= 0) return null;
  return (delta / planned) * 100;
}

/** Вариант отображения дельты: запас / запас на грани / просрочка / точно в срок. */
export function getSlaDeltaVariant(delta: number, planned: number | null): SlaDeltaVariant {
  if (delta < 0) return 'overdue';
  if (delta === 0) return 'zero';
  const remainderPct = getRemainderPercent(delta, planned);
  return remainderPct != null && remainderPct <= LOW_REMAINDER_PERCENT ? 'low' : 'ok';
}

/** Подпись дельты: «+2», «-1», «0». */
export function formatSlaDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : String(delta);
}

/** Строки подсказки по дедлайну для тултипа этапа («подготовки» / «согласования»). */
export function buildSlaTooltipLines(
  stageLabel: string,
  plannedSlaDays: number | null,
  factualDays: number | null,
  slaDelta: number | null
): string[] {
  if (plannedSlaDays == null) return [];
  const lines: string[] = [`Дедлайн ${stageLabel} (план): ${plannedSlaDays} раб. дн.`];
  if (factualDays != null) {
    lines.push(`Факт: ${factualDays} раб. дн.`);
  }
  if (slaDelta != null) {
    lines.push(
      slaDelta < 0
        ? `Отклонение: ${slaDelta} дн. (просрочка)`
        : slaDelta === 0
          ? 'Отклонение: 0 дн. (точно в срок)'
          : `Отклонение: +${slaDelta} дн. (запас)`
    );
  }
  return lines;
}
