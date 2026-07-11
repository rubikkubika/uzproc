import type { ReactNode } from 'react';
import { StarIcon, UserIcon } from './icons';
import PurchaseTrackerLoginForm from './PurchaseTrackerLoginForm';

/** Вкладки левого блока трекера */
export type TrackerTab = 'mine' | 'favorites';

interface PurchaseTrackerSidebarProps {
  /** Email/логин текущего пользователя (null — не авторизован) */
  email: string | null;
  /** Полное имя «Имя Фамилия» (null — не найдено) */
  fullName?: string | null;
  /** Роль пользователя (admin, user и т.п.) */
  role: string | null;
  /** Идёт проверка авторизации */
  loading: boolean;
  /** Активная вкладка */
  activeTab: TrackerTab;
  /** Смена вкладки */
  onTabChange: (tab: TrackerTab) => void;
  /** Контент под вкладками (например, карточки избранного) */
  children?: ReactNode;
}

const TABS: { key: TrackerTab; label: string; icon: (active: boolean) => ReactNode }[] = [
  { key: 'mine', label: 'Мои', icon: (active) => <UserIcon color={active ? '#6D28D9' : '#667085'} /> },
  { key: 'favorites', label: 'Избранное', icon: (active) => <StarIcon color={active ? '#6D28D9' : '#667085'} fill={active ? '#6D28D9' : 'none'} /> },
];

/**
 * Левый блок трекера закупок: информация о логине (на уровне строки поиска)
 * и вкладки «Мои» / «Избранное» под ней.
 */
export default function PurchaseTrackerSidebar({ email, fullName, role, loading, activeTab, onTabChange, children }: PurchaseTrackerSidebarProps) {
  const hasName = !!fullName && fullName.trim() !== '';
  // Основная строка — имя и фамилия (если есть), иначе email/«Гость»
  const displayName = hasName ? (fullName as string) : email ?? 'Гость';
  const initial = (hasName ? (fullName as string) : email ?? 'Г').trim().charAt(0).toUpperCase();
  const isGuest = !loading && !email;

  return (
    <div className="flex w-[340px] flex-none flex-col gap-2.5 pt-6">
      {/* Информация о логине — на уровне строки поиска */}
      <div
        className="flex items-center gap-3 rounded-2xl bg-white px-[16px] py-[11px]"
        style={{ border: '1.5px solid #DFE3EB', boxShadow: '0 1px 2px rgba(16,24,40,.05)' }}
      >
        <div
          className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-[14px] font-semibold text-white"
          style={{ background: 'linear-gradient(135deg,#7C3AED,#6D28D9)' }}
        >
          {loading ? '' : initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-semibold text-[#101828]" title={displayName}>
            {loading ? 'Загрузка…' : displayName}
          </div>
          {!loading && hasName && email && (
            <div className="truncate text-[12px] text-[#667085]" title={email}>{email}</div>
          )}
          {!loading && role && (
            <div className="truncate text-[12px] text-[#98A2B3]">{role === 'admin' ? 'Администратор' : 'Пользователь'}</div>
          )}
        </div>
      </div>

      {isGuest ? (
        /* Просмотр без логина — форма входа прямо на трекере */
        <PurchaseTrackerLoginForm />
      ) : (
        /* Вкладки «Мои» / «Избранное» — на одном уровне */
        <div
          className="flex gap-1 rounded-2xl bg-white p-1.5"
          style={{ border: '1.5px solid #DFE3EB', boxShadow: '0 1px 2px rgba(16,24,40,.05)' }}
        >
          {TABS.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onTabChange(tab.key)}
                className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-none px-3 py-2.5 text-center text-[14px] font-medium transition-colors ${
                  active ? 'bg-[#F2EEFC] text-[#6D28D9]' : 'bg-transparent text-[#475467] hover:bg-[#F4F5F9]'
                }`}
              >
                {tab.icon(active)}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Контент под вкладками (карточки избранного) */}
      {children}
    </div>
  );
}
