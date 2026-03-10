'use client';

import { useState, useCallback, useEffect } from 'react';
import { getBackendUrl } from '@/utils/api';
import { ApprovalsSummaryTable } from './ApprovalsSummaryTable';
import { ApprovalsGroupedTable } from './ApprovalsGroupedTable';
import { ContractDurationTable } from './ContractDurationTable';
import { PresentationSlide } from './PresentationSlide';

type ApprovalsSubTab = 'by-role' | 'by-person' | 'by-document-form' | 'by-contract' | 'presentation';

const SUB_TABS: { id: ApprovalsSubTab; label: string }[] = [
  { id: 'by-role', label: 'По ролям' },
  { id: 'by-person', label: 'По ФИО' },
  { id: 'by-document-form', label: 'По виду документа' },
  { id: 'by-contract', label: 'По документам' },
  { id: 'presentation', label: 'Презентация' },
];

export function ApprovalsTabContent() {
  const [activeSubTab, setActiveSubTab] = useState<ApprovalsSubTab>('by-role');
  const [documentFormOptions, setDocumentFormOptions] = useState<string[]>([]);

  useEffect(() => {
    fetch(`${getBackendUrl()}/api/overview/approvals-summary/document-forms`)
      .then((r) => r.ok ? r.json() : [])
      .then((json) => setDocumentFormOptions(Array.isArray(json) ? json : []))
      .catch(() => setDocumentFormOptions([]));
  }, []);

  const buildPersonUrl = useCallback((year: number | '', documentForm: string) => {
    const params = new URLSearchParams();
    if (year !== '') params.set('year', String(year));
    if (documentForm) params.set('documentForm', documentForm);
    const qs = params.toString();
    return `${getBackendUrl()}/api/overview/approvals-summary/by-person${qs ? `?${qs}` : ''}`;
  }, []);

  const buildDocFormUrl = useCallback((year: number | '') => {
    const params = new URLSearchParams();
    if (year !== '') params.set('year', String(year));
    const qs = params.toString();
    return `${getBackendUrl()}/api/overview/approvals-summary/by-document-form${qs ? `?${qs}` : ''}`;
  }, []);

  return (
    <div className="flex flex-col gap-2">
      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSubTab(tab.id)}
            className={`px-3 py-1 text-xs font-medium rounded-t transition-colors whitespace-nowrap ${
              activeSubTab === tab.id
                ? 'bg-white border border-b-white border-gray-200 text-blue-600 -mb-px'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeSubTab === 'by-role' && <ApprovalsSummaryTable />}
      {activeSubTab === 'by-person' && (
        <ApprovalsGroupedTable
          keyColumnLabel="ФИО исполнителя"
          buildUrl={buildPersonUrl}
          showDocumentFormFilter
        />
      )}
      {activeSubTab === 'by-document-form' && (
        <ApprovalsGroupedTable
          keyColumnLabel="Вид документа"
          buildUrl={(year) => buildDocFormUrl(year)}
          showDocumentFormFilter={false}
          showDocumentCount
        />
      )}
      {activeSubTab === 'by-contract' && (
        <ContractDurationTable documentFormOptions={documentFormOptions} />
      )}
      {activeSubTab === 'presentation' && (
        <PresentationSlide />
      )}
    </div>
  );
}
