'use client';

import type {
  KpiSavingsByPurchaser,
  KpiSlaByPurchaser,
  KpiCsiByPurchaser,
  KpiSavingsSettings,
  KpiSlaSettings,
  KpiCsiSettings,
} from '../types/kpi.types';
import { purchaserDisplayName } from '@/utils/purchaser';

function calcSavingsPercent(savings: number, budget: number): number | null {
  if (budget <= 0) return null;
  return (savings / budget) * 100;
}

function calcScore(actual: number | null, target: number, maxScorePercent: number): number {
  if (actual === null || actual === undefined) return 0;
  if (target <= 0) return 0;
  return Math.min(maxScorePercent, (actual / target) * 100);
}

interface KpiSummaryBlockProps {
  savings: KpiSavingsByPurchaser[];
  sla: KpiSlaByPurchaser[];
  csi: KpiCsiByPurchaser[];
  savingsSettings: KpiSavingsSettings;
  slaSettings: KpiSlaSettings;
  csiSettings: KpiCsiSettings;
}

interface SummaryRow {
  purchaser: string;
  savingsScore: number;
  savingsPoints: number;
  hasSavings: boolean;
  slaScore: number;
  slaPoints: number;
  hasSla: boolean;
  csiScore: number;
  csiPoints: number;
  hasCsi: boolean;
  totalPoints: number;
  maxTotalPoints: number;
}

