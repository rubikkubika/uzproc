'use client';

import { Download } from 'lucide-react';
import { EtpFile } from '../types/etp.types';
import { fileIcon, formatDateTime } from '../utils/etp.utils';

interface Props {
  files: EtpFile[];
}

export default function EtpDetailFiles({ files }: Props) {
  if (!files.length) return <div className="text-sm text-gray-500">Документов нет</div>;
  return (
    <ul className="space-y-1.5">
      {files.map((f) => (
        <li key={f.fileGuid}>
          <a
            href={f.path}
            download={f.name}
            className="flex items-center gap-3 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
          >
            <span className="text-lg flex-shrink-0">{fileIcon(f.ext)}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-gray-900 truncate">{f.name}</span>
              <span className="block text-xs text-gray-500">
                {f.sizeFormatted}
                {f.uploaded ? ` · ${formatDateTime(f.uploaded)}` : ''}
                {f.uploadedBy ? ` · ${f.uploadedBy}` : ''}
              </span>
            </span>
            <Download className="w-4 h-4 text-gray-400 group-hover:text-blue-600 flex-shrink-0" />
          </a>
        </li>
      ))}
    </ul>
  );
}
