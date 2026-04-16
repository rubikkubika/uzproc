'use client';

import { useRouter } from 'next/navigation';
import TrainingPublicPage from './_components/TrainingPublicPage';

export default function TrainingPublicRoute() {
  const router = useRouter();

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Шапка — аналогично публичному плану закупок */}
      <header className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <img
              src="/images/logo-small.svg"
              alt="uzProc Logo"
              className="w-8 h-8"
            />
            <h1 className="text-xl font-bold text-black">uzProc</h1>
          </button>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900 ml-2">Курс по процессу закупок</h2>
          </div>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-md">Публичный просмотр</span>
        </div>
      </header>

      {/* Контент */}
      <div className="flex-1 overflow-hidden p-6">
        <TrainingPublicPage />
      </div>
    </div>
  );
}
