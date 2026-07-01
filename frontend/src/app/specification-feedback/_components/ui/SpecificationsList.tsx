'use client';

import React from 'react';
import { SpecificationItem } from '../types/specification-feedback.types';
import { formatDate } from '../utils/specification-feedback.utils';
import { formatAmountShortRu } from '@/utils/amount';

interface SpecificationsListProps {
  specifications: SpecificationItem[];
  loading: boolean;
  error: string | null;
}

/** Правая часть: список оцениваемых спецификаций (ФИО, предмет, сумма, дата подписания). */
export default function SpecificationsList({ specifications, loading, error }: SpecificationsListProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="font-semibold text-gray-900" style={{ fontSize: '18px' }}>
          Оцениваемые спецификации
        </h3>
        <span className="text-xs text-gray-500">{specifications.length} шт.</span>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm py-8">
          Загрузка спецификаций...
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center text-red-500 text-sm py-8">{error}</div>
      ) : specifications.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm py-8">
          Нет спецификаций за выбранный период
        </div>
      ) : (
        <div className="overflow-auto border border-gray-200 rounded">
          <table className="w-full border-collapse">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-2 py-0.5 text-left text-xs font-medium text-gray-500 border-r border-b border-gray-300 whitespace-nowrap">
                  ФИО
                </th>
                <th className="px-2 py-0.5 text-left text-xs font-medium text-gray-500 border-r border-b border-gray-300">
                  Предмет
                </th>
                <th className="px-2 py-0.5 text-right text-xs font-medium text-gray-500 border-r border-b border-gray-300 whitespace-nowrap">
                  Сумма
                </th>
                <th className="px-2 py-0.5 text-left text-xs font-medium text-gray-500 border-b border-gray-300 whitespace-nowrap">
                  Дата подписания
                </th>
              </tr>
            </thead>
            <tbody>
              {specifications.map((spec) => (
                <tr key={spec.id} className="hover:bg-gray-50">
                  <td className="px-2 py-0.5 text-xs text-gray-900 border-r border-b border-gray-200 align-top whitespace-nowrap">
                    {spec.preparedBy || '-'}
                  </td>
                  <td className="px-2 py-0.5 text-xs text-gray-900 border-r border-b border-gray-200 align-top">
                    {spec.title || '-'}
                  </td>
                  <td className="px-2 py-0.5 text-xs text-gray-900 border-r border-b border-gray-200 align-top text-right whitespace-nowrap">
                    {formatAmountShortRu(spec.budgetAmount)} {spec.currency || 'UZS'}
                  </td>
                  <td className="px-2 py-0.5 text-xs text-gray-900 border-b border-gray-200 align-top whitespace-nowrap">
                    {formatDate(spec.synchronizationDate)}
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
