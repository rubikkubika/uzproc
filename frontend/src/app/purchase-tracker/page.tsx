'use client';

import { useRouter } from 'next/navigation';
import PurchaseTracker from './_components/PurchaseTracker';

export default function PurchaseTrackerRoute() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col" style={{ background: '#F4F5F9' }}>
      {/* Шапка — аналогично публичному плану закупок */}
      <header className="flex-shrink-0 border-b border-[#ECEEF3] bg-white px-8 py-[18px]">
        <div className="mx-auto flex max-w-[960px] items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="flex flex-none cursor-pointer items-center transition-opacity hover:opacity-80"
            title="На главную"
          >
            <img src="/images/logo-small.svg" alt="uzProc Logo" className="h-8 w-8" />
          </button>
          <div className="flex flex-col">
            <div className="text-[16px] font-bold text-[#101828]">uzProc · Статус закупок</div>
            <div className="text-[12.5px] text-[#667085]">Проверьте, на каком этапе ваша заявка</div>
          </div>
          <span className="ml-auto rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-400">Публичный просмотр</span>
        </div>
      </header>

      {/* Контент */}
      <div className="flex-1 py-2">
        <PurchaseTracker />
      </div>
    </div>
  );
}
