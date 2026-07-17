'use client';

import { Search } from 'lucide-react';
import { EtpProcedure } from '../types/etp.types';
import { ETP_STATUS_ORDER } from '../constants/etp.constants';
import EtpListItem from './EtpListItem';

interface Props {
  procedures: EtpProcedure[];
  total: number;
  byStatus: Record<string, number>;
  search: string;
  onSearch: (v: string) => void;
  statusFilter: string;
  onStatusFilter: (v: string) => void;
  selectedGuid: string | null;
  onSelect: (guid: string) => void;
}

export default function EtpList({
  procedures,
  total,
  byStatus,
  search,
  onSearch,
  statusFilter,
  onStatusFilter,
  selectedGuid,
  onSelect,
}: Props) {
  return (
    <div className="flex flex-col h-full border-r border-gray-200 bg-white">
      {/* Поиск и фильтр */}
      <div className="p-3 border-b border-gray-200 space-y-2 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Поиск по названию, №, поставщику…"
            className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          <FilterChip label="Все" count={total} active={statusFilter === ''} onClick={() => onStatusFilter('')} />
          {ETP_STATUS_ORDER.filter((s) => byStatus[s]).map((s) => (
            <FilterChip
              key={s}
              label={s}
              count={byStatus[s]}
              active={statusFilter === s}
              onClick={() => onStatusFilter(s)}
            />
          ))}
        </div>
      </div>

      {/* Список */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {procedures.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">Ничего не найдено</div>
        ) : (
          procedures.map((p) => (
            <EtpListItem key={p.guid} procedure={p} active={p.guid === selectedGuid} onSelect={onSelect} />
          ))
        )}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${
        active
          ? 'bg-blue-600 text-white border-blue-600'
          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
      }`}
    >
      {label} <span className={active ? 'text-blue-100' : 'text-gray-400'}>{count}</span>
    </button>
  );
}
