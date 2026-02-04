'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginPageContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fromPublicPlan, setFromPublicPlan] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Проверяем, пришел ли пользователь с публичного плана закупок
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const referrer = document.referrer;
      const fromPublic = referrer.includes('/public-plan') || searchParams.get('from') === 'public-plan';
      
      if (fromPublic) {
        setFromPublicPlan(true);
        // Проверяем, был ли введен пароль ранее
        const lastPassword = sessionStorage.getItem('lastPasswordAttempt');
        if (!lastPassword) {
          // Если пароль не был введен ранее, показываем предупреждение
          setError('Для доступа к системе необходимо ввести пароль');
        }
      }
      
      // Загружаем сохраненный email
      const lastEmail = localStorage.getItem('lastEmail');
      if (lastEmail) {
        setEmail(lastEmail);
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Сохраняем email в localStorage для предзаполнения
        localStorage.setItem('lastEmail', email);
        // Сохраняем факт ввода пароля в sessionStorage
        if (password) {
          sessionStorage.setItem('lastPasswordAttempt', 'true');
        }
        // Полная перезагрузка страницы, чтобы AuthContext подхватил cookies (в т.ч. user-role)
        // и отобразились права администратора
        window.location.href = '/';
        return;
      } else {
        setError(data.error || 'Ошибка входа');
      }
    } catch (err) {
      setError('Произошла ошибка при входе');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
              <svg width="40" height="40" viewBox="0 0 41 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <path d="M40.5 19.9533C40.5085 23.9079 39.3417 27.7853 37.1538 31.0794C34.966 34.3735 31.8429 36.947 28.1879 38.4654C24.533 39.9837 20.509 40.3869 16.631 39.6235C12.7443 38.86 9.17513 36.9556 6.37812 34.1591C3.57252 31.3625 1.66781 27.8025 0.887049 23.9165C0.114868 20.0391 0.500959 16.0159 2.01958 12.3529C3.52963 8.69854 6.09498 5.56745 9.38962 3.37139C12.6671 1.17534 16.5366 0.00010549 20.4919 0.00010549C23.1173 -0.00847285 25.717 0.506228 28.1365 1.50989C30.5646 2.51356 32.7696 3.98046 34.6228 5.83338C36.4846 7.6863 37.9518 9.89093 38.9642 12.31C39.9766 14.7291 40.4914 17.3284 40.5 19.9533ZM22.7913 6.9314C22.0448 6.86278 21.2726 6.82846 20.4919 6.82846C19.7111 6.82846 18.9561 6.8542 18.2097 6.9314V17.5685H22.7998L22.7913 6.9314ZM33.3701 13.125C31.6971 12.576 29.9897 12.147 28.2566 11.8382V20.7683C28.2566 27.202 25.5196 30.5819 20.4919 30.5819C15.4641 30.5819 12.7272 27.202 12.7272 20.7683V11.8468C10.994 12.1556 9.28667 12.5845 7.61361 13.1335V20.8283C7.72514 24.1653 9.13223 27.3393 11.5346 29.664C13.9369 31.9887 17.1458 33.2841 20.4919 33.2841C23.838 33.2841 27.0468 31.9887 29.4492 29.664C31.8515 27.3393 33.2586 24.1739 33.3701 20.8283V13.125Z" fill="#7000FF"/>
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">UzProc</h1>
          </div>
          <p className="text-gray-600">Система управления закупками</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900 placeholder-gray-500"
              placeholder="Введите email или admin"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Пароль
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                // Сохраняем факт ввода пароля
                if (e.target.value) {
                  sessionStorage.setItem('lastPasswordAttempt', 'true');
                  // Очищаем ошибку, если пароль начал вводиться
                  if (fromPublicPlan && error === 'Для доступа к системе необходимо ввести пароль') {
                    setError('');
                  }
                }
              }}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900 placeholder-gray-500"
              placeholder="Введите пароль"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Загрузка...</p>
          </div>
        </div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}

