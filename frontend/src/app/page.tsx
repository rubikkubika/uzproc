'use client';

import { useState, useEffect, useLayoutEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from './_components/Sidebar';
import MonthlyPurchasesChart from './analytics/_components/MonthlyPurchasesChart';
import CategoryChart from './analytics/_components/CategoryChart';
import SupplierChart from './suppliers/_components/SupplierChart';
import RevenueChart from './analytics/_components/RevenueChart';
import BudgetChart from './analytics/_components/BudgetChart';
import PerformanceChart from './analytics/_components/PerformanceChart';
import PurchaserWorkload from './workload/_components/PurchaserWorkload';
import PurchaseRequestsTable from './purchase-requests/_components/PurchaseRequestsTable';
import PurchasesTable from './purchases/_components/PurchasesTable';
import PurchasePlanItemsTable from './purchase-plan/_components/PurchasePlanItemsTable';
import ContractsTable from './contracts/_components/ContractsTable';
import PaymentsTable from './payments/_components/PaymentsTable';
import SpecificationsTable from './specifications/_components/SpecificationsTable';
import DeliveryPlan from './delivery-plan/_components/DeliveryPlan';
import SuppliersTable from './suppliers/_components/SuppliersTable';
import UploadCSV from './upload/_components/UploadCSV';
import { getBackendUrl } from '@/utils/api';
import Presentation from './presentation/_components/Presentation';
import TasksBoard from './tasks/_components/TasksBoard';
import UsersTable from './users/_components/UsersTable';
import CSIForm from './csi/_components/CSIForm';
import RoadmapTimeline from './roadmap/_components/RoadmapTimeline';
import Overview from './overview/_components/Overview';

// Компонент для тестирования отправки почты
function TestEmailForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSendTestEmail = async () => {
    if (!email || !email.trim()) {
      setMessage({ type: 'error', text: 'Введите email адрес' });
      return;
    }

    // Простая валидация email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setMessage({ type: 'error', text: 'Некорректный формат email адреса' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Используем getBackendUrl() как в других компонентах
      const backendUrl = getBackendUrl();
      const url = `${backendUrl}/api/email/test`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: data.message || 'Тестовое сообщение успешно отправлено!' });
        setEmail('');
      } else {
        setMessage({ type: 'error', text: data.error || 'Ошибка при отправке письма' });
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      setMessage({ type: 'error', text: 'Ошибка при отправке письма. Проверьте настройки сервера.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="test-email" className="block text-sm font-medium text-gray-700 mb-2">
          Email адрес для тестирования
        </label>
        <div className="flex gap-2">
          <input
            id="test-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@uzumteam.uz"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            disabled={loading}
          />
          <button
            onClick={handleSendTestEmail}
            disabled={loading || !email.trim()}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Отправка...' : 'Отправить тест'}
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}

const SIDEBAR_COLLAPSED_KEY = 'sidebarCollapsed';
const ACTIVE_TAB_KEY = 'activeTab';

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [hasInitialTabRestored, setHasInitialTabRestored] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  // Начальное состояние всегда false для совместимости с SSR
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  // Используем глобальный контекст аутентификации вместо отдельных запросов
  const { userEmail, userRole } = useAuth();
  
  // Получаем email из localStorage или из контекста
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  
  // Синхронизируем currentUser с localStorage и контекстом
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('lastEmail');
      if (savedEmail) {
        setCurrentUser(savedEmail);
      } else if (userEmail) {
        setCurrentUser(userEmail);
      }
    }
  }, [userEmail]);

  // Загружаем состояние сайдбара из localStorage
  useLayoutEffect(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      const shouldBeCollapsed = saved === 'true';
      if (shouldBeCollapsed) {
        setIsSidebarCollapsed(true);
        document.documentElement.classList.add('sidebar-collapsed');
        document.documentElement.style.setProperty('--sidebar-width', '5rem');
      } else {
        document.documentElement.style.setProperty('--sidebar-width', '16rem');
      }
    } catch (err) {
      // Игнорируем ошибки
    }
    setIsMounted(true);
  }, []);

  // Загружаем активную вкладку из URL или localStorage после монтирования.
  // До восстановления вкладки не рендерим контент (Overview/План закупок и т.д.), чтобы не дергать запросы плана на вкладке «Договоры».
  // При переходе по ссылке (например из сайдбара) searchParams может обновиться с задержкой — дублируем чтение из window.location, чтобы вкладка открылась с первого клика.
  useEffect(() => {
    if (!isMounted) return;
    try {
      let tabFromUrl = searchParams.get('tab');
      if (!tabFromUrl && typeof window !== 'undefined' && window.location.pathname === '/') {
        tabFromUrl = new URLSearchParams(window.location.search).get('tab');
      }
      if (tabFromUrl) {
        setActiveTab(tabFromUrl);
        localStorage.setItem(ACTIVE_TAB_KEY, tabFromUrl);
      } else {
        const savedTab = localStorage.getItem(ACTIVE_TAB_KEY);
        if (savedTab) {
          setActiveTab(savedTab);
          router.replace(`/?tab=${savedTab}`, { scroll: false });
        }
      }
    } catch (err) {
      // Игнорируем ошибки
    } finally {
      setHasInitialTabRestored(true);
    }
  }, [isMounted, searchParams, router]);

  // Авто-сворачивание сайдбара на малых экранах (< 1280px) если нет явной пользовательской настройки
  useEffect(() => {
    const XL_BREAKPOINT = 1280;
    const applyAutoCollapse = () => {
      const savedPref = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      // Авто-коллапс только если пользователь не сохранял предпочтение
      if (savedPref !== null) return;
      const shouldCollapse = window.innerWidth >= 1024 && window.innerWidth < XL_BREAKPOINT;
      setIsSidebarCollapsed(shouldCollapse);
      if (shouldCollapse) {
        document.documentElement.classList.add('sidebar-collapsed');
        document.documentElement.style.setProperty('--sidebar-width', '5rem');
      } else {
        document.documentElement.classList.remove('sidebar-collapsed');
        document.documentElement.style.setProperty('--sidebar-width', '16rem');
      }
    };
    applyAutoCollapse();
    window.addEventListener('resize', applyAutoCollapse);
    return () => window.removeEventListener('resize', applyAutoCollapse);
  }, []);

  // Информация о пользователе теперь загружается через глобальный контекст AuthProvider
  // Не нужно делать отдельные запросы

  // Сохраняем состояние сайдбара в localStorage при изменении
  const handleSidebarCollapse = (collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed);
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
      // Синхронизируем класс и CSS переменную с состоянием
      if (collapsed) {
        document.documentElement.classList.add('sidebar-collapsed');
        document.documentElement.style.setProperty('--sidebar-width', '5rem');
      } else {
        document.documentElement.classList.remove('sidebar-collapsed');
        document.documentElement.style.setProperty('--sidebar-width', '16rem');
      }
    } catch (err) {
      console.error('Error saving sidebar state:', err);
    }
  };

  // Обработчик изменения вкладки с сохранением в localStorage и обновлением URL
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    try {
      localStorage.setItem(ACTIVE_TAB_KEY, tab);
      // Обновляем URL с query параметром
      router.push(`/?tab=${tab}`, { scroll: false });
    } catch (err) {
      console.error('Error saving active tab:', err);
    }
  };

  // Прокрутка наверх при смене вкладки
  useEffect(() => {
    // Для мобильных устройств используем более надежный метод
    if (window.innerWidth <= 768) {
      // Мгновенная прокрутка для мобильных
      window.scrollTo(0, 0);
      // Дополнительно прокручиваем основной контейнер
      const mainElement = document.querySelector('main');
      if (mainElement) {
        mainElement.scrollTop = 0;
      }
    } else {
      // Плавная прокрутка для десктопа
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeTab]);

  const renderContent = () => {
    if (!hasInitialTabRestored) {
      return (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      );
    }
    switch (activeTab) {
      case 'overview':
        return <Overview />;

      case 'workload':
        return (
          <div className="space-y-3 sm:space-y-4 lg:space-y-6">
            <PurchaserWorkload />
          </div>
        );
      
      case 'analytics':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MonthlyPurchasesChart />
              <CategoryChart />
            </div>
          </div>
        );
      
      case 'trends':
        return (
          <div className="space-y-6">
            <SupplierChart />
          </div>
        );
      
      case 'calendar':
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <p className="text-gray-500">Календарь будет добавлен в следующих версиях</p>
            </div>
          </div>
        );
      
      case 'test':
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Тест отправки почты</h2>
              
              <p className="text-sm text-gray-600 mb-6">
                Отправьте тестовое сообщение для проверки настроек почтового сервера
              </p>
              
              <TestEmailForm />

              {/* Настройки почтового сервера */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Настройки почтового сервера</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">IMAP/POP3 сервер:</span>
                    <span className="font-medium">mail.uzumteam.uz</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">SMTP сервер:</span>
                    <span className="font-medium">mail.uzumteam.uz</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Порт IMAP:</span>
                    <span className="font-medium">993</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Порт SMTP:</span>
                    <span className="font-medium">587</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Шифрование IMAP:</span>
                    <span className="font-medium">SSL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Шифрование SMTP:</span>
                    <span className="font-medium">TLS</span>
                  </div>
                  <div className="flex justify-between mt-3 pt-3 border-t border-gray-300">
                    <span className="text-gray-600">Логин:</span>
                    <span className="font-medium">uzproc@uzumteam.uz</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <p className="text-gray-500">Настройки будут добавлены в следующих версиях</p>
            </div>
          </div>
        );

      // Backend разделы
      case 'purchase-requests':
        return (
          <div className="h-full flex flex-col">
            <PurchaseRequestsTable />
          </div>
        );

      case 'purchases':
        if (userRole !== 'admin') {
          return (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-600">Доступ к разделу «Закупки» только для администратора.</p>
              </div>
            </div>
          );
        }
        return (
          <div className="space-y-6 h-full flex flex-col">
            <PurchasesTable />
          </div>
        );

      case 'purchase-plan':
        return (
          <div className="space-y-6 h-full flex flex-col">
            <PurchasePlanItemsTable />
          </div>
        );

      case 'contracts':
        return (
          <div className="space-y-6 h-full flex flex-col">
            <ContractsTable />
          </div>
        );

      case 'payments':
        return (
          <div className="space-y-6 h-full flex flex-col">
            <PaymentsTable />
          </div>
        );

      case 'specifications':
        if (userRole !== 'admin') {
          return (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-600">Доступ к разделу «Спецификации» только для администратора.</p>
              </div>
            </div>
          );
        }
        return (
          <div className="space-y-6">
            <SpecificationsTable />
          </div>
        );

      case 'delivery-plan':
        return <DeliveryPlan />;

      case 'suppliers':
        return (
          <div className="space-y-6 h-full flex flex-col">
            <SuppliersTable />
          </div>
        );
      
      case 'tasks':
        return (
          <div className="space-y-6 h-[calc(100vh-8rem)]">
            <TasksBoard />
          </div>
        );
      
      case 'presentation':
        return <Presentation />;

      case 'users':
        return (
          <div className="space-y-6 h-full flex flex-col">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Пользователи</h1>
            </div>
            <div className="flex-1 min-h-0">
              <UsersTable />
            </div>
          </div>
        );

      case 'csi':
        return (
          <div className="space-y-6">
            <CSIForm />
          </div>
        );

      case 'roadmap':
        return (
          <div className="space-y-6">
            <RoadmapTimeline />
          </div>
        );

      case 'upload':
        return <UploadCSV />;

      // Разделы для закупщика
      case 'purchaser-overview':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MonthlyPurchasesChart />
              <CategoryChart />
            </div>
          </div>
        );

      case 'purchaser-orders':
        return (
          <div className="space-y-3 sm:space-y-4 lg:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3 lg:gap-6">
              <div className="lg:col-span-1">
                <MonthlyPurchasesChart />
              </div>
              <div className="lg:col-span-1">
                <CategoryChart />
              </div>
            </div>
            <SupplierChart />
          </div>
        );

      case 'purchaser-suppliers':
        return (
          <div className="space-y-3 sm:space-y-4 lg:space-y-6">
            <SupplierChart />
          </div>
        );

      case 'purchaser-analytics':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MonthlyPurchasesChart />
              <CategoryChart />
            </div>
            <SupplierChart />
          </div>
        );

      // Разделы для инициатора
      case 'initiator-overview':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MonthlyPurchasesChart />
              <CategoryChart />
            </div>
          </div>
        );

      case 'initiator-requests':
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <p className="text-gray-500">Список запросов будет добавлен в следующих версиях</p>
            </div>
          </div>
        );

      case 'initiator-status':
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <p className="text-gray-500">Статус закупок будет добавлен в следующих версиях</p>
            </div>
          </div>
        );

      case 'initiator-history':
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <p className="text-gray-500">История будет добавлена в следующих версиях</p>
            </div>
          </div>
        );

      case 'create-purchase':
        return (
          <div className="space-y-3 sm:space-y-4 lg:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3 lg:gap-6">
              <div className="lg:col-span-1">
                <MonthlyPurchasesChart />
              </div>
              <div className="lg:col-span-1">
                <CategoryChart />
              </div>
            </div>
            <SupplierChart />
          </div>
        );
      
      default:
        return (
          <div className="space-y-6">
          </div>
        );
    }
  };

        return (
          <div className="flex h-screen overflow-hidden bg-gray-100">
            <div className="w-full max-w-[1920px] mx-auto flex flex-1 min-h-0 full-width-on-large-screens" style={{ gap: 0 }}>
              <div suppressHydrationWarning style={{ flexShrink: 0, margin: 0, padding: 0 }}>
                <Sidebar 
                  activeTab={activeTab} 
                  onTabChange={handleTabChange}
                  isMobileMenuOpen={isMobileMenuOpen}
                  setIsMobileMenuOpen={setIsMobileMenuOpen}
                  isCollapsed={isSidebarCollapsed}
                  setIsCollapsed={handleSidebarCollapse}
                />
              </div>
              
              {/* Top panel for mobile */}
              <div className="lg:hidden fixed top-0 left-0 right-0 z-[60] bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <div className="flex items-center">
                  <img 
                    src="/images/logo-small.svg" 
                    alt="Logo" 
                    className="w-8 h-8 mr-2"
                  />
                  <span className="text-lg font-bold text-black">uzProc</span>
                </div>
                {isMounted && currentUser && (
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                      {currentUser.charAt(0).toUpperCase()}
                    </div>
                  </div>
                )}
              </div>

              <main className="flex-1 flex flex-col min-h-0 overflow-y-auto p-1 pt-16 sm:pt-20 lg:pt-1 safari-main-content relative" style={{ marginLeft: 0, flexShrink: 1, minWidth: 0 }}>
                {renderContent()}
              </main>
            </div>

            {/* Модальное окно Telegram */}
            {isTelegramModalOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6">
                    {/* Заголовок */}
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Отправка в Telegram</h3>
                      <button
                        onClick={() => setIsTelegramModalOpen(false)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    {/* Инструкция */}
                    <div className="mb-6">
                      <h4 className="font-medium text-gray-900 mb-3">Инструкция по отправке:</h4>
                      <div className="space-y-3 text-sm text-gray-600">
                        <div className="flex items-start space-x-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">1</span>
                          <p>Найти бота <a 
                            href="https://t.me/uzProcBot" 
            target="_blank"
            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline font-medium"
                          >@uzProcBot</a> и написать ему</p>
                        </div>
                        <div className="flex items-start space-x-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">2</span>
                          <p>Нажать отправить в Telegram, отправится последнему написавшему</p>
                        </div>
                      </div>
                    </div>

                    {/* Предварительный просмотр сообщения */}
                    <div className="mb-6">
                      <h4 className="font-medium text-gray-900 mb-3">Предварительный просмотр:</h4>
                      <div className="bg-gray-50 p-4 rounded-lg text-sm">
                        <div className="space-y-2 text-gray-900">
                          <p><strong>📦 Заявка #2024-001</strong></p>
                          <p><strong>🛍️ Товар:</strong> Коробы упаковочные</p>
                          <p><strong>📏 Размеры:</strong> 40×30×20 см</p>
                          <p><strong>📦 Количество:</strong> 500 шт</p>
                          <p><strong>💰 Цена за штуку:</strong> ₽250</p>
                          <p><strong>💵 Общая сумма:</strong> ₽125,000</p>
                          <p><strong>📅 Срок поставки:</strong> 7 рабочих дней</p>
                          <p><strong>👤 Инициатор:</strong> Петров А.С.</p>
                          <p><strong>🏢 Поставщик:</strong> ООО "Упаковка+"</p>
                          <p><strong>👨‍💼 Ответственный:</strong> Иванов И.И.</p>
                          <p><strong>📊 Статус:</strong> В обработке</p>
                          <p><strong>⏳ Текущий этап:</strong> Согласование</p>
                        </div>
                      </div>
                    </div>

                    {/* Кнопка отправки */}
                    <button 
                      onClick={async () => {
                        const message = `📦 Заявка #2024-001\n\n🛍️ Товар: Коробы упаковочные\n📏 Размеры: 40×30×20 см\n📦 Количество: 500 шт\n💰 Цена за штуку: ₽250\n💵 Общая сумма: ₽125,000\n📅 Срок поставки: 7 рабочих дней\n\n👤 Инициатор: Петров А.С.\n🏢 Поставщик: ООО "Упаковка+"\n👨‍💼 Ответственный: Иванов И.И.\n\n📊 Статус: В обработке\n⏳ Текущий этап: Согласование\n\n🔗 Подробнее: uzProc Dashboard`;
                        
                        try {
                          const response = await fetch('/api/send-telegram', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              message: message
                            }),
                          });
                          
                          if (response.ok) {
                            alert('Сообщение успешно отправлено!');
                          } else {
                            alert('Ошибка при отправке сообщения');
                          }
                        } catch (error) {
                          console.error('Ошибка:', error);
                          alert('Ошибка при отправке сообщения');
                        }
                        
                        setIsTelegramModalOpen(false);
                      }}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                      </svg>
                      <span>Отправить в Telegram</span>
                    </button>
                  </div>
                </div>
        </div>
            )}
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="flex h-screen bg-gray-100 items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-500">Загрузка...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}