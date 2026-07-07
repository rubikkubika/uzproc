import { useMemo } from 'react';
import {
  PURCHASER_DISTRIBUTION_REQUESTS,
  CATEGORY_OWNERS,
  PurchaserRequestRow,
} from '../constants/purchaserDistributionRequests';

/** Строка распределения по статье расходов внутри группы закупщика. */
export interface DistributionSubjectRow {
  /** Предмет (статья расходов) */
  subject: string;
  /** Количество заявок */
  count: number;
  /** Бюджет, млн */
  budgetMln: number;
  /** Сложность (сумма баллов) */
  complexity: number;
}

/** Группа предполагаемого распределения по одному закупщику. */
export interface DistributionGroup {
  /** Предполагаемый закупщик */
  buyer: string;
  /** Тематический блок (категория) */
  theme: string;
  /** Новый закупщик (ещё не представлен) */
  isNew?: boolean;
  /** Статьи расходов закупщика */
  items: DistributionSubjectRow[];
}

/** Итоговые суммы по группе/всему дашборду. */
export interface DistributionTotals {
  count: number;
  budgetMln: number;
  complexity: number;
}

/** Строка сводки «текущий → предполагаемый закупщик». */
export interface PurchaserBalanceRow {
  purchaser: string;
  /** Заявок ведёт сейчас */
  currentCount: number;
  /** Заявок предполагается */
  proposedCount: number;
  isNew?: boolean;
}

/** Бюджет в млн из суммы в валюте. */
function toMln(amount: number): number {
  return amount / 1_000_000;
}

/**
 * Агрегирует статический датасет заявок в предлагаемое распределение
 * по предполагаемым закупщикам (владельцам категорий) → статьям расходов.
 */
export function usePurchaserDistribution(rows: PurchaserRequestRow[] = PURCHASER_DISTRIBUTION_REQUESTS) {
  const groups = useMemo<DistributionGroup[]>(() => {
    // buyer -> subject -> агрегаты
    const byBuyer = new Map<string, Map<string, DistributionSubjectRow>>();
    const themeByBuyer = new Map<string, string>();

    for (const row of rows) {
      const buyer = row.proposedPurchaser;
      if (!themeByBuyer.has(buyer)) themeByBuyer.set(buyer, row.category);
      const subjects = byBuyer.get(buyer) ?? new Map<string, DistributionSubjectRow>();
      const item = subjects.get(row.expenseItem) ?? {
        subject: row.expenseItem,
        count: 0,
        budgetMln: 0,
        complexity: 0,
      };
      item.count += 1;
      item.budgetMln += toMln(row.amount);
      item.complexity += row.complexity;
      subjects.set(row.expenseItem, item);
      byBuyer.set(buyer, subjects);
    }

    const result: DistributionGroup[] = [];
    for (const [buyer, subjects] of byBuyer) {
      const theme = themeByBuyer.get(buyer) ?? '';
      const owner = Object.values(CATEGORY_OWNERS).find((o) => o.owner === buyer);
      result.push({
        buyer,
        theme,
        isNew: owner?.isNew,
        items: Array.from(subjects.values()).sort((a, b) => b.count - a.count),
      });
    }
    // Крупнейшие группы (по количеству заявок) сверху
    return result.sort(
      (a, b) =>
        b.items.reduce((s, i) => s + i.count, 0) - a.items.reduce((s, i) => s + i.count, 0)
    );
  }, [rows]);

  const grandTotals = useMemo<DistributionTotals>(() => {
    return groups.reduce<DistributionTotals>(
      (acc, group) => {
        for (const item of group.items) {
          acc.count += item.count;
          acc.budgetMln += item.budgetMln;
          acc.complexity += item.complexity;
        }
        return acc;
      },
      { count: 0, budgetMln: 0, complexity: 0 }
    );
  }, [groups]);

  /** Сводка нагрузки: сколько заявок закупщик ведёт сейчас против предполагаемого. */
  const balance = useMemo<PurchaserBalanceRow[]>(() => {
    const current = new Map<string, number>();
    const proposed = new Map<string, number>();
    for (const row of rows) {
      current.set(row.currentPurchaser, (current.get(row.currentPurchaser) ?? 0) + 1);
      proposed.set(row.proposedPurchaser, (proposed.get(row.proposedPurchaser) ?? 0) + 1);
    }
    const buyers = new Set<string>([...current.keys(), ...proposed.keys()]);
    const isNewByBuyer = new Set(
      Object.values(CATEGORY_OWNERS).filter((o) => o.isNew).map((o) => o.owner)
    );
    return Array.from(buyers)
      .map((purchaser) => ({
        purchaser,
        currentCount: current.get(purchaser) ?? 0,
        proposedCount: proposed.get(purchaser) ?? 0,
        isNew: isNewByBuyer.has(purchaser),
      }))
      .sort((a, b) => b.proposedCount - a.proposedCount);
  }, [rows]);

  return { groups, grandTotals, balance };
}

/** Итоги по одной группе. */
export function getGroupTotals(group: DistributionGroup): DistributionTotals {
  return group.items.reduce<DistributionTotals>(
    (acc, item) => ({
      count: acc.count + item.count,
      budgetMln: acc.budgetMln + item.budgetMln,
      complexity: acc.complexity + item.complexity,
    }),
    { count: 0, budgetMln: 0, complexity: 0 }
  );
}
