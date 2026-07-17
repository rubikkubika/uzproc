'use client';

import { ETP_STATUS_STYLES } from '../constants/etp.constants';

interface Props {
  status: string;
  className?: string;
}

export default function EtpStatusBadge({ status, className = '' }: Props) {
  const style = ETP_STATUS_STYLES[status] || 'bg-gray-100 text-gray-600 border-gray-200';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${style} ${className}`}
    >
      {status}
    </span>
  );
}
