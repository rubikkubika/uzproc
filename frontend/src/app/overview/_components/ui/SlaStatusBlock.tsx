'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { HelpCircle, X } from 'lucide-react';
import { useSlaStatusBlockData } from '../hooks/useSlaStatusBlockData';
import type { OverviewSlaRequestRow } from '../hooks/useOverviewSlaData';
import { getBackendUrl } from '@/utils/api';
import { purchaserDisplayName } from '@/utils/purchaser';
import { countWorkingDaysBetween, getPlannedSlaDays, getPlannedSlaDaysNumber } from '../utils/overviewSlaUtils';

interface SlaCommentItem {
  id: number;
  text: string;
  createdAt: string;
}

const FACTUAL_SLA_HEADER_TOOLTIP =
  'Рабочие дни со следующего дня после даты назначения на утверждение по дату завершения закупки (день назначения не учитывается). Если дата завершения не указана — используется текущая дата.';

interface SlaStatusBlockProps {
  /** Заголовок блока (название группы статусов) */
  title: string;
  /** Группа статусов для фильтра API (при использовании хука) */
  statusGroup?: string;
  /** Год назначения на утверждение (при использовании хука) */
  year?: number | null;
  /** Данные с обзорного API (один запрос на все блоки) — при передаче хук не вызывается */
  requests?: OverviewSlaRequestRow[];
  loading?: boolean;
  error?: string | null;
}

function formatAssignmentDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return iso;
  }
}

/** Сумма в сокращённом формате: тыс., млн, млрд, трлн */
function formatAmount(value: number | null): string {
  if (value == null) return '—';
  const abs = Math.abs(value);
  if (abs >= 1e12) return (value / 1e12).toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + ' трлн';
  if (abs >= 1e9) return (value / 1e9).toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + ' млрд';
  if (abs >= 1e6) return (value / 1e6).toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + ' млн';
  if (abs >= 1e3) return (value / 1e3).toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + ' тыс.';
  return value.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
}

/**
 * Блок SLA: таблица заявок (тип закупка) по группе статусов — номер заявки, наименование, закупщик, статус, дата назначения на утверждение, дата завершения закупки.
 * Если переданы requests/loading/error — используются они (данные с /api/overview/sla); иначе вызывается useSlaStatusBlockData(statusGroup, year).
 */
