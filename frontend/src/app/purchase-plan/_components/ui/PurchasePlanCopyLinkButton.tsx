'use client';

import React from 'react';
import { Check, Link2 } from 'lucide-react';

interface PurchasePlanCopyLinkButtonProps {
  /** Ссылка только что скопирована — показываем зелёную галочку */
  copied: boolean;
  title: string;
  onCopy: () => void;
}

/**
 * Кнопка копирования ссылки. Клик не всплывает: строка сводной по ЦФО по клику фильтрует таблицу.
 */
export default function PurchasePlanCopyLinkButton({ copied, title, onCopy }: PurchasePlanCopyLinkButtonProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onCopy();
      }}
      title={copied ? 'Ссылка скопирована' : title}
      className="flex items-center justify-center rounded p-0.5 hover:bg-gray-200 transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Link2 className="w-3.5 h-3.5 text-gray-500" />}
    </button>
  );
}
