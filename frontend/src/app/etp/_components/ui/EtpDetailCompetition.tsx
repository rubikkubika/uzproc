'use client';

import { EtpCompetition } from '../types/etp.types';
import { formatMoney } from '../utils/etp.utils';

interface Props {
  competition: EtpCompetition;
}

function deltaColor(d: number): string {
  if (!d) return 'text-green-700';
  if (d <= 10) return 'text-amber-600';
  return 'text-red-600';
}

export default function EtpDetailCompetition({ competition: c }: Props) {
  const { positions, suppliers, criteria, answers } = c;
  if (!suppliers.length) return <div className="text-sm text-gray-500">Предложений нет</div>;

  // индекс цен: supGuid -> posGuid -> cell
  const priceBySup: Record<string, Record<string, (typeof suppliers)[0]['positions'][0]>> = {};
  for (const s of suppliers) {
    priceBySup[s.guid] = {};
    for (const p of s.positions) priceBySup[s.guid][p.posGuid] = p;
  }

  return (
    <div className="space-y-4">
      {/* Таблица цен */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="text-sm border-collapse min-w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="sticky left-0 z-10 bg-gray-50 px-2 py-2 text-left text-xs font-medium text-gray-500 border-r border-gray-200 min-w-[220px]">
                Позиция
              </th>
              {suppliers.map((s, i) => (
                <th
                  key={s.guid}
                  className={`px-2 py-2 text-right text-xs font-medium border-r border-gray-200 min-w-[130px] ${
                    i === 0 ? 'text-green-700' : 'text-gray-600'
                  }`}
                >
                  <div className="truncate max-w-[130px]" title={s.name}>
                    {i === 0 && '🏆 '}
                    {s.name}
                  </div>
                  <div className="font-bold">{formatMoney(s.total, s.currency)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {positions.map((pos, idx) => (
              <tr key={pos.guid} className="border-t border-gray-100">
                <td className="sticky left-0 z-10 bg-white px-2 py-1.5 text-gray-900 border-r border-gray-200">
                  <div className="text-xs text-gray-400">
                    {idx + 1}. лучшая: {formatMoney(pos.bestPrice, pos.currency)}
                  </div>
                  <div className="font-medium">{pos.title}</div>
                </td>
                {suppliers.map((s) => {
                  const cell = priceBySup[s.guid][pos.guid];
                  if (!cell) return <td key={s.guid} className="px-2 py-1.5 text-right text-gray-300 border-r border-gray-100">—</td>;
                  return (
                    <td
                      key={s.guid}
                      className={`px-2 py-1.5 text-right border-r border-gray-100 ${cell.rank === 1 ? 'bg-green-50' : ''}`}
                    >
                      <div className="text-gray-900 whitespace-nowrap">{formatMoney(cell.price, s.currency)}</div>
                      <div className={`text-xs ${deltaColor(cell.deltaPercent)}`}>
                        #{cell.rank}
                        {cell.deltaPercent ? ` · +${cell.deltaPercent}%` : ''}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Критерии */}
      {criteria.length > 0 && (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="text-sm border-collapse min-w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="sticky left-0 z-10 bg-gray-50 px-2 py-2 text-left text-xs font-medium text-gray-500 border-r border-gray-200 min-w-[220px]">
                  Критерий
                </th>
                {suppliers.map((s, i) => (
                  <th
                    key={s.guid}
                    className={`px-2 py-2 text-left text-xs font-medium border-r border-gray-200 min-w-[130px] ${
                      i === 0 ? 'text-green-700' : 'text-gray-600'
                    }`}
                  >
                    <div className="truncate max-w-[130px]" title={s.name}>
                      {s.name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {criteria.map((cr) => (
                <tr key={cr.guid} className="border-t border-gray-100">
                  <td className="sticky left-0 z-10 bg-white px-2 py-1.5 text-gray-900 border-r border-gray-200">
                    <div className="font-medium">{cr.title}</div>
                    {cr.descr && <div className="text-xs text-gray-400">{cr.descr}</div>}
                  </td>
                  {suppliers.map((s) => (
                    <td key={s.guid} className="px-2 py-1.5 text-gray-700 border-r border-gray-100">
                      {(answers[s.guid] && answers[s.guid][cr.guid]) || '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-gray-400">Все цены указаны без учёта НДС. Ранг и % — отклонение от лучшей цены по позиции.</p>
    </div>
  );
}