export function KpiSummaryBlock({
  savings,
  sla,
  csi,
  savingsSettings,
  slaSettings,
  csiSettings,
}: KpiSummaryBlockProps) {
  const savingsMax = savingsSettings.allowBoost ? 130 : 100;
  const slaMax = slaSettings.allowBoost ? 130 : 100;
  const csiMax = csiSettings.allowBoost ? 130 : 100;

  const savingsByPurchaser = new Map<string, KpiSavingsByPurchaser>();
  savings.forEach((r) => savingsByPurchaser.set(r.purchaser, r));
  const slaByPurchaser = new Map<string, KpiSlaByPurchaser>();
  sla.forEach((r) => slaByPurchaser.set(r.purchaser, r));
  const csiByPurchaser = new Map<string, KpiCsiByPurchaser>();
  csi.forEach((r) => csiByPurchaser.set(r.purchaser, r));

  const allPurchasers = new Set<string>([
    ...savings.map((r) => r.purchaser),
    ...sla.map((r) => r.purchaser),
    ...csi.map((r) => r.purchaser),
  ]);

  const rows: SummaryRow[] = Array.from(allPurchasers).map((purchaser) => {
    const s = savingsByPurchaser.get(purchaser);
    const savingsPct = s ? calcSavingsPercent(s.totalSavings, s.totalBudget) : null;
    const savingsScore = calcScore(savingsPct, savingsSettings.target, savingsMax);
    const savingsPoints = (savingsScore / 100) * savingsSettings.weight;

    const sl = slaByPurchaser.get(purchaser);
    const slaPct = sl ? sl.percentage : null;
    const slaScore = calcScore(slaPct, slaSettings.target, slaMax);
    const slaPoints = (slaScore / 100) * slaSettings.weight;

    const c = csiByPurchaser.get(purchaser);
    const csiPct = c ? c.avgRating : null;
    const csiScore = calcScore(csiPct, csiSettings.target, csiMax);
    const csiPoints = (csiScore / 100) * csiSettings.weight;

    const totalPoints = savingsPoints + slaPoints + csiPoints;
    const maxTotalPoints =
      (savingsMax / 100) * savingsSettings.weight +
      (slaMax / 100) * slaSettings.weight +
      (csiMax / 100) * csiSettings.weight;

    return {
      purchaser,
      savingsScore,
      savingsPoints,
      hasSavings: !!s,
      slaScore,
      slaPoints,
      hasSla: !!sl,
      csiScore,
      csiPoints,
      hasCsi: !!c,
      totalPoints,
      maxTotalPoints,
    };
  });

  rows.sort((a, b) => b.totalPoints - a.totalPoints);

  const baseTotalWeight = savingsSettings.weight + slaSettings.weight + csiSettings.weight;
  const anyBoost = savingsSettings.allowBoost || slaSettings.allowBoost || csiSettings.allowBoost;

  const pointsColor = (score: number): string => {
    if (score >= 100) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score > 0) return 'text-red-500';
    return 'text-gray-400';
  };

  return (
    <div className="bg-white rounded-lg shadow w-full max-w-[900px]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-800 uppercase tracking-wide">Сводная премия</span>
          <span className="text-[10px] text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">
            Веса: Эк. {savingsSettings.weight} · SLA {slaSettings.weight} · CSI {csiSettings.weight}
            {anyBoost && <span className="ml-1 text-blue-700 font-medium">· до 130%</span>}
          </span>
        </div>
        <span className="text-[10px] text-gray-500">
          Макс. база: {baseTotalWeight}
          {anyBoost && rows.length > 0 && (
            <span className="ml-1">· макс. с бустом: {rows[0]?.maxTotalPoints.toFixed(1)}</span>
          )}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="px-3 py-4 text-center text-xs text-gray-400">Нет данных за выбранный месяц</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-2 py-1.5 text-left font-medium text-gray-500 whitespace-nowrap">Закупщик</th>
                <th className="px-2 py-1.5 text-right font-medium text-gray-500 whitespace-nowrap">Экономия</th>
                <th className="px-2 py-1.5 text-right font-medium text-gray-500 whitespace-nowrap">SLA</th>
                <th className="px-2 py-1.5 text-right font-medium text-gray-500 whitespace-nowrap">CSI</th>
                <th className="px-2 py-1.5 text-right font-medium text-gray-500 whitespace-nowrap">Итого</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.purchaser} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-2 py-1.5 text-gray-800 whitespace-nowrap">
                    {purchaserDisplayName(row.purchaser) || row.purchaser}
                  </td>
                  <td className={`px-2 py-1.5 text-right whitespace-nowrap tabular-nums font-bold ${row.hasSavings ? pointsColor(row.savingsScore) : 'text-gray-300'}`}>
                    {row.hasSavings ? (
                      <span title={`${row.savingsPoints.toFixed(1)} из ${savingsSettings.weight} баллов`}>
                        {row.savingsScore.toFixed(1)}%
                      </span>
                    ) : '—'}
                  </td>
                  <td className={`px-2 py-1.5 text-right whitespace-nowrap tabular-nums font-bold ${row.hasSla ? pointsColor(row.slaScore) : 'text-gray-300'}`}>
                    {row.hasSla ? (
                      <span title={`${row.slaPoints.toFixed(1)} из ${slaSettings.weight} баллов`}>
                        {row.slaScore.toFixed(1)}%
                      </span>
                    ) : '—'}
                  </td>
                  <td className={`px-2 py-1.5 text-right whitespace-nowrap tabular-nums font-bold ${row.hasCsi ? pointsColor(row.csiScore) : 'text-gray-300'}`}>
                    {row.hasCsi ? (
                      <span title={`${row.csiPoints.toFixed(1)} из ${csiSettings.weight} баллов`}>
                        {row.csiScore.toFixed(1)}%
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-2 py-1.5 text-right whitespace-nowrap tabular-nums font-bold">
                    {(() => {
                      const totalPct = baseTotalWeight > 0 ? (row.totalPoints / baseTotalWeight) * 100 : 0;
                      const cls = totalPct >= 100 ? 'text-green-600' : totalPct >= 70 ? 'text-yellow-600' : 'text-red-500';
                      return (
                        <span className={cls} title={`${row.totalPoints.toFixed(1)} из ${baseTotalWeight} баллов`}>
                          {totalPct.toFixed(1)}%
                        </span>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
