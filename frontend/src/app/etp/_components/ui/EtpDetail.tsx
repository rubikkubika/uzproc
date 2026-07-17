'use client';

import { ExternalLink, Eye, Download as DownloadIcon, Star, Send } from 'lucide-react';
import { EtpProcedure } from '../types/etp.types';
import { formatDate, formatDateTime } from '../utils/etp.utils';
import EtpStatusBadge from './EtpStatusBadge';
import EtpDetailRules from './EtpDetailRules';
import EtpDetailPositions from './EtpDetailPositions';
import EtpDetailParticipants from './EtpDetailParticipants';
import EtpDetailResults from './EtpDetailResults';
import EtpDetailFiles from './EtpDetailFiles';
import EtpDetailCompetition from './EtpDetailCompetition';
import EtpReportsButtons from './EtpReportsButtons';

interface Props {
  procedure: EtpProcedure | null;
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        {title}
        {count != null && <span className="ml-1.5 text-gray-400 font-normal">({count})</span>}
      </h3>
      {children}
    </section>
  );
}

export default function EtpDetail({ procedure: p }: Props) {
  if (!p) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Выберите закупку из списка слева
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-4 space-y-4">
      {/* Заголовок */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-gray-500">№ {p.code}</span>
              <EtpStatusBadge status={p.statusRu} />
            </div>
            <h2 className="text-lg font-bold text-gray-900">{p.title}</h2>
            <div className="text-sm text-gray-500 mt-0.5">
              {p.customer.brandName}
              {p.customer.legalName ? ` · ${p.customer.legalName}` : ''}
            </div>
          </div>
          <a
            href={`https://b2biz.uz/home/tender/${p.guid}/overview`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            b2biz <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-sm">
          <div>
            <div className="text-xs text-gray-400">Создана</div>
            <div className="text-gray-900">{formatDate(p.createdDate)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Опубликована</div>
            <div className="text-gray-900">{formatDate(p.publishedDate)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Приём до</div>
            <div className="text-gray-900">{formatDateTime(p.deadline)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Завершена</div>
            <div className="text-gray-900">{formatDate(p.completedDate)}</div>
          </div>
        </div>

        {/* Мини-статистика */}
        <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-600">
          <span className="inline-flex items-center gap-1">
            <Send className="w-3.5 h-3.5" /> Предложений: {p.submittedCount}
          </span>
          <span className="inline-flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" /> Просмотров: {p.stat.views}
          </span>
          <span className="inline-flex items-center gap-1">
            <DownloadIcon className="w-3.5 h-3.5" /> Скачиваний: {p.stat.downloads}
          </span>
          <span className="inline-flex items-center gap-1">
            <Star className="w-3.5 h-3.5" /> В избранном: {p.stat.favorites}
          </span>
        </div>

        {(p.reports.competition || p.reports.history) && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <EtpReportsButtons reports={p.reports} code={p.code} />
          </div>
        )}
      </div>

      {/* Информация для участников */}
      {p.invitationHtml && (
        <Section title="Информация для участников">
          <div
            className="prose prose-sm max-w-none text-sm text-gray-700 [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:font-semibold"
            dangerouslySetInnerHTML={{ __html: p.invitationHtml }}
          />
          {p.contacts && (
            <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-600 whitespace-pre-line">
              <span className="text-xs text-gray-400 block mb-0.5">Контакты организатора</span>
              {p.contacts}
            </div>
          )}
        </Section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Правила */}
        <Section title="Правила проведения">
          <EtpDetailRules procedure={p} />
        </Section>

        {/* Категории и критерии */}
        <Section title="Категории и критерии">
          {p.categories.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-gray-400 mb-1">Ключевые слова</div>
              <div className="flex flex-wrap gap-1">
                {p.categories.map((c, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-gray-100 text-xs text-gray-600">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
          {p.criterias.length > 0 && (
            <div>
              <div className="text-xs text-gray-400 mb-1">Дополнительные критерии</div>
              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-0.5">
                {p.criterias.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </Section>
      </div>

      {/* Спецификация */}
      {p.positions.length > 0 && (
        <Section title="Спецификация позиций" count={p.positions.length}>
          <EtpDetailPositions positions={p.positions} />
        </Section>
      )}

      {/* Результаты */}
      <Section title="Результаты">
        <EtpDetailResults results={p.results} />
      </Section>

      {/* Конкурентный лист */}
      {p.competition && (
        <Section title="Конкурентный лист" count={p.competition.suppliers.length}>
          <EtpDetailCompetition competition={p.competition} />
        </Section>
      )}

      {/* Участники */}
      <Section title="Участники" count={p.participantsCount}>
        <EtpDetailParticipants participants={p.participants} />
      </Section>

      {/* Документы */}
      <Section title="Документы" count={p.filesCount}>
        <EtpDetailFiles files={p.files} />
      </Section>
    </div>
  );
}
