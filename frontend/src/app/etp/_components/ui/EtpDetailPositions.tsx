'use client';

import { EtpPosition } from '../types/etp.types';

interface Props {
  positions: EtpPosition[];
}

export default function EtpDetailPositions({ positions }: Props) {
  if (!positions.length) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
            <th className="px-2 py-1.5 w-8">#</th>
            <th className="px-2 py-1.5">Наименование</th>
            <th className="px-2 py-1.5 text-right whitespace-nowrap">Кол-во</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((p) => (
            <tr key={p.num} className="border-b border-gray-100 align-top">
              <td className="px-2 py-1.5 text-gray-500">{p.num}</td>
              <td className="px-2 py-1.5 text-gray-900">
                <div className="font-medium">{p.title}</div>
                {p.descr && <div className="text-xs text-gray-500 whitespace-pre-line mt-0.5">{p.descr}</div>}
              </td>
              <td className="px-2 py-1.5 text-right whitespace-nowrap text-gray-700">
                {new Intl.NumberFormat('ru-RU').format(p.quantity)} {p.unitName}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
