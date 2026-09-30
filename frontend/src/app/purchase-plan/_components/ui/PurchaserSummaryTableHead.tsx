'use client';

import React from 'react';
import {
  PURCHASER_SUMMARY_STATUS_GROUPS,
  SUMMARY_GROUP_START_CLASS,
  SUMMARY_TH_CLASS,
} from '../constants/purchaser-summary.constants';

interface PurchaserSummaryTableHeadProps {
  /** Показывать группы колонок по статусам «В плане» / «Связано с заявкой» / «Исключено» */
  showStatusBreakdown: boolean;
}

/**
 * Заголовок сводной таблицы по закупщикам.
 * С разбивкой по статусам — двухуровневый: «Всего» (кол-во, сумма, сложность) и группы статусов (кол-во, сумма).
 */
export default function PurchaserSummaryTableHead({ showStatusBreakdown }: PurchaserSummaryTableHeadProps) {
  if (!showStatusBreakdown) {
    return (
      <thead className="bg-gray-50 sticky top-0 z-10">
        <tr>
          <th className={`${SUMMARY_TH_CLASS} text-left`}>Закупщик</th>
          <th className={`${SUMMARY_TH_CLASS} text-right`}>Количество</th>
          <th className={`${SUMMARY_TH_CLASS} text-right`}>Сумма бюджета</th>
          <th className={`${SUMMARY_TH_CLASS} text-right`}>Сложность</th>
        </tr>
      </thead>
    );
  }

  return (
    <thead className="bg-gray-50 sticky top-0 z-10">
      <tr className="border-b border-gray-200">
        <th rowSpan={2} className={`${SUMMARY_TH_CLASS} text-left align-bottom`}>Закупщик</th>
        <th
          colSpan={3}
          className={`${SUMMARY_TH_CLASS} text-center`}
          title="Итоги с учётом всех фильтров таблицы (без позиций «Исключена»)"
        >
          Всего
        </th>
        {PURCHASER_SUMMARY_STATUS_GROUPS.map(group => (
          <th
            key={group.key}
            colSpan={2}
            className={`${SUMMARY_TH_CLASS} ${SUMMARY_GROUP_START_CLASS} text-center`}
            title={group.title}
          >
            {group.label}
          </th>
        ))}
      </tr>
      <tr>
        <th className={`${SUMMARY_TH_CLASS} text-right`}>Кол-во</th>
        <th className={`${SUMMARY_TH_CLASS} text-right`}>Сумма бюджета</th>
        <th className={`${SUMMARY_TH_CLASS} text-right`}>Сложность</th>
        {PURCHASER_SUMMARY_STATUS_GROUPS.map(group => (
          <React.Fragment key={group.key}>
            <th className={`${SUMMARY_TH_CLASS} ${SUMMARY_GROUP_START_CLASS} text-right`}>Кол-во</th>
            <th className={`${SUMMARY_TH_CLASS} text-right`}>Сумма</th>
          </React.Fragment>
        ))}
      </tr>
    </thead>
  );
}
