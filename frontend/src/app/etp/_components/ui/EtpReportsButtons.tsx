'use client';

import { FileSpreadsheet } from 'lucide-react';
import { EtpReports } from '../types/etp.types';

interface Props {
  reports: EtpReports;
  code: string;
}

export default function EtpReportsButtons({ reports, code }: Props) {
  if (!reports.competition && !reports.history) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {reports.competition && (
        <a
          href={reports.competition}
          download={`${code}_конкурентный_лист.xlsx`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-green-200 bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4" /> Конкурентный лист (Excel)
        </a>
      )}
      {reports.history && (
        <a
          href={reports.history}
          download={`${code}_история_подачи.xlsx`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4" /> История подачи (Excel)
        </a>
      )}
    </div>
  );
}
