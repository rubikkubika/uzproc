'use client';

import { useEffect, useMemo, useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { useEtpData } from './hooks/useEtpData';
import { useEtpFilters } from './hooks/useEtpFilters';
import EtpList from './ui/EtpList';
import EtpDetail from './ui/EtpDetail';

export default function EtpSection() {
  const { snapshot, loading, error } = useEtpData();
  const procedures = useMemo(() => snapshot?.procedures ?? [], [snapshot]);
  const { search, setSearch, statusFilter, setStatusFilter, filtered } = useEtpFilters(procedures);
  const [selectedGuid, setSelectedGuid] = useState<string | null>(null);

  // Автовыбор первой процедуры при загрузке / смене фильтра
  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedGuid(null);
      return;
    }
    if (!selectedGuid || !filtered.some((p) => p.guid === selectedGuid)) {
      setSelectedGuid(filtered[0].guid);
    }
  }, [filtered, selectedGuid]);

  const selected = useMemo(
    () => procedures.find((p) => p.guid === selectedGuid) ?? null,
    [procedures, selectedGuid]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <p className="text-gray-600">Не удалось загрузить снапшот ЭТП: {error}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Шапка раздела */}
      <div className="flex items-center justify-between gap-3 px-1 pb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">ЭТП · Закупки UZUM MARKET</h1>
            <p className="text-xs text-gray-500">
              Снапшот с b2biz.uz от {snapshot.generatedAt} · {snapshot.count} закупок · {snapshot.filesTotal} док. ·{' '}
              {snapshot.participantFilesTotal ?? 0} файлов КП · {snapshot.competitionCount ?? 0} конкурентных листов
            </p>
          </div>
        </div>
      </div>

      {/* Мастер-деталь */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[minmax(300px,380px)_1fr] min-h-0 border border-gray-200 rounded-lg overflow-hidden bg-white">
        <div className="min-h-0 hidden lg:flex flex-col">
          <EtpList
            procedures={filtered}
            total={snapshot.count}
            byStatus={snapshot.byStatus}
            search={search}
            onSearch={setSearch}
            statusFilter={statusFilter}
            onStatusFilter={setStatusFilter}
            selectedGuid={selectedGuid}
            onSelect={setSelectedGuid}
          />
        </div>
        {/* На мобильных — список сверху, деталь снизу */}
        <div className="min-h-0 flex lg:hidden flex-col max-h-[40vh]">
          <EtpList
            procedures={filtered}
            total={snapshot.count}
            byStatus={snapshot.byStatus}
            search={search}
            onSearch={setSearch}
            statusFilter={statusFilter}
            onStatusFilter={setStatusFilter}
            selectedGuid={selectedGuid}
            onSelect={setSelectedGuid}
          />
        </div>
        <div className="min-h-0">
          <EtpDetail procedure={selected} />
        </div>
      </div>
    </div>
  );
}
