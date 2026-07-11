'use client';

import { useTrackerLogin } from '../hooks/useTrackerLogin';

/**
 * Блок входа для гостя на странице трекера: кнопка «Войти», по клику
 * раскрывается форма логина/пароля прямо в левой колонке.
 */
export default function PurchaseTrackerLoginForm() {
  const { open, toggle, email, setEmail, password, setPassword, error, loading, submit } = useTrackerLogin();

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl bg-white px-4 py-3.5"
      style={{ border: '1.5px solid #DFE3EB', boxShadow: '0 1px 2px rgba(16,24,40,.05)' }}
    >
      <div className="text-[13px] leading-snug text-[#667085]">
        Залогиньтесь, чтобы увидеть свои закупки
      </div>

      {!open ? (
        <button
          type="button"
          onClick={toggle}
          className="cursor-pointer rounded-xl px-3 py-2.5 text-center text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#7C3AED,#6D28D9)' }}
        >
          Войти
        </button>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-2.5">
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            placeholder="Email или логин"
            className="w-full rounded-lg border border-[#DFE3EB] bg-white px-3 py-2 text-[13.5px] text-[#101828] outline-none placeholder:text-[#98A2B3] focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Пароль"
            className="w-full rounded-lg border border-[#DFE3EB] bg-white px-3 py-2 text-[13.5px] text-[#101828] outline-none placeholder:text-[#98A2B3] focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]"
          />

          {error && <div className="text-[12px] text-[#B42318]">{error}</div>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 cursor-pointer rounded-xl px-3 py-2.5 text-center text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#7C3AED,#6D28D9)' }}
            >
              {loading ? 'Вход…' : 'Войти'}
            </button>
            <button
              type="button"
              onClick={toggle}
              disabled={loading}
              className="cursor-pointer rounded-xl border border-[#DFE3EB] bg-white px-3 py-2.5 text-center text-[14px] font-medium text-[#475467] transition-colors hover:bg-[#F4F5F9]"
            >
              Отмена
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
