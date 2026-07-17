'use client';

import { useMemo, useState } from 'react';
import { EtpProcedure } from '../types/etp.types';

interface UseEtpFiltersResult {
  search: string;
  setSearch: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  filtered: EtpProcedure[];
}

// Клиентская фильтрация статичного снапшота (список не подкачивается с бэкенда — это снимок).
export function useEtpFilters(procedures: EtpProcedure[]): UseEtpFiltersResult {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return procedures.filter((p) => {
      if (statusFilter && p.statusRu !== statusFilter) return false;
      if (!q) return true;
      const haystack = [
        p.title,
        p.code,
        p.categories.join(' '),
        p.winner?.brand || '',
        p.participants.map((x) => x.company).join(' '),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [procedures, search, statusFilter]);

  return { search, setSearch, statusFilter, setStatusFilter, filtered };
}
