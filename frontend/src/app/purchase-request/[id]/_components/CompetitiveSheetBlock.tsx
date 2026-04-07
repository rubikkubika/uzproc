'use client';

import React, { useRef, useState } from 'react';
import { getBackendUrl } from '@/utils/api';
import { Upload, Trash2, ExternalLink } from 'lucide-react';

// ---- Типы данных КЛ ----

interface CompetitiveSheetItem {
  num: number;
  name: string;
  unit: string | null;
  quantity: number | null;
}

interface CompetitiveSheetPrice {
  itemNum: number;
  priceWithoutVat: number | null;
  priceWithVat: number | null;
  totalWithoutVat: number | null;
  totalWithVat: number | null;
}

interface CompetitiveSheetCriteria {
  agreesWithContract: string | null;
  contractorStatus: string | null;
  paymentTerms: string | null;
  warrantyMonths: string | null;
  deliveryDays: string | null;
}

interface CompetitiveSheetParticipant {
  name: string;
  inn: string | null;
  isWinner: boolean;
  supplierId: number | null;
  supplierName: string | null;
  prices: CompetitiveSheetPrice[];
  criteria: CompetitiveSheetCriteria | null;
  techAssessment: string | null;
  initiatorComment: string | null;
  procurementComment: string | null;
}

interface CompetitiveSheetData {
  items: CompetitiveSheetItem[];
  participants: CompetitiveSheetParticipant[];
  uploadedAt: string | null;
}

interface Props {
  purchaseId: number;
  competitiveSheet: string | null;
  competitiveSheetUploadedAt: string | null;
  onUpdate: (competitiveSheet: string | null, uploadedAt: string | null) => void;
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return '';
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return s;
  }
}

