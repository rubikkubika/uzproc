'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getBackendUrl } from '@/utils/api';

/* ─── Типы ──────────────────────────────────────────────────────────────── */

interface RoleRow    { role: string; count: number; avgDurationDays: number | null; }
interface GroupedRow { key: string;  count: number; avgDurationDays: number | null; documentCount?: number | null; department?: string | null; }
interface ContractRow { innerId: string; documentForm: string; durationDays: number; }

interface YearData {
  byRole:     { rows: RoleRow[];    totalCount: number; totalAvgDurationDays: number | null; };
  byPerson:   { rows: GroupedRow[]; totalCount: number; totalAvgDurationDays: number | null; };
  byDocForm:  { rows: GroupedRow[]; totalCount: number; totalAvgDurationDays: number | null; };
  byContract: { rows: ContractRow[]; totalCount: number; avgDurationDays: number | null; };
}

/* ─── Вспомогательные ───────────────────────────────────────────────────── */

const fmt = (d: number | null | undefined, dec = 1) =>
  d == null ? '—' : d % 1 === 0 ? String(Math.round(d)) : d.toFixed(dec);

// Δ-ячейка: разница b−a, invertGood=true означает что меньше — лучше
function DeltaCell({ a, b, invertGood = false }: { a: number | null; b: number | null; invertGood?: boolean }) {
  if (a == null || b == null) return <span style={{ color: '#94a3b8' }}>—</span>;
  const diff = b - a;
  if (diff === 0) return <span style={{ color: '#64748b' }}>0</span>;
  const better = invertGood ? diff < 0 : diff > 0;
  const color = better ? '#16a34a' : '#dc2626';
  const sign = diff > 0 ? '+' : '';
  return <span style={{ color, fontWeight: 700 }}>{sign}{diff % 1 === 0 ? diff : diff.toFixed(1)}</span>;
}

const pct = (a: number, b: number) => {
  if (!b) return '';
  const diff = ((a - b) / b) * 100;
  return diff >= 0 ? `+${diff.toFixed(0)}%` : `${diff.toFixed(0)}%`;
};

const pctColor = (a: number, b: number, invertGood = false) => {
  if (!b) return '#64748b';
  const diff = a - b;
  if (diff === 0) return '#64748b';
  const better = invertGood ? diff < 0 : diff > 0;
  return better ? '#16a34a' : '#dc2626';
};

/* ─── Загрузка данных за год ────────────────────────────────────────────── */

async function fetchYear(year: number, documentForms?: Set<string>): Promise<YearData> {
  const params = new URLSearchParams({ year: String(year) });
  if (documentForms && documentForms.size > 0) {
    documentForms.forEach(df => params.append('documentForm', df));
  }
  const qs = `?${params}`;
  const [r1, r2, r3, r4] = await Promise.all([
    fetch(`${getBackendUrl()}/api/overview/approvals-summary${qs}`),
    fetch(`${getBackendUrl()}/api/overview/approvals-summary/by-person${qs}`),
    fetch(`${getBackendUrl()}/api/overview/approvals-summary/by-document-form?year=${year}`),
    fetch(`${getBackendUrl()}/api/overview/approvals-summary/by-contract${qs}`),
  ]);
  const [j1, j2, j3, j4] = await Promise.all([r1.json(), r2.json(), r3.json(), r4.json()]);
  return {
    byRole:     { rows: j1.rows ?? [], totalCount: j1.totalCount ?? 0, totalAvgDurationDays: j1.totalAvgDurationDays ?? null },
    byPerson:   { rows: j2.rows ?? [], totalCount: j2.totalCount ?? 0, totalAvgDurationDays: j2.totalAvgDurationDays ?? null },
    byDocForm:  { rows: j3.rows ?? [], totalCount: j3.totalCount ?? 0, totalAvgDurationDays: j3.totalAvgDurationDays ?? null },
    byContract: { rows: j4.rows ?? [], totalCount: j4.totalCount ?? 0, avgDurationDays: j4.avgDurationDays ?? null },
  };
}

/* ─── Агрегация договоров по виду документа ─────────────────────────────── */

