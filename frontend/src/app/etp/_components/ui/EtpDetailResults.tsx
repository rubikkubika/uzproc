'use client';

import { Trophy } from 'lucide-react';
import { EtpResult } from '../types/etp.types';
import { formatMoney } from '../utils/etp.utils';

interface Props {
  results: EtpResult[];
}

export default function EtpDetailResults({ results }: Props) {
  if (!results.length) return <div className="text-sm text-gray-500">Результаты не опубликованы</div>;
  return (
    <div className="space-y-3">
      {results.map((r, i) => (
        <div key={i} className="border border-green-200 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-green-50">
            <div className="flex items-center gap-2 min-w-0">
              <Trophy className="w-4 h-4 text-green-600 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate">{r.brand}</div>
                <div className="text-xs text-gray-500 truncate">{r.legal}</div>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-sm font-bold text-green-700">{formatMoney(r.totalPrice, r.currency)}</div>
              {r.sharePct != null && <div className="text-xs text-gray-500">{r.sharePct.toFixed(0)}% от объёма</div>}
            </div>
          </div>
          {r.positions.length > 0 && (
            <table className="w-full text-sm">
              <tbody>
                {r.positions.map((p, j) => (
                  <tr key={j} className="border-t border-gray-100">
                    <td className="px-3 py-1.5 text-gray-700">{p.name}</td>
                    <td className="px-3 py-1.5 text-right text-gray-500 whitespace-nowrap">× {p.quantity}</td>
                    <td className="px-3 py-1.5 text-right text-gray-900 whitespace-nowrap">
                      {formatMoney(p.unitPrice, r.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
}
