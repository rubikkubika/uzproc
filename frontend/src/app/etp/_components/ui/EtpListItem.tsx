'use client';

import { FileText, Users, Trophy } from 'lucide-react';
import { EtpProcedure } from '../types/etp.types';
import { formatDate, formatMoney } from '../utils/etp.utils';
import EtpStatusBadge from './EtpStatusBadge';

interface Props {
  procedure: EtpProcedure;
  active: boolean;
  onSelect: (guid: string) => void;
}

export default function EtpListItem({ procedure: p, active, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={() => onSelect(p.guid)}
      className={`w-full text-left px-3 py-2.5 border-b border-gray-100 transition-colors ${
        active ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-gray-50 border-l-4 border-l-transparent'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs font-mono text-gray-500">№ {p.code}</span>
        <EtpStatusBadge status={p.statusRu} />
      </div>
      <div className="text-sm font-medium text-gray-900 line-clamp-2 mb-1.5">{p.title}</div>
      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
        <span>{formatDate(p.createdDate)}</span>
        <span className="inline-flex items-center gap-1">
          <Users className="w-3 h-3" /> {p.participantsCount}
        </span>
        {p.filesCount > 0 && (
          <span className="inline-flex items-center gap-1">
            <FileText className="w-3 h-3" /> {p.filesCount}
          </span>
        )}
        {p.winner && (
          <span className="inline-flex items-center gap-1 text-green-700">
            <Trophy className="w-3 h-3" /> {formatMoney(p.winner.totalPrice, p.winner.currency)}
          </span>
        )}
      </div>
    </button>
  );
}
