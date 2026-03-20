'use client';

import { useState } from 'react';
import type { Invoice } from '../types/invoice.types';
import PartyCard from './PartyCard';

interface InvoiceResultProps {
  invoice: Invoice;
  onReset: () => void;
}

function formatNumber(n: number | null): string {
  if (n === null) return '—';
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const isConfirmed = status === 'ПОДТВЕРЖДЁН';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
      isConfirmed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
    }`}>
      {status}
    </span>
  );
}

function RiskBadge({ level }: { level: string | null }) {
  if (!level) return null;
  const colorMap: Record<string, string> = {
    'НИЗКИЙ': 'bg-green-100 text-green-800',
    'СРЕДНИЙ': 'bg-yellow-100 text-yellow-800',
    'ВЫСОКИЙ': 'bg-red-100 text-red-800',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
      colorMap[level] || 'bg-gray-100 text-gray-800'
    }`}>
      Риск: {level}
    </span>
  );
}

export default function InvoiceResult({ invoice, onReset }: InvoiceResultProps) {
  const [showJson, setShowJson] = useState(false);

  return (
    <div className="space-y-4">
      {/* Заголовок с кнопками */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">
            {invoice.document_type} № {invoice.number}
          </h3>
          <StatusBadge status={invoice.status} />
          <RiskBadge level={invoice.risk_level} />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowJson(!showJson)}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {showJson ? 'Таблица' : 'JSON'}
          </button>
          <button
            onClick={onReset}
            className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
          >
            Новый файл
          </button>
        </div>
      </div>

      {showJson ? (
        <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-[70vh]">
          <pre className="text-xs text-green-400 whitespace-pre-wrap">
            {JSON.stringify(invoice, null, 2)}
          </pre>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Основная информация */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500">Дата</p>
                <p className="text-sm font-medium text-gray-900">{invoice.date || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Договор</p>
                <p className="text-sm font-medium text-gray-900">
                  № {invoice.contract_number || '—'} от {invoice.contract_date || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Didox ID</p>
                <p className="text-xs font-mono text-gray-700 break-all">{invoice.didox_id || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Rouming ID</p>
                <p className="text-xs font-mono text-gray-700 break-all">{invoice.rouming_id || '—'}</p>
              </div>
            </div>
          </div>

          {/* Поставщик и покупатель */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PartyCard title="Поставщик" party={invoice.supplier} />
            <PartyCard title="Покупатель" party={invoice.buyer} />
          </div>

          {/* Таблица позиций */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-2 py-2 text-left text-gray-500 font-medium">№</th>
                  <th className="px-2 py-2 text-left text-gray-500 font-medium">Наименование</th>
                  <th className="px-2 py-2 text-left text-gray-500 font-medium">Код каталога</th>
                  <th className="px-2 py-2 text-center text-gray-500 font-medium">Ед.</th>
                  <th className="px-2 py-2 text-right text-gray-500 font-medium">Кол-во</th>
                  <th className="px-2 py-2 text-right text-gray-500 font-medium">Цена</th>
                  <th className="px-2 py-2 text-right text-gray-500 font-medium">Сумма</th>
                  <th className="px-2 py-2 text-center text-gray-500 font-medium">НДС %</th>
                  <th className="px-2 py-2 text-right text-gray-500 font-medium">НДС сумма</th>
                  <th className="px-2 py-2 text-right text-gray-500 font-medium">Итого</th>
                  <th className="px-2 py-2 text-left text-gray-500 font-medium">Происхождение</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-2 py-2 text-gray-900">{item.index}</td>
                    <td className="px-2 py-2 text-gray-900">{item.name || '—'}</td>
                    <td className="px-2 py-2 text-gray-700 font-mono">{item.catalog_code || '—'}</td>
                    <td className="px-2 py-2 text-center text-gray-900">{item.unit || '—'}</td>
                    <td className="px-2 py-2 text-right text-gray-900">{item.quantity ?? '—'}</td>
                    <td className="px-2 py-2 text-right text-gray-900">{formatNumber(item.price)}</td>
                    <td className="px-2 py-2 text-right text-gray-900">{formatNumber(item.subtotal)}</td>
                    <td className="px-2 py-2 text-center text-gray-900">{item.vat_rate ?? '—'}%</td>
                    <td className="px-2 py-2 text-right text-gray-900">{formatNumber(item.vat_amount)}</td>
                    <td className="px-2 py-2 text-right font-medium text-gray-900">{formatNumber(item.total)}</td>
                    <td className="px-2 py-2 text-gray-700">{item.origin || '—'}</td>
                  </tr>
                ))}
              </tbody>
              {invoice.totals && (
                <tfoot>
                  <tr className="bg-gray-50 font-medium">
                    <td colSpan={6} className="px-2 py-2 text-right text-gray-700">Итого:</td>
                    <td className="px-2 py-2 text-right text-gray-900">{formatNumber(invoice.totals.subtotal)}</td>
                    <td />
                    <td className="px-2 py-2 text-right text-gray-900">{formatNumber(invoice.totals.vat_amount)}</td>
                    <td className="px-2 py-2 text-right text-gray-900 font-semibold">{formatNumber(invoice.totals.total)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Итого текстом */}
          {invoice.totals?.total_text && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900">
                <span className="font-medium">Всего к оплате:</span> {invoice.totals.total_text}
              </p>
            </div>
          )}

          {/* Подписи */}
          {invoice.signatures && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {invoice.signatures.sent && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Отправлено</h4>
                  <dl className="space-y-1">
                    <div className="flex gap-2">
                      <dt className="text-xs text-gray-500 w-20">Номер:</dt>
                      <dd className="text-xs text-gray-900">{invoice.signatures.sent.number}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="text-xs text-gray-500 w-20">Дата:</dt>
                      <dd className="text-xs text-gray-900">{invoice.signatures.sent.datetime}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="text-xs text-gray-500 w-20">Подписант:</dt>
                      <dd className="text-xs text-gray-900">{invoice.signatures.sent.signer}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="text-xs text-gray-500 w-20">IP:</dt>
                      <dd className="text-xs text-gray-900">{invoice.signatures.sent.ip}</dd>
                    </div>
                  </dl>
                </div>
              )}
              {invoice.signatures.confirmed && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-green-800 mb-2">Подтверждено</h4>
                  <dl className="space-y-1">
                    <div className="flex gap-2">
                      <dt className="text-xs text-gray-500 w-20">Номер:</dt>
                      <dd className="text-xs text-gray-900">{invoice.signatures.confirmed.number}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="text-xs text-gray-500 w-20">Дата:</dt>
                      <dd className="text-xs text-gray-900">{invoice.signatures.confirmed.datetime}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="text-xs text-gray-500 w-20">Подписант:</dt>
                      <dd className="text-xs text-gray-900">{invoice.signatures.confirmed.signer}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="text-xs text-gray-500 w-20">IP:</dt>
                      <dd className="text-xs text-gray-900">{invoice.signatures.confirmed.ip}</dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
