import type { SortField } from './delivery.types';

export interface FilterOption {
  value: string;
  label: string;
}

/** Фильтр в шапке колонки */
export type HeaderFilter =
  | { kind: 'text'; field: string; placeholder: string }
  | {
      kind: 'select';
      key: string;
      /** Показывается, когда фильтр не выбран */
      placeholder: string;
      value: string;
      options: FilterOption[];
      onChange: (value: string) => void;
      /** Занять всю ширину сетки фильтров колонки */
      wide?: boolean;
    }
  | { kind: 'range'; from: string; to: string; onChange: (from: string, to: string) => void };

export type ColumnKey = 'signal' | 'dates' | 'shipment' | 'money' | 'contract' | 'supplier' | 'amount' | 'comment' | 'responsible';

/** Статическое описание колонки */
export interface ColumnDef {
  key: ColumnKey;
  label: string;
  /** Приглушённая часть названия */
  sub?: string;
  sortField: SortField;
  /** Сетка фильтров в шапке */
  filterGridClass: string;
}

export interface HeaderColumn extends ColumnDef {
  filters: HeaderFilter[];
}
