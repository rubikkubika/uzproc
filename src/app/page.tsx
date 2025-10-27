'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import MonthlyPurchasesChart from '@/components/MonthlyPurchasesChart';
import CategoryChart from '@/components/CategoryChart';
import SupplierChart from '@/components/SupplierChart';
import RevenueChart from '@/components/RevenueChart';
import BudgetChart from '@/components/BudgetChart';
import PerformanceChart from '@/components/PerformanceChart';
import PurchasesTable from '@/components/PurchasesTable';
import PurchasesStats from '@/components/PurchasesStats';
import PurchasesByStatusChart from '@/components/PurchasesByStatusChart';
import PurchasesByFormatChart from '@/components/PurchasesByFormatChart';
import PurchasesAmountChart from '@/components/PurchasesAmountChart';
import PurchasesTimelineChart from '@/components/PurchasesTimelineChart';
import PurchasesStatus from '@/components/PurchasesStatus';
import ApprovalTimeChart from '@/components/ApprovalTimeChart';
import TopLongestPurchases from '@/components/TopLongestPurchases';
import PurchaserWorkload from '@/components/PurchaserWorkload';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);

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
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-3 sm:space-y-4 lg:space-y-6">
            {/* Статистические карточки */}
            <PurchasesStats />

            {/* Диаграммы */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3 lg:gap-6">
              <div className="lg:col-span-1">
                <PurchasesByStatusChart />
              </div>
              <div className="lg:col-span-1">
                <PurchasesByFormatChart />
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3 lg:gap-6">
              <div className="lg:col-span-1">
                <PurchasesAmountChart />
              </div>
              <div className="lg:col-span-1">
                <PurchasesTimelineChart />
              </div>
            </div>
            
            {/* Анализ времени согласования */}
            <div className="space-y-4">
              <ApprovalTimeChart />
              <TopLongestPurchases />
            </div>
          </div>
        );
      
      case 'purchases':
        return (
          <div className="space-y-3 sm:space-y-4 lg:space-y-6">
            <PurchasesTable />
              </div>
        );

      case 'workload':
        return (
          <div className="space-y-3 sm:space-y-4 lg:space-y-6">
            <PurchaserWorkload />
          </div>
        );
      
      case 'suppliers':
        return (
          <div className="space-y-6">
            <SupplierChart />
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
      
      case 'settings':
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <p className="text-gray-500">Настройки будут добавлены в следующих версиях</p>
            </div>
          </div>
        );

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
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Аналитика закупщика</h1>
              <p className="text-gray-600">Детальная аналитика для закупщика</p>
            </div>
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
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Обзор инициатора</h1>
              <p className="text-gray-600">Рабочее место инициатора закупок</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MonthlyPurchasesChart />
              <CategoryChart />
            </div>
          </div>
        );

      case 'initiator-requests':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Мои запросы</h1>
              <p className="text-gray-600">Управление запросами на закупку</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <p className="text-gray-500">Список запросов будет добавлен в следующих версиях</p>
            </div>
          </div>
        );

      case 'initiator-status':
        return <PurchasesStatus />;

      case 'initiator-history':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">История</h1>
              <p className="text-gray-600">История заявок инициатора</p>
            </div>
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
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Добро пожаловать</h1>
              <p className="text-gray-600">Выберите раздел в меню для начала работы</p>
            </div>
          </div>
        );
    }
  };

        return (
          <div className="flex h-screen bg-gray-100">
            <div className="w-full max-w-[1920px] mx-auto flex">
              <Sidebar 
                activeTab={activeTab} 
                onTabChange={setActiveTab}
                isMobileMenuOpen={isMobileMenuOpen}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
              />
              
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
              </div>

              <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-8 pt-16 sm:pt-20 lg:pt-8">
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