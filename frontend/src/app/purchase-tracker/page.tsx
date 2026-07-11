'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AppShell from '../_components/AppShell';
import PurchaseTracker from './_components/PurchaseTracker';

export default function PurchaseTrackerRoute() {
  const router = useRouter();
  const { userRole, userEmail, loading } = useAuth();
  const authenticated = !loading && !!(userRole || userEmail);

  return (
    <AppShell activeTab="purchase-tracker">
      <div className="flex min-h-full flex-col" style={{ background: '#F4F5F9' }}>
        {/* Шапка. У залогиненных логотип уже есть в сайдбаре — показываем только заголовок */}
        <header className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex items-center gap-3">
            {!authenticated && (
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
              >
                <img src="/images/logo-small.svg" alt="uzProc Logo" className="w-8 h-8" />
                <h1 className="text-xl font-bold text-black">uzProc</h1>
              </button>
            )}
            <div className="flex-1">
              <h2 className={`text-lg font-semibold text-gray-900 ${authenticated ? '' : 'ml-2'}`}>Статус закупок</h2>
            </div>
          </div>
        </header>

        {/* Контент */}
        <div className="flex-1 py-2">
          <PurchaseTracker />
        </div>
      </div>
    </AppShell>
  );
}
