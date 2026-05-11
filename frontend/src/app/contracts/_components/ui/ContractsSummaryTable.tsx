'use client';

import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { ContractSummaryItem, SegmentData } from '../hooks/useContractsSummary';

const SEGMENTS = ['market', 'tezkor-ooo', '1p'] as const;
type Seg = typeof SEGMENTS[number];

const SEGMENT_LABELS: Record<Seg, string> = {
  market: 'Market',
  'tezkor-ooo': 'Tezkor / OOO',
  '1p': '1P',
};

const SEGMENT_HUE: Record<Seg, number> = {
  market: 220,
  'tezkor-ooo': 155,
  '1p': 290,
};

const SEGMENT_ACCENT: Record<Seg, string> = {
  market: '#3b82f6',
  'tezkor-ooo': '#10b981',
  '1p': '#8b5cf6',
};

interface ContractsSummaryTableProps {
  segmentsData: Record<string, SegmentData>;
  currentYear: number;
  loading: boolean;
  selectedPreparedBy: string;
  selectedSegment: string;
  selectedDocumentForm?: string;
  mainActiveTab: string;
  onPreparedByClick: (name: string) => void;
  onCellClick: (name: string, segment: string, documentForm: string) => void;
  onSignedPreparedByClick: (name: string) => void;
  onSignedCellClick: (name: string, segment: string, documentForm: string) => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const formatForm = (form: string) => form === 'Дополнительное соглашение' ? 'ДС' : form;

function heatmapCellStyle(value: number, colMax: number, hue: number): CSSProperties {
  if (value === 0 || colMax === 0) return {};
  const intensity = 0.12 + 0.88 * (value / colMax);
  const L = (0.96 - intensity * 0.45).toFixed(3);
  const C = (0.02 + intensity * 0.13).toFixed(3);
  return {
    backgroundColor: `oklch(${L} ${C} ${hue})`,
    color: intensity > 0.55 ? '#ffffff' : '#1f2937',
  };
}

function ExecutorDrawer({
  executor,
  segForms,
  signedSegForms,
  segIndex,
  signedIndex,
  onClose,
}: {
  executor: string;
  segForms: Record<Seg, string[]>;
  signedSegForms: Record<Seg, string[]>;
  segIndex: Record<Seg, Record<string, ContractSummaryItem>>;
  signedIndex: Record<Seg, Record<string, ContractSummaryItem>>;
  onClose: () => void;
}) {
  const inWorkTotal = SEGMENTS.reduce((s, seg) => s + (segIndex[seg][executor]?.count ?? 0), 0);
  const signedTotal = SEGMENTS.reduce((s, seg) => s + (signedIndex[seg][executor]?.count ?? 0), 0);

  return (
    <div className="w-52 flex-shrink-0 border border-gray-200 rounded-lg bg-white overflow-hidden self-start">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
            {getInitials(executor)}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-gray-800 leading-tight truncate">{executor}</span>
            <span className="text-[10px] text-gray-400 leading-tight">
              {inWorkTotal} в работе · {signedTotal} подп.
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 flex-shrink-0 ml-1"
        >
          ×
        </button>
      </div>

      {(['in-work', 'signed'] as const).map(section => {
        const index = section === 'in-work' ? segIndex : signedIndex;
        const forms = section === 'in-work' ? segForms : signedSegForms;
        const label = section === 'in-work' ? 'В работе' : 'Подписано';
        const total = SEGMENTS.reduce((s, seg) => s + (index[seg][executor]?.count ?? 0), 0);
        if (total === 0 && section === 'signed') return null;
        return (
          <div key={section}>
            <div className={`px-3 py-1 text-[10px] font-semibold border-b border-gray-100 ${section === 'signed' ? 'text-emerald-600 bg-emerald-50/50' : 'text-blue-600 bg-blue-50/50'}`}>
              {label}
            </div>
            {SEGMENTS.map(seg => {
              const item = index[seg][executor];
              const segForms2 = forms[seg];
              if (!item && segForms2.length === 0) return null;
              return (
                <div key={seg} className="px-3 py-2 border-b border-gray-100">
                  <div className="flex items-center gap-1 mb-1">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: SEGMENT_ACCENT[seg] }} />
                    <span className="text-[10px] font-semibold" style={{ color: SEGMENT_ACCENT[seg] }}>
                      {SEGMENT_LABELS[seg]}
                    </span>
                    {item && <span className="ml-auto text-[10px] font-bold text-gray-700">{item.count}</span>}
                  </div>
                  {segForms2.length > 0 && (
                    <div className="flex flex-col gap-0.5 pl-3">
                      {segForms2.map(form => {
                        const val = item?.countByDocumentForm?.[form] ?? 0;
                        return (
                          <div key={form} className="flex items-center justify-between gap-1">
                            <span className="text-[10px] text-gray-500 truncate">{form}</span>
                            <span className={`text-[10px] font-medium flex-shrink-0 ${val > 0 ? 'text-gray-700' : 'text-gray-300'}`}>
                              {val > 0 ? val : '—'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">В работе</span>
          <span className="text-xs font-bold text-gray-800">{inWorkTotal}</span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-xs text-gray-500">Подписано</span>
          <span className="text-xs font-bold text-emerald-700">{signedTotal}</span>
        </div>
      </div>
    </div>
  );
}

export default function ContractsSummaryTable({
  segmentsData,
  currentYear,
  loading,
  selectedPreparedBy,
  onPreparedByClick,
  onCellClick,
  onSignedPreparedByClick,
  onSignedCellClick,
}: ContractsSummaryTableProps) {
  const [drawerExecutor, setDrawerExecutor] = useState<string | null>(null);

  // В работе
  const { segRows, segForms } = useMemo(() => {
    const rows = {} as Record<Seg, ContractSummaryItem[]>;
    const forms = {} as Record<Seg, string[]>;
    SEGMENTS.forEach(seg => {
      const d = segmentsData[seg];
      rows[seg] = d?.summaryData ?? [];
      forms[seg] = d?.documentForms ?? [];
    });
    return { segRows: rows, segForms: forms };
  }, [segmentsData]);

  // Подписано
  const { signedRows, signedSegForms } = useMemo(() => {
    const rows = {} as Record<Seg, ContractSummaryItem[]>;
    const forms = {} as Record<Seg, string[]>;
    SEGMENTS.forEach(seg => {
      const d = segmentsData[seg];
      rows[seg] = d?.signedSummaryData ?? [];
      forms[seg] = d?.signedDocumentForms ?? [];
    });
    return { signedRows: rows, signedSegForms: forms };
  }, [segmentsData]);

  const segIndex = useMemo(() =>
    Object.fromEntries(
      SEGMENTS.map(seg => [seg, Object.fromEntries(segRows[seg].map(r => [r.preparedBy, r]))])
    ) as Record<Seg, Record<string, ContractSummaryItem>>,
    [segRows]
  );

  const signedIndex = useMemo(() =>
    Object.fromEntries(
      SEGMENTS.map(seg => [seg, Object.fromEntries(signedRows[seg].map(r => [r.preparedBy, r]))])
    ) as Record<Seg, Record<string, ContractSummaryItem>>,
    [signedRows]
  );

  const allExecutors = useMemo(() => {
    const names = new Set<string>();
    SEGMENTS.forEach(seg => {
      segRows[seg].forEach(r => names.add(r.preparedBy));
      signedRows[seg].forEach(r => names.add(r.preparedBy));
    });
    return [...names].sort((a, b) => {
      const ta = SEGMENTS.reduce((s, seg) => s + (segIndex[seg][a]?.count ?? 0), 0);
      const tb = SEGMENTS.reduce((s, seg) => s + (segIndex[seg][b]?.count ?? 0), 0);
      return tb - ta;
    });
  }, [segRows, signedRows, segIndex]);

  const colMaxValues = useMemo(() => {
    const m: Record<string, number> = {};
    SEGMENTS.forEach(seg => {
      segForms[seg].forEach(form => {
        const vals = segRows[seg].map(r => r.countByDocumentForm?.[form] ?? 0);
        m[`iw::${seg}::${form}`] = vals.length > 0 ? Math.max(0, ...vals) : 0;
      });
      signedSegForms[seg].forEach(form => {
        const vals = signedRows[seg].map(r => r.countByDocumentForm?.[form] ?? 0);
        m[`sg::${seg}::${form}`] = vals.length > 0 ? Math.max(0, ...vals) : 0;
      });
    });
    return m;
  }, [segRows, signedRows, segForms, signedSegForms]);

  const activeSegments = SEGMENTS.filter(seg => segForms[seg].length > 0);
  const activeSignedSegments = SEGMENTS.filter(seg => signedSegForms[seg].length > 0);

  const inWorkColSpan = activeSegments.reduce((s, seg) => s + segForms[seg].length, 0) + 1;
  const signedColSpan = activeSignedSegments.reduce((s, seg) => s + signedSegForms[seg].length, 0) + 1;
  const totalColCount = 1 + inWorkColSpan + signedColSpan;

  const inWorkGrandTotal = allExecutors.reduce(
    (s, name) => s + SEGMENTS.reduce((ss, seg) => ss + (segIndex[seg][name]?.count ?? 0), 0), 0
  );
  const signedGrandTotal = allExecutors.reduce(
    (s, name) => s + SEGMENTS.reduce((ss, seg) => ss + (signedIndex[seg][name]?.count ?? 0), 0), 0
  );

  const handleRowClick = (name: string) => {
    setDrawerExecutor(prev => prev === name ? null : name);
    onPreparedByClick(name);
  };

  const handleCellClick = (e: React.MouseEvent, name: string, seg: string, form: string) => {
    e.stopPropagation();
    onCellClick(name, seg, form);
  };

  const handleSignedCellClick = (e: React.MouseEvent, name: string, seg: string, form: string) => {
    e.stopPropagation();
    onSignedCellClick(name, seg, form);
  };

  const handleSignedRowClick = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    onSignedPreparedByClick(name);
  };

  return (
    <div className="flex gap-2 items-start">
      <div className="border border-gray-200 rounded-lg overflow-hidden overflow-x-auto flex-1 min-w-0">
        <table className="border-collapse text-xs">
          <thead>
            {/* Строка 1: суперхедеры «В работе» и «Подп. YEAR» */}
            <tr className="bg-white">
              <th
                rowSpan={3}
                className="px-2 py-1.5 text-left text-[11px] font-medium text-gray-500 border-b border-gray-200 border-r border-gray-200 align-middle bg-gray-50"
                style={{ minWidth: 140 }}
              >
                Исполнитель
              </th>
              <th
                colSpan={inWorkColSpan}
                className="px-2 py-1 text-center text-[11px] font-semibold text-gray-900 bg-gray-50 border-b-2 border-gray-300"
              >
                В работе
              </th>
              <th
                colSpan={signedColSpan}
                className="px-2 py-1 text-center text-[11px] font-semibold text-gray-900 bg-gray-50 border-b-2 border-gray-300 border-l-2 border-l-gray-300"
              >
                Подписано {currentYear}
              </th>
            </tr>
            {/* Строка 2: сегменты */}
            <tr className="bg-white">
              {activeSegments.map(seg => (
                <th
                  key={`iw-${seg}`}
                  colSpan={segForms[seg].length}
                  className="px-2 py-1 text-center text-[11px] font-semibold bg-white whitespace-nowrap"
                  style={{ borderBottom: `2px solid ${SEGMENT_ACCENT[seg]}`, color: SEGMENT_ACCENT[seg] }}
                >
                  {SEGMENT_LABELS[seg]}
                </th>
              ))}
              <th
                rowSpan={2}
                className="px-2 py-1 text-center text-[10px] font-medium text-gray-900 border-b border-gray-200 border-l border-gray-200 align-bottom bg-gray-50 whitespace-nowrap"
              >
                Итого
              </th>
              {activeSignedSegments.map(seg => (
                <th
                  key={`sg-${seg}`}
                  colSpan={signedSegForms[seg].length}
                  className="px-2 py-1 text-center text-[11px] font-semibold bg-white whitespace-nowrap border-l-2 border-l-gray-300 first-of-type:border-l-2"
                  style={{ borderBottom: `2px solid ${SEGMENT_ACCENT[seg]}`, color: SEGMENT_ACCENT[seg] }}
                >
                  {SEGMENT_LABELS[seg]}
                </th>
              ))}
              <th
                rowSpan={2}
                className="px-2 py-1 text-center text-[10px] font-medium text-gray-900 border-b border-gray-200 border-l border-gray-200 align-bottom bg-gray-50 whitespace-nowrap"
              >
                Итого
              </th>
            </tr>
            {/* Строка 3: типы документов */}
            <tr className="bg-gray-50">
              {activeSegments.map(seg =>
                segForms[seg].map(form => (
                  <th
                    key={`iw-${seg}-${form}`}
                    className="px-1.5 py-1 text-center text-[10px] font-medium text-gray-500 border-b border-gray-200 whitespace-nowrap"
                    style={{ minWidth: 44 }}
                  >
                    {formatForm(form)}
                  </th>
                ))
              )}
              {activeSignedSegments.map((seg, si) =>
                signedSegForms[seg].map((form, fi) => (
                  <th
                    key={`sg-${seg}-${form}`}
                    className={`px-1.5 py-1 text-center text-[10px] font-medium text-gray-500 border-b border-gray-200 whitespace-nowrap bg-emerald-50/30 ${si === 0 && fi === 0 ? 'border-l-2 border-l-gray-300' : ''}`}
                    style={{ minWidth: 44 }}
                  >
                    {formatForm(form)}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={totalColCount} className="px-4 py-8 text-center text-gray-400">
                  Загрузка...
                </td>
              </tr>
            ) : allExecutors.length === 0 ? (
              <tr>
                <td colSpan={totalColCount} className="px-4 py-8 text-center text-gray-400">
                  Нет данных
                </td>
              </tr>
            ) : (
              allExecutors.map((name, idx) => {
                const isSelected = selectedPreparedBy === name;
                const isDrawer = drawerExecutor === name;
                const inWorkTotal = SEGMENTS.reduce((s, seg) => s + (segIndex[seg][name]?.count ?? 0), 0);
                const signedTotal = SEGMENTS.reduce((s, seg) => s + (signedIndex[seg][name]?.count ?? 0), 0);
                return (
                  <tr
                    key={name}
                    className={`border-b border-gray-100 transition-colors cursor-pointer ${
                      isDrawer
                        ? 'bg-blue-50/40'
                        : idx % 2 === 0
                          ? 'bg-white hover:bg-gray-50/60'
                          : 'bg-gray-50/30 hover:bg-gray-50/60'
                    }`}
                    onClick={() => handleRowClick(name)}
                  >
                    {/* Исполнитель */}
                    <td className={`px-2 py-1.5 border-r border-gray-200 whitespace-nowrap ${isSelected ? 'bg-blue-50' : ''}`}>
                      <span className={`font-medium ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>
                        {name}
                      </span>
                    </td>

                    {/* В работе: ячейки по сегментам */}
                    {activeSegments.map(seg =>
                      segForms[seg].map(form => {
                        const val = segIndex[seg][name]?.countByDocumentForm?.[form] ?? 0;
                        const style = heatmapCellStyle(val, colMaxValues[`iw::${seg}::${form}`] ?? 0, SEGMENT_HUE[seg]);
                        return (
                          <td
                            key={`iw-${seg}-${form}`}
                            onClick={val > 0 ? (e) => handleCellClick(e, name, seg, form) : undefined}
                            style={style}
                            title={val > 0 ? `${name} · ${SEGMENT_LABELS[seg]} · ${form}: ${val}` : undefined}
                            className={`py-1.5 text-center font-medium ${val > 0 ? 'cursor-pointer' : ''}`}
                          >
                            {val > 0 ? val : <span className="text-gray-200 text-[10px]">·</span>}
                          </td>
                        );
                      })
                    )}
                    {/* В работе: итого */}
                    <td
                      className="px-2 py-1.5 text-center border-l border-gray-200 font-semibold text-gray-900 bg-gray-50"
                      onClick={(e) => { e.stopPropagation(); onPreparedByClick(name); }}
                    >
                      {inWorkTotal > 0 ? inWorkTotal : <span className="text-gray-300">—</span>}
                    </td>

                    {/* Подписано: ячейки по сегментам */}
                    {activeSignedSegments.map((seg, si) =>
                      signedSegForms[seg].map((form, fi) => {
                        const val = signedIndex[seg][name]?.countByDocumentForm?.[form] ?? 0;
                        const style = heatmapCellStyle(val, colMaxValues[`sg::${seg}::${form}`] ?? 0, SEGMENT_HUE[seg]);
                        return (
                          <td
                            key={`sg-${seg}-${form}`}
                            onClick={val > 0 ? (e) => handleSignedCellClick(e, name, seg, form) : undefined}
                            style={style}
                            title={val > 0 ? `${name} · ${SEGMENT_LABELS[seg]} · ${form}: ${val}` : undefined}
                            className={`py-1.5 text-center font-medium ${val > 0 ? 'cursor-pointer' : ''} ${si === 0 && fi === 0 ? 'border-l-2 border-l-gray-300' : ''}`}
                          >
                            {val > 0 ? val : <span className="text-gray-200 text-[10px]">·</span>}
                          </td>
                        );
                      })
                    )}
                    {/* Подписано: итого */}
                    <td
                      onClick={signedTotal > 0 ? (e) => handleSignedRowClick(e, name) : undefined}
                      className={`px-2 py-1.5 text-center border-l border-gray-200 bg-gray-50 font-semibold ${
                        signedTotal > 0 ? 'text-gray-900 cursor-pointer hover:bg-emerald-100/60' : 'text-gray-300'
                      }`}
                    >
                      {signedTotal > 0 ? signedTotal : '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {!loading && allExecutors.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                <td className="px-2 py-1.5 text-xs text-gray-600 border-r border-gray-200">Итого</td>
                {activeSegments.map(seg =>
                  segForms[seg].map(form => {
                    const sum = segRows[seg].reduce((s, r) => s + (r.countByDocumentForm?.[form] ?? 0), 0);
                    return (
                      <td key={`iw-${seg}-${form}`} className="py-1.5 text-center text-xs text-gray-700">
                        {sum > 0 ? sum : <span className="text-gray-300">—</span>}
                      </td>
                    );
                  })
                )}
                <td className="px-2 py-1.5 text-center text-xs font-bold text-gray-900 border-l border-gray-200 bg-gray-50">
                  {inWorkGrandTotal || <span className="text-gray-300">—</span>}
                </td>
                {activeSignedSegments.map((seg, si) =>
                  signedSegForms[seg].map((form, fi) => {
                    const sum = signedRows[seg].reduce((s, r) => s + (r.countByDocumentForm?.[form] ?? 0), 0);
                    return (
                      <td
                        key={`sg-${seg}-${form}`}
                        className={`py-1.5 text-center text-xs text-gray-700 bg-gray-50/40 ${si === 0 && fi === 0 ? 'border-l-2 border-l-gray-300' : ''}`}
                      >
                        {sum > 0 ? sum : <span className="text-gray-300">—</span>}
                      </td>
                    );
                  })
                )}
                <td className="px-2 py-1.5 text-center text-xs font-bold text-gray-900 border-l border-gray-200 bg-gray-50">
                  {signedGrandTotal || <span className="text-gray-300">—</span>}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Drawer */}
      {drawerExecutor && (
        <ExecutorDrawer
          executor={drawerExecutor}
          segForms={segForms}
          signedSegForms={signedSegForms}
          segIndex={segIndex}
          signedIndex={signedIndex}
          onClose={() => setDrawerExecutor(null)}
        />
      )}
    </div>
  );
}