export default function CompetitiveSheetBlock({ purchaseId, competitiveSheet, competitiveSheetUploadedAt, onUpdate }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCriteria, setShowCriteria] = useState(false);

  const data: CompetitiveSheetData | null = (() => {
    if (!competitiveSheet) return null;
    try { return JSON.parse(competitiveSheet); } catch { return null; }
  })();

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${getBackendUrl()}/api/purchases/${purchaseId}/competitive-sheet`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        setError('Ошибка загрузки файла. Проверьте формат конкурентного листа.');
        return;
      }
      const updated = await res.json();
      onUpdate(updated.competitiveSheet, updated.competitiveSheetUploadedAt);
    } catch {
      setError('Ошибка при загрузке файла');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!confirm('Удалить конкурентный лист?')) return;
    try {
      const res = await fetch(`${getBackendUrl()}/api/purchases/${purchaseId}/competitive-sheet`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onUpdate(null, null);
      }
    } catch {
      setError('Ошибка при удалении');
    }
  };

  if (!data) {
    // Нет КЛ — показываем кнопку загрузки
    return (
      <div className="mt-1.5 border-t border-gray-200 pt-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-600">Конкурентный лист:</span>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-3 h-3" />
            {uploading ? 'Загрузка...' : 'Загрузить Excel'}
          </button>
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
          }}
        />
      </div>
    );
  }

  const { items, participants } = data;
  const winnerIdx = participants.findIndex(p => p.isWinner);

  return (
    <div className="mt-1.5 border-t border-gray-200 pt-1.5">
      {/* Заголовок */}
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <span className="text-xs font-semibold text-gray-700">Конкурентный лист</span>
        {competitiveSheetUploadedAt && (
          <span className="text-[10px] text-gray-400">{fmtDate(competitiveSheetUploadedAt)}</span>
        )}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 disabled:opacity-50"
          title="Заменить файл"
        >
          <Upload className="w-2.5 h-2.5" />
          {uploading ? 'Загрузка...' : 'Заменить'}
        </button>
        <button
          onClick={handleDelete}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100"
          title="Удалить КЛ"
        >
          <Trash2 className="w-2.5 h-2.5" />
          Удалить
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
        }}
      />

      {/* Таблица */}
      <div className="overflow-x-auto">
        <table className="text-[10px] border-collapse w-full min-w-max">
          <thead>
            {/* Строка 1: поставщики */}
            <tr>
              <th className="border border-gray-300 bg-gray-100 px-1 py-0.5 text-left font-semibold text-gray-600 whitespace-nowrap" rowSpan={2}>№</th>
              <th className="border border-gray-300 bg-gray-100 px-1 py-0.5 text-left font-semibold text-gray-600" rowSpan={2} style={{ minWidth: '180px' }}>Наименование</th>
              <th className="border border-gray-300 bg-gray-100 px-1 py-0.5 text-center font-semibold text-gray-600" rowSpan={2}>Ед.</th>
              <th className="border border-gray-300 bg-gray-100 px-1 py-0.5 text-center font-semibold text-gray-600" rowSpan={2}>Кол-во</th>
              {participants.map((p, idx) => (
                <th
                  key={idx}
                  colSpan={2}
                  className={`border border-gray-300 px-1 py-0.5 text-center font-semibold whitespace-nowrap ${p.isWinner ? 'bg-green-100 text-green-900' : 'bg-gray-100 text-gray-600'}`}
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="flex items-center gap-1">
                      {p.isWinner && <span className="text-green-700 font-bold">★</span>}
                      {p.supplierId ? (
                        <span className="text-blue-700" title={`Контрагент в БД: ${p.supplierName || p.name}`}>
                          {p.name}
                        </span>
                      ) : (
                        <span>{p.name}</span>
                      )}
                    </div>
                    {p.inn && (
                      <span className={`font-normal text-[9px] ${p.supplierId ? 'text-blue-500' : 'text-gray-400'}`}>
                        ИНН: {p.inn}{p.supplierId ? ' ✓' : ''}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
            {/* Строка 2: подзаголовки цен */}
            <tr>
              {participants.map((_, idx) => (
                <React.Fragment key={idx}>
                  <th className="border border-gray-300 bg-gray-50 px-1 py-0.5 text-center text-gray-500 whitespace-nowrap">
                    Цена без НДС
                  </th>
                  <th className="border border-gray-300 bg-gray-50 px-1 py-0.5 text-center text-gray-500 whitespace-nowrap">
                    Сумма без НДС
                  </th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.num} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-1 py-0.5 text-center text-gray-700">{item.num}</td>
                <td className="border border-gray-300 px-1 py-0.5 text-gray-900">{item.name}</td>
                <td className="border border-gray-300 px-1 py-0.5 text-center text-gray-700">{item.unit || '—'}</td>
                <td className="border border-gray-300 px-1 py-0.5 text-center text-gray-700">{item.quantity ?? '—'}</td>
                {participants.map((p, idx) => {
                  const price = p.prices?.find(pr => pr.itemNum === item.num);
                  const isWinner = p.isWinner;
                  const bg = isWinner ? 'bg-green-50' : '';
                  return (
                    <React.Fragment key={idx}>
                      <td className={`border border-gray-300 px-1 py-0.5 text-right text-gray-700 ${bg}`}>
                        {fmt(price?.priceWithoutVat)}
                      </td>
                      <td className={`border border-gray-300 px-1 py-0.5 text-right font-medium text-gray-900 ${bg}`}>
                        {fmt(price?.totalWithoutVat)}
                      </td>
                    </React.Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Дополнительные критерии */}
      {participants.some(p => p.criteria) && (
        <div className="mt-1">
          <button
            onClick={() => setShowCriteria(v => !v)}
            className="text-[10px] text-blue-600 hover:text-blue-800 underline"
          >
            {showCriteria ? 'Скрыть критерии' : 'Показать доп. критерии'}
          </button>
          {showCriteria && (
            <div className="mt-1 overflow-x-auto">
              <table className="text-[10px] border-collapse w-full min-w-max">
                <thead>
                  <tr>
                    <th className="border border-gray-300 bg-gray-100 px-1 py-0.5 text-left font-semibold text-gray-600" style={{ minWidth: '140px' }}>Критерий</th>
                    {participants.map((p, idx) => (
                      <th key={idx} className={`border border-gray-300 px-1 py-0.5 text-center font-semibold whitespace-nowrap ${p.isWinner ? 'bg-green-100 text-green-900' : 'bg-gray-100 text-gray-600'}`}>
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { key: 'agreesWithContract', label: 'Согласие с договором' },
                    { key: 'contractorStatus', label: 'Статус контрагента' },
                    { key: 'paymentTerms', label: 'Условия оплаты' },
                    { key: 'warrantyMonths', label: 'Гарантия (мес.)' },
                    { key: 'deliveryDays', label: 'Срок поставки (дн.)' },
                  ].map(({ key, label }) => (
                    <tr key={key} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-1 py-0.5 font-medium text-gray-600">{label}</td>
                      {participants.map((p, idx) => (
                        <td key={idx} className={`border border-gray-300 px-1 py-0.5 text-center text-gray-700 ${p.isWinner ? 'bg-green-50' : ''}`}>
                          {(p.criteria as Record<string, string | null>)?.[key] || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-1 py-0.5 font-medium text-gray-600">Тех. оценка</td>
                    {participants.map((p, idx) => (
                      <td key={idx} className={`border border-gray-300 px-1 py-0.5 text-center ${p.techAssessment === 'Соответствует' ? 'text-green-700' : 'text-red-600'} ${p.isWinner ? 'bg-green-50' : ''}`}>
                        {p.techAssessment || '—'}
                      </td>
                    ))}
                  </tr>
                  {participants.some(p => p.procurementComment) && (
                    <tr className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-1 py-0.5 font-medium text-gray-600">Комментарий Закупок</td>
                      {participants.map((p, idx) => (
                        <td key={idx} className={`border border-gray-300 px-1 py-0.5 text-gray-700 ${p.isWinner ? 'bg-green-50' : ''}`}>
                          {p.procurementComment || '—'}
                        </td>
                      ))}
                    </tr>
                  )}
                  {participants.some(p => p.initiatorComment) && (
                    <tr className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-1 py-0.5 font-medium text-gray-600">Комментарий инициатора</td>
                      {participants.map((p, idx) => (
                        <td key={idx} className={`border border-gray-300 px-1 py-0.5 text-gray-700 ${p.isWinner ? 'bg-green-50' : ''}`}>
                          {p.initiatorComment || '—'}
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Легенда: связь с контрагентами */}
      {participants.some(p => p.supplierId) && (
        <div className="mt-1 flex items-center gap-1 text-[9px] text-blue-500">
          <span>✓</span>
          <span>Контрагент найден в базе (подсвечен синим)</span>
        </div>
      )}
    </div>
  );
}
