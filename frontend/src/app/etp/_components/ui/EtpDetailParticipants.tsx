'use client';

import { Download, Paperclip } from 'lucide-react';
import { EtpParticipant } from '../types/etp.types';
import { ETP_PARTICIPANT_STATUS_STYLES } from '../constants/etp.constants';
import { fileIcon } from '../utils/etp.utils';

interface Props {
  participants: EtpParticipant[];
}

export default function EtpDetailParticipants({ participants }: Props) {
  if (!participants.length) return <div className="text-sm text-gray-500">Участников нет</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border border-gray-200">
        <thead>
          <tr className="text-left text-xs text-gray-500 bg-gray-50 border-b border-gray-200">
            <th className="px-2 py-1.5">Компания</th>
            <th className="px-2 py-1.5 whitespace-nowrap">ИНН</th>
            <th className="px-2 py-1.5">Контакты</th>
            <th className="px-2 py-1.5">Статус</th>
            <th className="px-2 py-1.5">Файлы КП</th>
          </tr>
        </thead>
        <tbody>
          {participants.map((p, i) => {
            const style = ETP_PARTICIPANT_STATUS_STYLES[p.statusRu] || 'bg-gray-100 text-gray-600';
            return (
              <tr key={i} className="border-b border-gray-100 align-top">
                <td className="px-2 py-1.5 text-gray-900">
                  <div className="font-medium">{p.shortName || p.company}</div>
                  <div className="text-xs text-gray-500">{p.company}</div>
                  {p.address && <div className="text-xs text-gray-400 mt-0.5">{p.address}</div>}
                </td>
                <td className="px-2 py-1.5 text-gray-700 whitespace-nowrap font-mono">{p.inn}</td>
                <td className="px-2 py-1.5 text-gray-700">
                  {p.contactName && <div>{p.contactName}</div>}
                  {p.email && (
                    <a href={`mailto:${p.email}`} className="text-blue-600 hover:underline block">
                      {p.email}
                    </a>
                  )}
                  {p.phone && <div className="text-xs text-gray-500">{p.phone}</div>}
                </td>
                <td className="px-2 py-1.5">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>
                    {p.statusRu}
                  </span>
                </td>
                <td className="px-2 py-1.5">
                  {p.files.length === 0 ? (
                    <span className="text-xs text-gray-400">—</span>
                  ) : (
                    <ul className="space-y-1">
                      {p.files.map((f) => (
                        <li key={f.fileGuid}>
                          <a
                            href={f.path}
                            download={f.name}
                            title={`${f.name} · ${f.sizeFormatted}`}
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline max-w-[220px]"
                          >
                            <span>{fileIcon(f.ext)}</span>
                            <span className="truncate">{f.name}</span>
                            <Download className="w-3 h-3 flex-shrink-0" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-1.5 text-xs text-gray-400 flex items-center gap-1">
        <Paperclip className="w-3 h-3" /> Файлы КП — коммерческие предложения, загруженные участниками
      </p>
    </div>
  );
}
