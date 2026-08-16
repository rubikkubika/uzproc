'use client';

import { createPortal } from 'react-dom';
import { Copy, X } from 'lucide-react';
import { copyToClipboard } from '@/utils/clipboard';
import type { ApprovalCommentPopoverData } from '../hooks/useApprovalCommentPopover';

interface ApprovalCommentPopoverProps {
  data: ApprovalCommentPopoverData | null;
  onClose: () => void;
}

/** Попап с текстом замечания согласования. Рендерится в портале, чтобы не обрезался карточкой. */
export default function ApprovalCommentPopover({ data, onClose }: ApprovalCommentPopoverProps) {
  if (!data || typeof document === 'undefined') return null;

  return createPortal(
    <div
      data-comment-popover-portal
      className="fixed z-[100] min-w-[200px] max-w-[360px] rounded-lg border border-gray-200 bg-white shadow-lg p-2"
      style={{ left: data.left, top: data.top - 8, transform: 'translateY(-100%)' }}
    >
      <div className="flex items-start gap-1">
        <div className="flex-1 min-w-0 max-h-[50vh] overflow-y-auto">
          <p className="text-[11px] text-gray-900 break-words whitespace-pre-wrap">{data.commentText}</p>
        </div>
        <button type="button" onClick={onClose} className="p-0.5 rounded hover:bg-gray-200 flex-shrink-0" aria-label="Закрыть">
          <X className="w-3 h-3 text-gray-500" />
        </button>
      </div>
      <button
        type="button"
        onClick={() => { copyToClipboard(data.commentText); }}
        className="mt-1.5 w-full flex items-center justify-center gap-1 py-1 px-2 text-[10px] font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded border border-gray-200"
      >
        <Copy className="w-3 h-3" />
        Копировать
      </button>
    </div>,
    document.body,
  );
}
