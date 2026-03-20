'use client';

import type { Party } from '../types/invoice.types';

interface PartyCardProps {
  title: string;
  party: Party | null;
}

export default function PartyCard({ title, party }: PartyCardProps) {
  if (!party) return null;

  const fields = [
    { label: 'Название', value: party.name },
    { label: 'Адрес', value: party.address },
    { label: 'ИНН', value: party.inn },
    { label: 'Рег. код НДС', value: party.vat_registration },
    { label: 'Статус НДС', value: party.vat_status },
    { label: 'Р/С', value: party.bank_account },
    { label: 'МФО', value: party.mfo },
    { label: 'Руководитель', value: party.director },
    { label: 'Гл. бухгалтер', value: party.accountant },
  ].filter(f => f.value);

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">{title}</h4>
      <dl className="space-y-1.5">
        {fields.map(({ label, value }) => (
          <div key={label} className="flex gap-2">
            <dt className="text-xs text-gray-500 w-28 flex-shrink-0">{label}:</dt>
            <dd className="text-xs text-gray-900 break-all">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
