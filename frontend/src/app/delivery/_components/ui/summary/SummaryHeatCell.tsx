'use client';

import type { CSSProperties } from 'react';

interface Props {
  value: number;
  style: CSSProperties;
  title?: string;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}

/**
 * Числовая ячейка сводки с заливкой по «тепловой карте».
 * Нулевое значение показывается точкой, чтобы не зашумлять таблицу.
 */
export default function SummaryHeatCell({ value, style, title, onClick, className = '' }: Props) {
  return (
    <td
      style={style}
      title={title}
      onClick={value > 0 ? onClick : undefined}
      className={`py-1.5 px-1.5 text-center font-medium ${value > 0 && onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {value > 0 ? value : <span className="text-gray-200 text-[10px]">·</span>}
    </td>
  );
}
