'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { getBackendUrl } from '@/utils/api';
import { useInfiniteScroll } from './hooks/useInfiniteScroll';

interface ContractRemark {
  contractId: number;
  contractInnerId: string | null;
  contractName: string | null;
  preparedByName: string | null;
  executorName: string | null;
  stage: string | null;
  role: string | null;
  commentText: string;
  completionDate: string | null;
}

interface PageResponse {
  content: ContractRemark[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}

interface ContractGroup {
  contractId: number;
  contractInnerId: string | null;
  contractName: string | null;
  preparedByName: string | null;
  remarks: ContractRemark[];
}

const PAGE_SIZE = 20;

function fmtDate(s: string | null | undefined): string {
  if (!s) return '—';
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return s;
  }
}

function groupByContract(remarks: ContractRemark[]): ContractGroup[] {
  const map = new Map<number, ContractGroup>();
  for (const r of remarks) {
    if (!map.has(r.contractId)) {
      map.set(r.contractId, {
        contractId: r.contractId,
        contractInnerId: r.contractInnerId,
        contractName: r.contractName,
        preparedByName: r.preparedByName,
        remarks: [],
      });
    }
    map.get(r.contractId)!.remarks.push(r);
  }
  return Array.from(map.values());
}

export default function RemarksPanel() {
  const [allRemarks, setAllRemarks] = useState<ContractRemark[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(async (page: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else { setLoading(true); setAllRemarks([]); }
    setError(null);
    try {
      const res = await fetch(`${getBackendUrl()}/api/contract-approvals/remarks?page=${page}&size=${PAGE_SIZE}`);
      if (!res.ok) throw new Error('Ошибка загрузки');
      const data: PageResponse = await res.json();
      if (append) {
        setAllRemarks(prev => [...prev, ...data.content]);
      } else {
        setAllRemarks(data.content);
      }
      setHasMore(page + 1 < data.totalPages);
      setCurrentPage(page);
    } catch {
      setError('Не удалось загрузить замечания');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchPage(0, false);
  }, [fetchPage]);

  useInfiniteScroll(loadMoreRef, {
    enabled: !loading && !loadingMore && hasMore,
    onLoadMore: useCallback(() => {
      if (hasMore && !loadingMore) fetchPage(currentPage + 1, true);
    }, [hasMore, loadingMore, currentPage, fetchPage]),
  });

  const groups = groupByContract(allRemarks);

  return (
    <div className="flex-1 min-w-0 overflow-auto p-3 custom-scrollbar">
      {loading && (
        <div className="text-xs text-gray-500 text-center py-6">Загрузка...</div>
      )}
      {error && (
        <div className="text-xs text-red-600 text-center py-6">{error}</div>
      )}
      {!loading && !error && groups.length === 0 && (
        <div className="text-xs text-gray-400 text-center py-6">Замечаний нет</div>
      )}

      <div className="space-y-3">
        {groups.map((group) => (
          <div key={group.contractId} className="border border-gray-200 rounded bg-white overflow-hidden">
            {/* Заголовок договора */}
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-baseline gap-2 flex-wrap">
              <span className="text-xs font-semibold text-gray-800">
                {group.contractInnerId || '—'}
                {group.contractName ? ` — ${group.contractName}` : ''}
              </span>
              {group.preparedByName && (
                <span className="text-[10px] text-gray-500 ml-auto flex-shrink-0">
                  Исполнитель: {group.preparedByName}
                </span>
              )}
            </div>

            {/* Замечания группы */}
            <div className="divide-y divide-gray-100">
              {group.remarks.map((remark, idx) => (
                <div key={idx} className="px-3 py-2 flex gap-4 items-start">
                  {/* Мета-блок */}
                  <div className="flex-shrink-0 w-48 space-y-0.5 text-[10px] text-gray-500 pt-0.5">
                    {remark.executorName && (
                      <div><span className="font-medium text-gray-700">{remark.executorName}</span></div>
                    )}
                    {remark.role && <div>{remark.role}</div>}
                    {remark.stage && <div className="text-gray-400">{remark.stage}</div>}
                    <div className="text-gray-400">{fmtDate(remark.completionDate)}</div>
                  </div>
                  {/* Текст замечания */}
                  <div className="flex-1 min-w-0 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 text-xs text-gray-800 whitespace-pre-wrap break-words">
                    {remark.commentText}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {loadingMore && (
        <div className="text-xs text-gray-500 text-center py-3">Загрузка...</div>
      )}
      <div ref={loadMoreRef} className="h-4" />
    </div>
  );
}