export function SlaStatusBlock({ title, statusGroup, year, requests: propsRequests, loading: propsLoading, error: propsError }: SlaStatusBlockProps) {
  const [showFactualSlaTip, setShowFactualSlaTip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const factualSlaTriggerRef = useRef<HTMLSpanElement>(null);
  const [commentsModalRequestId, setCommentsModalRequestId] = useState<number | null>(null);
  const [commentsModalTitle, setCommentsModalTitle] = useState<string>('');
  const [commentsList, setCommentsList] = useState<SlaCommentItem[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [addCommentLoading, setAddCommentLoading] = useState(false);
  const [addCommentError, setAddCommentError] = useState<string | null>(null);

  const fetchSlaComments = useCallback(async (requestId: number) => {
    setCommentsLoading(true);
    try {
      const baseUrl = getBackendUrl();
      const res = await fetch(`${baseUrl}/api/purchase-requests/${requestId}/comments?type=SLA_COMMENT`);
      if (!res.ok) throw new Error('Ошибка загрузки комментариев');
      const data = await res.json();
      setCommentsList((data ?? []).map((c: { id: number; text: string; createdAt: string }) => ({ id: c.id, text: c.text, createdAt: c.createdAt })));
    } catch {
      setCommentsList([]);
    } finally {
      setCommentsLoading(false);
    }
  }, []);

  const openCommentsModal = useCallback((row: OverviewSlaRequestRow) => {
    setCommentsModalTitle(`Комментарии SLA — заявка ${row.idPurchaseRequest ?? row.id}`);
    setCommentsModalRequestId(row.id);
    setCommentsList([]);
    fetchSlaComments(row.id);
  }, [fetchSlaComments]);

  const closeCommentsModal = useCallback(() => {
    setCommentsModalRequestId(null);
    setCommentsModalTitle('');
    setCommentsList([]);
    setNewCommentText('');
    setAddCommentError(null);
  }, []);

  const addComment = useCallback(async () => {
    const requestId = commentsModalRequestId;
    const text = newCommentText?.trim();
    if (requestId == null || !text) return;
    setAddCommentLoading(true);
    setAddCommentError(null);
    try {
      const baseUrl = getBackendUrl();
      const res = await fetch(`${baseUrl}/api/purchase-requests/${requestId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'SLA_COMMENT', text }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'Ошибка добавления комментария');
      }
      setNewCommentText('');
      await fetchSlaComments(requestId);
    } catch (e) {
      setAddCommentError(e instanceof Error ? e.message : 'Ошибка добавления комментария');
    } finally {
      setAddCommentLoading(false);
    }
  }, [commentsModalRequestId, newCommentText, fetchSlaComments]);

  useEffect(() => {
    if (!showFactualSlaTip || !factualSlaTriggerRef.current) {
      setTooltipPosition(null);
      return;
    }
    const rect = factualSlaTriggerRef.current.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.bottom + 4,
    });
  }, [showFactualSlaTip]);

  const hookData = useSlaStatusBlockData(
    propsRequests === undefined ? (statusGroup ?? '') : '',
    propsRequests === undefined ? (year ?? null) : null
  );
  const useProps = propsRequests !== undefined;
  const requests = useProps ? (propsRequests ?? []) : hookData.requests;
  const loading = useProps ? (propsLoading ?? false) : hookData.loading;
  const error = useProps ? (propsError ?? null) : hookData.error;

  return (
    <div className="bg-white rounded-lg shadow p-2">
      <div className="mb-1 flex items-baseline gap-1">
        <h3 className="text-xs font-semibold text-gray-900 shrink-0">{title}</h3>
      </div>

      {loading && (
        <div className="min-h-[40px] flex items-center justify-center text-gray-500 text-xs">
          Загрузка…
        </div>
      )}

      {error && (
        <div className="mb-1 p-1.5 rounded bg-red-50 text-red-700 text-xs">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] table-fixed border-collapse text-[11px] leading-snug">
            <colgroup>
              <col style={{ width: '72px' }} />
              <col style={{ width: '220px' }} />
              <col style={{ width: '80px' }} />
              <col style={{ width: '120px' }} />
              <col style={{ width: '56px' }} />
              <col style={{ width: '130px' }} />
              <col style={{ width: '88px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '72px' }} />
              <col style={{ width: '90px' }} />
            </colgroup>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-1.5 py-0.5 text-left text-[11px] font-medium text-gray-500 tracking-wider border-r border-gray-300 w-[72px]">
                  Номер заявки
                </th>
                <th className="px-1.5 py-0.5 text-left text-[11px] font-medium text-gray-500 tracking-wider border-r border-gray-300 min-w-[220px]">
                  Наименование
                </th>
                <th className="px-1.5 py-0.5 text-right text-[11px] font-medium text-gray-500 tracking-wider border-r border-gray-300 w-[80px]">
                  Сумма
                </th>
                <th className="px-1.5 py-0.5 text-left text-[11px] font-medium text-gray-500 tracking-wider border-r border-gray-300 w-[120px]">
                  Закупщик
                </th>
                <th className="px-1.5 py-0.5 text-left text-[11px] font-medium text-gray-500 tracking-wider border-r border-gray-300 w-[56px]">
                  Сложность
                </th>
                <th className="px-1.5 py-0.5 text-left text-[11px] font-medium text-gray-500 tracking-wider border-r border-gray-300 w-[130px]">
                  Статус
                </th>
                <th className="px-1.5 py-0.5 text-center text-[11px] font-medium text-gray-500 tracking-wider border-r border-gray-300 w-[88px]">
                  Плановый срок SLA
                </th>
                <th className="px-1.5 py-0.5 text-left text-[11px] font-medium text-gray-500 tracking-wider border-r border-gray-300 w-[100px]">
                  Дата назначения на утверждение
                </th>
                <th className="px-1.5 py-0.5 text-left text-[11px] font-medium text-gray-500 tracking-wider border-r border-gray-300 w-[100px]">
                  Дата завершения закупки
                </th>
                <th className="px-1.5 py-0.5 text-center text-[11px] font-medium text-gray-500 tracking-wider border-r border-gray-300 w-[72px]">
                  <span className="inline-flex items-center justify-center gap-0.5">
                    Фактический SLA
                    <span
                      ref={factualSlaTriggerRef}
                      className="inline-flex shrink-0"
                      onMouseEnter={() => setShowFactualSlaTip(true)}
                      onMouseLeave={() => setShowFactualSlaTip(false)}
                    >
                      <span className="inline-flex text-blue-500 hover:text-blue-600 cursor-help" aria-label={FACTUAL_SLA_HEADER_TOOLTIP}>
                        <HelpCircle className="w-3.5 h-3.5" aria-hidden />
                      </span>
                    </span>
                  </span>
                  {typeof document !== 'undefined' &&
                    showFactualSlaTip &&
                    tooltipPosition &&
                    createPortal(
                      <span
                        className="fixed z-[9999] px-2 py-1.5 text-xs text-white bg-gray-800 rounded shadow-lg whitespace-normal max-w-[260px] pointer-events-none"
                        role="tooltip"
                        style={{
                          left: tooltipPosition.x,
                          top: tooltipPosition.y,
                          transform: 'translate(-50%, 0)',
                        }}
                      >
                        {FACTUAL_SLA_HEADER_TOOLTIP}
                      </span>,
                      document.body
                    )}
                </th>
                <th className="px-1.5 py-0.5 text-center text-[11px] font-medium text-gray-500 tracking-wider border-r border-gray-300 w-[72px]">
                  Разница (план − факт)
                </th>
                <th className="px-1.5 py-0.5 text-center text-[11px] font-medium text-gray-500 tracking-wider w-[90px]">
                  Комментарий
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-1.5 py-1 text-gray-500 text-center text-[11px]">
                    Нет заявок
                  </td>
                </tr>
              ) : (
                requests.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-1.5 py-0.5 text-gray-700 border-r border-gray-200 whitespace-nowrap w-[72px] overflow-hidden text-ellipsis">
                      {row.id ? (
                        <Link
                          href={`/purchase-request/${row.id}`}
                          className="text-blue-600 hover:underline truncate block"
                          title={`Перейти к заявке ${row.idPurchaseRequest ?? row.id}`}
                        >
                          {row.idPurchaseRequest ?? row.id}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-1.5 py-0.5 text-gray-900 border-r border-gray-200 min-w-[220px] overflow-hidden text-ellipsis">
                      {row.name}
                    </td>
                    <td className="px-1.5 py-0.5 text-gray-700 border-r border-gray-200 text-right whitespace-nowrap w-[80px] overflow-hidden text-ellipsis">
                      {formatAmount(row.budgetAmount)}
                    </td>
                    <td className="px-1.5 py-0.5 text-gray-700 border-r border-gray-200 w-[120px] overflow-hidden text-ellipsis">
                      {purchaserDisplayName(row.purchaser)}
                    </td>
                    <td className="px-1.5 py-0.5 text-gray-700 border-r border-gray-200 w-[56px] overflow-hidden text-ellipsis">
                      {row.complexity ?? '—'}
                    </td>
                    <td className="px-1.5 py-0.5 text-gray-700 border-r border-gray-200 w-[130px] overflow-hidden text-ellipsis">
                      {row.status ?? '—'}
                    </td>
                    <td className="px-1.5 py-0.5 text-gray-700 border-r border-gray-200 text-center whitespace-nowrap w-[88px] overflow-hidden text-ellipsis">
                      <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1 rounded bg-gray-200 text-gray-700 font-bold tabular-nums">
                        {row.plannedSlaDays != null ? String(row.plannedSlaDays) : getPlannedSlaDays(row.complexity)}
                      </span>
                    </td>
                    <td className="px-1.5 py-0.5 text-gray-700 border-r border-gray-200 whitespace-nowrap w-[100px] overflow-hidden text-ellipsis">
                      {formatAssignmentDate(row.approvalAssignmentDate)}
                    </td>
                    <td className="px-1.5 py-0.5 text-gray-700 border-r border-gray-200 whitespace-nowrap w-[100px] overflow-hidden text-ellipsis">
                      {formatAssignmentDate(row.purchaseCompletionDate)}
                    </td>
                    <td className="px-1.5 py-0.5 text-gray-700 border-r border-gray-200 text-center whitespace-nowrap w-[72px] overflow-hidden text-ellipsis">
                      {(() => {
                        const assignmentIso = row.approvalAssignmentDate;
                        if (!assignmentIso) return '—';
                        try {
                          const start = new Date(assignmentIso);
                          if (isNaN(start.getTime())) return '—';
                          const end = row.purchaseCompletionDate ? new Date(row.purchaseCompletionDate) : new Date();
                          if (isNaN(end.getTime())) return '—';
                          const factual = countWorkingDaysBetween(start, end);
                          return (
                            <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1 rounded bg-gray-200 text-gray-700 font-bold tabular-nums">
                              {factual}
                            </span>
                          );
                        } catch {
                          return '—';
                        }
                      })()}
                    </td>
                    <td className="px-1.5 py-0.5 text-gray-700 text-center whitespace-nowrap w-[72px] overflow-hidden text-ellipsis tabular-nums">
                      {(() => {
                        const assignmentIso = row.approvalAssignmentDate;
                        if (!assignmentIso) return '—';
                        const planned = row.plannedSlaDays ?? getPlannedSlaDaysNumber(row.complexity);
                        if (planned == null) return '—';
                        try {
                          const start = new Date(assignmentIso);
                          if (isNaN(start.getTime())) return '—';
                          const end = row.purchaseCompletionDate ? new Date(row.purchaseCompletionDate) : new Date();
                          if (isNaN(end.getTime())) return '—';
                          const factual = countWorkingDaysBetween(start, end);
                          const diff = planned - factual;
                          const remainderPct = planned > 0 && diff > 0 ? (diff / planned) * 100 : null;
                          const isLowRemainder = remainderPct != null && remainderPct <= 30;
                          const deltaLabel = diff > 0 ? `+${diff}` : String(diff);
                          if (diff > 0) {
                            return (
                              <span
                                className={`inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1 rounded text-white font-bold tabular-nums ${
                                  isLowRemainder ? 'bg-yellow-400 !text-black' : 'bg-green-600 text-white'
                                }`}
                                title={isLowRemainder ? `Остаток ≤30% от планового (${remainderPct?.toFixed(0)}%)` : undefined}
                              >
                                {deltaLabel}
                              </span>
                            );
                          }
                          if (diff < 0) {
                            return (
                              <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1 rounded bg-red-600 text-white font-bold tabular-nums">
                                {deltaLabel}
                              </span>
                            );
                          }
                          return (
                            <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1 rounded bg-gray-200 text-gray-700 font-bold tabular-nums">
                              0
                            </span>
                          );
                        } catch {
                          return '—';
                        }
                      })()}
                    </td>
                    <td className="px-1.5 py-0.5 text-gray-700 border-r border-gray-200 text-center whitespace-nowrap w-[90px] overflow-hidden text-ellipsis">
                      <button
                        type="button"
                        onClick={() => openCommentsModal(row)}
                        className="text-blue-600 hover:text-blue-800 hover:underline text-xs"
                      >
                        ({(row.slaCommentCount ?? 0)})
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {commentsModalRequestId != null && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50" onClick={closeCommentsModal} role="dialog" aria-modal="true" aria-labelledby="sla-comments-modal-title">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 id="sla-comments-modal-title" className="text-sm font-semibold text-gray-900">{commentsModalTitle}</h3>
              <button type="button" onClick={closeCommentsModal} className="p-1 text-gray-500 hover:text-gray-700 rounded" aria-label="Закрыть">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-4 py-3 border-b border-gray-200">
              {addCommentError && (
                <p className="mb-2 text-sm text-red-600">{addCommentError}</p>
              )}
              <textarea
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Новый комментарий SLA..."
                rows={3}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
              />
              <button
                type="button"
                onClick={addComment}
                disabled={!newCommentText?.trim() || addCommentLoading}
                className="mt-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addCommentLoading ? 'Добавление…' : 'Добавить'}
              </button>
            </div>
            <div className="px-4 py-3 overflow-y-auto flex-1">
              {commentsLoading ? (
                <p className="text-sm text-gray-500">Загрузка…</p>
              ) : commentsList.length === 0 ? (
                <p className="text-sm text-gray-500">Нет комментариев SLA</p>
              ) : (
                <ul className="space-y-3">
                  {commentsList.map((c) => (
                    <li key={c.id} className="text-sm text-gray-900 border-b border-gray-100 pb-2 last:border-0">
                      <p className="whitespace-pre-wrap">{c.text}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {c.createdAt ? new Date(c.createdAt).toLocaleString('ru-RU') : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