function groupContracts(rows: ContractRow[]) {
  const map = new Map<string, { count: number; totalDays: number }>();
  for (const r of rows) {
    const g = map.get(r.documentForm) ?? { count: 0, totalDays: 0 };
    g.count++;
    g.totalDays += r.durationDays;
    map.set(r.documentForm, g);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .map(([k, { count, totalDays }]) => ({
      key: k, count, avgDays: count > 0 ? totalDays / count : null,
    }));
}

/* ─── Стили слайда ──────────────────────────────────────────────────────── */

const SLIDE_STYLE: React.CSSProperties = {
  width: '277mm',
  height: '190mm',
  padding: '4mm 5mm',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  gap: '2.5mm',
  fontFamily: 'Arial, sans-serif',
  background: '#fff',
};

/* ─── Мини-компоненты ───────────────────────────────────────────────────── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '6pt', fontWeight: 700, color: '#1e3a5f', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '0.5px solid #cbd5e1', paddingBottom: '0.5mm', marginBottom: '1mm' }}>
      {children}
    </div>
  );
}

function CompareTable({ headers, rows, maxRows = 10 }: {
  headers: string[];
  rows: (string | number | React.ReactNode)[][];
  maxRows?: number;
}) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '6pt', lineHeight: '1.25', tableLayout: 'fixed' }}>
      <thead>
        <tr style={{ background: '#bfdbfe' }}>
          {headers.map((h, i) => (
            <th key={i} style={{ padding: '1px 3px', fontWeight: 700, color: '#0f172a', border: '0.5px solid #cbd5e1', textAlign: i === 0 ? 'left' : 'center', whiteSpace: 'nowrap' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.slice(0, maxRows).map((row, ri) => (
          <tr key={ri} style={{ background: ri % 2 === 0 ? '#fff' : '#f8fafc' }}>
            {row.map((cell, ci) => (
              <td key={ci} style={{ padding: '1px 3px', border: '0.5px solid #e2e8f0', textAlign: ci === 0 ? 'left' : 'center', maxWidth: ci === 0 ? '90px' : undefined, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#0f172a' }}>
                {cell ?? '—'}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MetricCard({ label, val25, val26, invertGood = false, noPercent = false }: { label: string; val25: string; val26: string; invertGood?: boolean; noPercent?: boolean }) {
  const n25 = parseFloat(val25.replace(/[^0-9.]/g, '')) || 0;
  const n26 = parseFloat(val26.replace(/[^0-9.]/g, '')) || 0;
  const delta = noPercent ? '' : pct(n26, n25);
  const color = pctColor(n26, n25, invertGood);
  return (
    <div style={{ background: '#f0f4f8', borderRadius: '2mm', padding: '2mm 3mm', display: 'flex', flexDirection: 'column', gap: '1mm', flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: '5pt', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '2mm' }}>
        <div><div style={{ fontSize: '5pt', color: '#94a3b8' }}>2025</div><div style={{ fontSize: '9pt', fontWeight: 700, color: '#1e293b' }}>{val25}</div></div>
        <div><div style={{ fontSize: '5pt', color: '#94a3b8' }}>2026</div><div style={{ fontSize: '9pt', fontWeight: 700, color: '#1e293b' }}>{val26}</div></div>
        {delta && <div style={{ fontSize: '7pt', fontWeight: 700, color, alignSelf: 'center' }}>{delta}</div>}
      </div>
    </div>
  );
}

function MetricGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1mm' }}>
      <div style={{ fontSize: '5pt', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ display: 'flex', gap: '2mm' }}>{children}</div>
    </div>
  );
}

/* ─── Вывод с редактированием через contenteditable ─────────────────────── */

function ConclusionItem({ text, editable, onBlur, onRemove }: {
  text: string;
  editable: boolean;
  onBlur: (val: string) => void;
  onRemove: () => void;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  // Синхронизируем текст при внешнем изменении (сброс/добавление)
  useEffect(() => {
    if (ref.current && ref.current.textContent !== text) {
      ref.current.textContent = text;
    }
  }, [text]);

  return (
    <div style={{ display: 'flex', gap: '1.5mm', alignItems: 'flex-start' }}>
      <span style={{ fontSize: '8pt', color: '#2563eb', fontWeight: 700, flexShrink: 0, lineHeight: '1.5' }}>→</span>
      <span
        ref={ref}
        contentEditable={editable}
        suppressContentEditableWarning
        onBlur={(e) => onBlur(e.currentTarget.textContent || '')}
        style={{
          fontSize: '8.5pt',
          color: '#1e293b',
          lineHeight: '1.5',
          flex: 1,
          outline: 'none',
          borderBottom: editable ? '0.5px dashed #93c5fd' : 'none',
          cursor: editable ? 'text' : 'default',
          minWidth: '10px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {text}
      </span>
      {editable && (
        <button
          type="button"
          className="slide-edit-controls"
          onClick={onRemove}
          style={{ fontSize: '6pt', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '0', lineHeight: '1.5', flexShrink: 0 }}
        >✕</button>
      )}
    </div>
  );
}

/* ─── СЛАЙД ─────────────────────────────────────────────────────────────── */

function Slide({ d25, d26, conclusions, editable, onUpdate, onAdd, onRemove }: {
  d25: YearData;
  d26: YearData;
  conclusions: string[];
  editable?: boolean;
  onUpdate?: (idx: number, val: string) => void;
  onAdd?: () => void;
  onRemove?: (idx: number) => void;
}) {
  const cg25 = useMemo(() => groupContracts(d25.byContract.rows), [d25]);
  const cg26 = useMemo(() => groupContracts(d26.byContract.rows), [d26]);

  const roleMap = useMemo(() => {
    const all = new Set([...d25.byRole.rows.map(r => r.role), ...d26.byRole.rows.map(r => r.role)]);
    const m25 = new Map(d25.byRole.rows.map(r => [r.role, r]));
    const m26 = new Map(d26.byRole.rows.map(r => [r.role, r]));
    return Array.from(all)
      .map(role => ({ role, c25: m25.get(role)?.count ?? 0, a25: m25.get(role)?.avgDurationDays ?? null, c26: m26.get(role)?.count ?? 0, a26: m26.get(role)?.avgDurationDays ?? null }))
      .sort((a, b) => (b.c25 + b.c26) - (a.c25 + a.c26));
  }, [d25, d26]);

  const contractDurMap = useMemo(() => {
    const all = new Set([...cg25.map(r => r.key), ...cg26.map(r => r.key)]);
    const m25 = new Map(cg25.map(r => [r.key, r]));
    const m26 = new Map(cg26.map(r => [r.key, r]));
    return Array.from(all)
      .map(key => ({ key, cnt25: m25.get(key)?.count ?? 0, avg25: m25.get(key)?.avgDays ?? null, cnt26: m26.get(key)?.count ?? 0, avg26: m26.get(key)?.avgDays ?? null }))
      .sort((a, b) => (b.cnt25 + b.cnt26) - (a.cnt25 + a.cnt26));
  }, [cg25, cg26]);

  // По ФИО — отсортированы по убыванию среднего срока
  const personRows25 = useMemo(() =>
    [...d25.byPerson.rows].sort((a, b) => (b.avgDurationDays ?? 0) - (a.avgDurationDays ?? 0)), [d25]);
  const personRows26 = useMemo(() =>
    [...d26.byPerson.rows].sort((a, b) => (b.avgDurationDays ?? 0) - (a.avgDurationDays ?? 0)), [d26]);

  const totalApprovals25 = d25.byRole.totalCount;
  const totalApprovals26 = d26.byRole.totalCount;
  const avgDays25 = d25.byRole.totalAvgDurationDays;
  const avgDays26 = d26.byRole.totalAvgDurationDays;

  return (
    <div className="presentation-slide" style={SLIDE_STYLE}>
      {/* Заголовок */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid #1e3a5f', paddingBottom: '1.5mm' }}>
        <span style={{ fontSize: '9pt', fontWeight: 700, color: '#1e3a5f', letterSpacing: '0.03em' }}>
          СВОДКА СОГЛАСОВАНИЙ ДОГОВОРОВ — ИТОГИ 2025 / 2026
        </span>
        <span style={{ fontSize: '6pt', color: '#64748b' }}>
          Исключены: Синхронизация · Регистрация · Принятие на хранение
        </span>
      </div>

      {/* Основной контент — 2 колонки */}
      <div style={{ display: 'flex', gap: '3mm' }}>

        {/* Левая колонка: метрики + таблицы по ролям и форме документа */}
        <div style={{ flex: '0 0 44%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2mm' }}>
          {/* Карточки метрик */}
          <div style={{ display: 'flex', gap: '4mm', alignItems: 'flex-start' }}>
            <MetricGroup label="Согласования">
              <MetricCard label="Кол-во" val25={totalApprovals25.toLocaleString()} val26={totalApprovals26.toLocaleString()} noPercent />
              <MetricCard label="Ср. срок (дн.)" val25={fmt(avgDays25)} val26={fmt(avgDays26)} invertGood />
            </MetricGroup>
            <div style={{ width: '0.5px', background: '#e2e8f0', alignSelf: 'stretch' }} />
            <MetricGroup label="Документы (договоры)">
              <MetricCard label="Кол-во" val25={d25.byContract.totalCount.toLocaleString()} val26={d26.byContract.totalCount.toLocaleString()} noPercent />
              <MetricCard label="Ср. срок (дн.)" val25={fmt(d25.byContract.avgDurationDays)} val26={fmt(d26.byContract.avgDurationDays)} invertGood />
            </MetricGroup>
          </div>
          {/* По ролям */}
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <SectionTitle>По ролям — сравнение 2025 / 2026</SectionTitle>
            <CompareTable
              headers={['Роль', '25 кол', '25 дн', '26 кол', '26 дн', 'Δ дн']}
              rows={roleMap.map(r => [
                r.role,
                r.c25 || '—', fmt(r.a25),
                r.c26 || '—', fmt(r.a26),
                <DeltaCell key="d" a={r.a25} b={r.a26} invertGood />,
              ])}
              maxRows={7}
            />
          </div>
          {/* По форме документа */}
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <SectionTitle>Срок — по форме документа (2025 / 2026)</SectionTitle>
            <CompareTable
              headers={['Форма документа', '25 дн', '26 дн', 'Δ дн']}
              rows={contractDurMap.map(r => [
                r.key,
                fmt(r.avg25), fmt(r.avg26),
                <DeltaCell key="d" a={r.avg25} b={r.avg26} invertGood />,
              ])}
              maxRows={7}
            />
          </div>
        </div>

        {/* Правая колонка: таблицы по ФИО (2 рядом, растянуты на полную высоту) */}
        <div style={{ flex: 1, minWidth: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr', gap: '3mm' }}>
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <SectionTitle>По ФИО — 2025 (по сроку ↓)</SectionTitle>
            <CompareTable
              headers={['ФИО', 'Роль', 'Кол', 'Дн']}
              rows={personRows25.map(r => [r.key, r.department || '—', r.count, fmt(r.avgDurationDays)])}
              maxRows={15}
            />
          </div>
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <SectionTitle>По ФИО — 2026 (по сроку ↓)</SectionTitle>
            <CompareTable
              headers={['ФИО', 'Роль', 'Кол', 'Дн']}
              rows={personRows26.map(r => [r.key, r.department || '—', r.count, fmt(r.avgDurationDays)])}
              maxRows={15}
            />
          </div>
        </div>

      </div>

      {/* Выводы — под таблицами */}
      <div style={{ borderTop: '0.5px solid #cbd5e1', paddingTop: '2mm' }}>
        <div style={{ fontSize: '8pt', fontWeight: 700, color: '#1e3a5f', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '1.5mm' }}>
          Выводы
          {editable && <span className="slide-edit-controls" style={{ fontSize: '6pt', color: '#93c5fd', fontWeight: 400, marginLeft: '2mm', textTransform: 'none' }}>— кликните на текст для редактирования</span>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5mm' }}>
          {conclusions.map((c, i) => (
            <ConclusionItem
              key={i}
              text={c}
              editable={!!editable}
              onBlur={(val) => onUpdate?.(i, val)}
              onRemove={() => onRemove?.(i)}
            />
          ))}
          {editable && (
            <button
              type="button"
              className="slide-edit-controls"
              onClick={() => onAdd?.()}
              style={{ fontSize: '6pt', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: '0', marginTop: '1mm', textAlign: 'left', fontFamily: 'Arial, sans-serif' }}
            >
              + Добавить вывод
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Главный компонент ─────────────────────────────────────────────────── */

export function PresentationSlide() {
  const [data25, setData25] = useState<YearData | null>(null);
  const [data26, setData26] = useState<YearData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conclusions, setConclusions] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [selectedDocForms, setSelectedDocForms] = useState<Set<string>>(new Set());
  const [docFormOptions, setDocFormOptions] = useState<string[]>([]);
  const [docFormDropdownOpen, setDocFormDropdownOpen] = useState(false);
  const docFormDropdownRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    fetch(`${getBackendUrl()}/api/overview/approvals-summary/document-forms`)
      .then(r => r.json())
      .then((opts: string[]) => setDocFormOptions(opts))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!docFormDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (docFormDropdownRef.current && !docFormDropdownRef.current.contains(e.target as Node)) {
        setDocFormDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [docFormDropdownOpen]);

  const generateConclusions = useCallback((d25: YearData, d26: YearData): string[] => {
    const cg26 = groupContracts(d26.byContract.rows);
    const topRole26 = d26.byRole.rows[0];
    const topDocForm26 = d26.byDocForm.rows[0];
    const longestDocForm26 = [...d26.byDocForm.rows].sort((a, b) => (b.avgDurationDays ?? 0) - (a.avgDurationDays ?? 0))[0];
    const longestContract26 = cg26[0];
    const t25 = d25.byRole.totalCount, t26 = d26.byRole.totalCount;
    const a25 = d25.byRole.totalAvgDurationDays, a26 = d26.byRole.totalAvgDurationDays;
    return [
      t25 && t26 ? `Кол-во завершённых согласований: 2025 — ${t25.toLocaleString()}, 2026 — ${t26.toLocaleString()} (${pct(t26, t25) || 'без изм.'})` : null,
      a25 != null && a26 != null ? `Средний срок согласования: 2025 — ${fmt(a25)} дн., 2026 — ${fmt(a26)} дн. (${a26 < a25 ? '▼ улучшение' : a26 > a25 ? '▲ рост' : 'без изм.'})` : null,
      topRole26 ? `Наибольшая нагрузка 2026: роль «${topRole26.role}» — ${topRole26.count.toLocaleString()} согл., ср. ${fmt(topRole26.avgDurationDays)} дн.` : null,
      topDocForm26 ? `Самый частый вид документа 2026: «${topDocForm26.key}» — ${topDocForm26.count.toLocaleString()} согл., ${topDocForm26.documentCount ?? '?'} дог.` : null,
      longestDocForm26 && longestDocForm26.key !== topDocForm26?.key ? `Наибольший срок 2026 по виду: «${longestDocForm26.key}» — ${fmt(longestDocForm26.avgDurationDays)} дн. ср.` : null,
      longestContract26 ? `Долгосрочный вид договора 2026: «${longestContract26.key}» — ср. ${fmt(longestContract26.avgDays)} дн.` : null,
    ].filter(Boolean) as string[];
  }, []);

  const fetchAll = useCallback(async (docForms?: Set<string>) => {
    loadedRef.current = false;
    setLoading(true);
    setError(null);
    try {
      const [y25, y26, savedResp] = await Promise.all([
        fetchYear(2025, docForms), fetchYear(2026, docForms),
        fetch(`${getBackendUrl()}/api/overview/approval-presentation`),
      ]);
      setData25(y25);
      setData26(y26);
      let initial: string[];
      if (savedResp.ok) {
        const saved = await savedResp.json();
        initial = Array.isArray(saved.conclusions) && saved.conclusions.length > 0
          ? saved.conclusions : generateConclusions(y25, y26);
      } else {
        initial = generateConclusions(y25, y26);
      }
      setConclusions(initial);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
      setTimeout(() => { loadedRef.current = true; }, 200);
    }
  }, [generateConclusions]);

  // Стабилизируем Set для useEffect зависимостей
  const selectedDocFormsStr = Array.from(selectedDocForms).sort().join(',');
  useEffect(() => { fetchAll(selectedDocForms.size > 0 ? selectedDocForms : undefined); }, [fetchAll, selectedDocFormsStr]); // eslint-disable-line react-hooks/exhaustive-deps

  // Автосохранение с дебаунсом 1.5с
  useEffect(() => {
    if (!loadedRef.current) return;
    setSaveStatus('saving');
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${getBackendUrl()}/api/overview/approval-presentation`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conclusions }),
        });
        setSaveStatus(res.ok ? 'saved' : 'error');
        if (res.ok) setTimeout(() => setSaveStatus('idle'), 2000);
      } catch { setSaveStatus('error'); }
    }, 1500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conclusions]);

  const handlePrint = useCallback(() => { window.print(); }, []);
  const updateConclusion = useCallback((idx: number, val: string) =>
    setConclusions(prev => prev.map((c, i) => i === idx ? val : c)), []);
  const addConclusion = useCallback(() =>
    setConclusions(prev => [...prev, 'Новый вывод']), []);
  const removeConclusion = useCallback((idx: number) =>
    setConclusions(prev => prev.filter((_, i) => i !== idx)), []);
  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 0; }
          body * { visibility: hidden !important; }
          .slide-print-area,
          .slide-print-area * { visibility: visible !important; }
          .slide-print-area {
            position: fixed !important;
            top: 0 !important; left: 0 !important;
            width: 297mm !important; height: 210mm !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: white !important;
            padding: 0 !important;
          }
          .slide-print-scale {
            transform: none !important;
            margin-bottom: 0 !important;
          }
          .presentation-slide { box-shadow: none !important; }
          .slide-edit-controls { display: none !important; }
          .presentation-slide [contenteditable] { border-bottom: none !important; }
        }
      `}</style>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Панель управления */}
        <div className="px-3 py-1.5 border-b border-gray-200 bg-gray-50 flex items-center gap-3 flex-wrap">
          <span className="text-xs font-medium text-gray-700">Сводка согласований — 2025/2026</span>
          {docFormOptions.length > 0 && (
            <div className="relative" ref={docFormDropdownRef}>
              <button
                type="button"
                onClick={() => setDocFormDropdownOpen(v => !v)}
                className="text-xs border border-gray-300 rounded px-2 py-0.5 text-gray-900 bg-white hover:bg-gray-50 flex items-center gap-1 min-w-[140px] justify-between"
              >
                <span className="truncate">{selectedDocForms.size === 0 ? 'Все виды документов' : `Выбрано: ${selectedDocForms.size}`}</span>
                <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {docFormDropdownOpen && (
                <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg min-w-[220px] max-h-48 overflow-y-auto">
                  <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                    <input type="checkbox" checked={selectedDocForms.size === 0}
                      onChange={() => setSelectedDocForms(new Set())}
                      className="rounded" />
                    <span className="text-xs text-gray-700 font-medium">Все</span>
                  </label>
                  {docFormOptions.map(opt => (
                    <label key={opt} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox" checked={selectedDocForms.has(opt)}
                        onChange={e => {
                          setSelectedDocForms(prev => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(opt); else next.delete(opt);
                            return next;
                          });
                        }}
                        className="rounded" />
                      <span className="text-xs text-gray-900">{opt}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            {saveStatus === 'saving' && <span className="text-xs text-gray-400">Сохранение…</span>}
            {saveStatus === 'saved'  && <span className="text-xs text-green-600">Сохранено ✓</span>}
            {saveStatus === 'error'  && <span className="text-xs text-red-600">Ошибка сохранения</span>}
            <button type="button" onClick={handlePrint} disabled={loading || !data25}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Сохранить PDF
            </button>
          </div>
        </div>

        {/* Превью слайда — оно же используется для печати */}
        <div className="slide-print-area p-4 bg-gray-100 flex justify-center overflow-x-auto" style={{ minHeight: '380px' }}>
          {loading ? (
            <div className="flex items-center justify-center w-full text-sm text-gray-500">Загрузка данных за 2025 и 2026…</div>
          ) : error ? (
            <div className="flex items-center justify-center w-full text-sm text-red-600">{error}</div>
          ) : data25 && data26 ? (
            <div className="slide-print-scale" style={{ transform: 'scale(0.72)', transformOrigin: 'top center', width: '277mm', marginBottom: 'calc((190mm * 0.72) - 190mm)', boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>
              <Slide
                d25={data25} d26={data26} conclusions={conclusions}
                editable
                onUpdate={updateConclusion}
                onAdd={addConclusion}
                onRemove={removeConclusion}
              />
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
