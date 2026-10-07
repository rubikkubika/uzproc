import type { CsiInvitationPreview } from '@/utils/sending-center.api';

interface CsiInvitationPreviewCardProps {
  preview: CsiInvitationPreview;
}

/** Пример письма «Оценка закупки»: тема, копия по умолчанию и текст по последней заявке с договорами. */
export default function CsiInvitationPreviewCard({ preview }: CsiInvitationPreviewCardProps) {
  if (!preview.text) {
    return <p className="text-sm text-gray-500">Нет заявок с подписанными договорами — пример письма не из чего собрать.</p>;
  }

  return (
    <div className="space-y-2">
      <dl className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-[220px_1fr]">
        <dt className="text-gray-500">Пример по заявке</dt>
        <dd className="text-gray-900">
          № {preview.sampleRequestNumber} · подписанных договоров: {preview.contractCount}
        </dd>
        <dt className="text-gray-500">Тема письма</dt>
        <dd className="text-gray-900">{preview.subject}</dd>
        <dt className="text-gray-500">Копия по умолчанию</dt>
        <dd className="text-gray-900">
          закупщик заявки{preview.defaultCc.length > 0 ? `, ${preview.defaultCc.join(', ')}` : ''}
        </dd>
      </dl>
      <pre className="whitespace-pre-wrap break-words text-xs text-gray-900 bg-gray-50 border border-gray-200 rounded-lg p-3 font-sans">
        {preview.text}
      </pre>
    </div>
  );
}
