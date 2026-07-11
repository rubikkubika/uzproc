import { useCallback, useState } from 'react';

interface UseTrackerLoginResult {
  /** Открыта ли форма ввода логина/пароля */
  open: boolean;
  /** Показать/скрыть форму */
  toggle: () => void;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  error: string;
  loading: boolean;
  submit: (e: React.FormEvent) => void;
}

/**
 * Логин прямо со страницы трекера (без ухода на /login).
 * После успешного входа перезагружает страницу трекера, чтобы AuthContext
 * подхватил cookies (роль/email) и открылись «Мои» закупки.
 */
export function useTrackerLogin(): UseTrackerLoginResult {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const toggle = useCallback(() => setOpen((v) => !v), []);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setLoading(true);
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await response.json();

        if (response.ok) {
          localStorage.setItem('lastEmail', email);
          if (password) sessionStorage.setItem('lastPasswordAttempt', 'true');
          // Временный пароль — на страницу смены пароля
          if (data.passwordChangeRequired) {
            sessionStorage.setItem('changePasswordEmail', email);
            sessionStorage.setItem('changePasswordCurrent', password);
            window.location.href = '/change-password';
            return;
          }
          // Остаёмся на трекере, но перезагружаем для подхвата cookies
          window.location.href = '/purchase-tracker';
          return;
        }
        setError(data.error || 'Ошибка входа');
      } catch {
        setError('Произошла ошибка при входе');
      } finally {
        setLoading(false);
      }
    },
    [email, password],
  );

  return { open, toggle, email, setEmail, password, setPassword, error, loading, submit };
}
