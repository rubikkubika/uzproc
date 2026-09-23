import type { PurchasePlanItem } from '@/app/purchase-plan/_components/types/purchase-plan-items.types';
import type {
  GuideCheckedRow,
  GuidePurchaserRow,
  GuideSubjectExamples,
} from '../types/draft-guide.types';
import {
  GUIDE_PURCHASERS_LIMIT,
  GUIDE_UNASSIGNED,
  GUIDE_WEAK_SUBJECT_MAX_LENGTH,
  GUIDE_WEAK_SUBJECT_PATTERN,
} from '../constants/draft-guide.constants';

/**
 * Сводка для инструкции: строка «Не назначен» первой (с неё начинают распределение),
 * дальше закупщики по убыванию числа позиций.
 */
export function pickPurchasers(rows: GuidePurchaserRow[]): GuidePurchaserRow[] {
  const unassigned = rows.filter(row => row.purchaser === GUIDE_UNASSIGNED);
  const assigned = rows
    .filter(row => row.purchaser !== GUIDE_UNASSIGNED)
    .sort((a, b) => b.count - a.count)
    .slice(0, GUIDE_PURCHASERS_LIMIT);
  return [...unassigned, ...assigned];
}

/** Предмет закупки без лишних пробелов; пустые значения отбрасываются */
function subjectOf(item: PurchasePlanItem): string | null {
  const value = (item.purchaseSubject || '').trim();
  return value.length > 0 ? value : null;
}

/**
 * Пример «так не надо» из позиций драфта: номер договора или название контрагента
 * вместо предмета закупки. Образец удачной формулировки задан в инструкции —
 * в самом драфте такие встречаются редко.
 */
export function pickSubjectExamples(items: PurchasePlanItem[]): GuideSubjectExamples {
  const weak = items
    .map(subjectOf)
    .filter((value): value is string => value !== null)
    .filter(value => GUIDE_WEAK_SUBJECT_PATTERN.test(value) || value.length <= GUIDE_WEAK_SUBJECT_MAX_LENGTH)
    .sort((a, b) => a.length - b.length);

  return { bad: weak[0] ?? null };
}

/**
 * Пара позиций для примера отметки «Проверено закупщиком»: одна без отметки, одна с отметкой.
 * Если отмеченных ещё нет, берём две неотмеченные — пример остаётся из реальных данных.
 */
export function pickCheckedExamples(items: PurchasePlanItem[]): GuideCheckedRow[] {
  const withSubject = items.filter(item => subjectOf(item) !== null);
  const toRow = (item: PurchasePlanItem, checked: boolean): GuideCheckedRow => ({
    subject: subjectOf(item) as string,
    purchaser: item.purchaser,
    checked,
  });

  const unchecked = withSubject.find(item => !item.purchaserChecked);
  const checked = withSubject.find(item => item.purchaserChecked && item.id !== unchecked?.id);

  const rows: GuideCheckedRow[] = [];
  if (unchecked) rows.push(toRow(unchecked, false));
  if (checked) {
    rows.push(toRow(checked, true));
  } else {
    // Отмеченных позиций ещё нет — показываем, как будет выглядеть вторая строка после отметки
    const next = withSubject.find(item => item.id !== unchecked?.id);
    if (next) rows.push(toRow(next, true));
  }
  return rows;
}
