'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../_components/Sidebar';

interface TimelineItem {
  id: number;
  date: string;
  title: string;
  description: string;
  isMajor: boolean;
  status: 'completed' | 'in-progress' | 'planned';
  milestones?: Array<{
    id: number;
    title: string;
    description: string;
  }>;
}

const timelineData: TimelineItem[] = [
  {
    id: 1,
    date: 'Q1 2024',
    title: 'Запуск базовой функциональности',
    description: 'Реализованы основные модули системы управления закупками: создание заявок, согласование, управление закупками.',
    isMajor: true,
    status: 'completed',
    milestones: [
      {
        id: 1,
        title: 'Модуль заявок на закупку',
        description: 'Создание, редактирование и отслеживание заявок на закупку'
      },
      {
        id: 2,
        title: 'Система согласований',
        description: 'Многоуровневая система согласований с ролевым доступом'
      },
      {
        id: 3,
        title: 'Управление закупками',
        description: 'Отслеживание статусов закупок и управление договорами'
      }
    ]
  },
  {
    id: 2,
    date: 'Q2 2024',
    title: 'Аналитика и отчетность',
    description: 'Добавлены дашборды с аналитикой, графики и отчеты для принятия решений.',
    isMajor: true,
    status: 'completed',
    milestones: [
      {
        id: 4,
        title: 'Дашборды аналитики',
        description: 'Визуализация данных по закупкам, заявкам и согласованиям'
      },
      {
        id: 5,
        title: 'Отчеты и экспорт',
        description: 'Генерация отчетов в различных форматах'
      }
    ]
  },
  {
    id: 3,
    date: 'Q3 2024',
    title: 'Интеграции и автоматизация',
    description: 'Интеграция с внешними системами и автоматизация рутинных процессов.',
    isMajor: true,
    status: 'in-progress',
    milestones: [
      {
        id: 6,
        title: 'API интеграции',
        description: 'REST API для интеграции с другими системами'
      },
      {
        id: 7,
        title: 'Автоматические уведомления',
        description: 'Email и Telegram уведомления о важных событиях'
      },
      {
        id: 8,
        title: 'Импорт данных из Excel',
        description: 'Автоматический импорт заявок и закупок из Excel файлов'
      }
    ]
  },
  {
    id: 4,
    date: 'Q4 2024',
    title: 'Мобильное приложение',
    description: 'Разработка мобильного приложения для iOS и Android для удобного доступа к системе.',
    isMajor: true,
    status: 'planned',
    milestones: [
      {
        id: 9,
        title: 'iOS приложение',
        description: 'Нативное приложение для iPhone и iPad'
      },
      {
        id: 10,
        title: 'Android приложение',
        description: 'Нативное приложение для устройств Android'
      }
    ]
  },
  {
    id: 5,
    date: 'Q1 2025',
    title: 'Искусственный интеллект',
    description: 'Внедрение AI для прогнозирования, оптимизации и автоматизации принятия решений.',
    isMajor: true,
    status: 'planned',
    milestones: [
      {
        id: 11,
        title: 'Прогнозирование спроса',
        description: 'AI-модели для прогнозирования потребностей в закупках'
      },
      {
        id: 12,
        title: 'Оптимизация процессов',
        description: 'Автоматические рекомендации по оптимизации закупочных процессов'
      }
    ]
  }
];

export default function RoadmapPage() {
  const [activeTab, setActiveTab] = useState('roadmap');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved === 'true') {
      setIsSidebarCollapsed(true);
    }
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in-progress':
        return 'bg-blue-500';
      case 'planned':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Завершено';
      case 'in-progress':
        return 'В работе';
      case 'planned':
        return 'Запланировано';
      default:
        return 'Неизвестно';
    }
  };

  // Преобразуем данные в плоский список элементов таймлайна
  const timelineItems = timelineData.flatMap((item) => {
    const items: Array<{
      type: 'major' | 'milestone';
      data: TimelineItem | { id: number; title: string; description: string; parentItem: TimelineItem };
    }> = [];
    
    // Добавляем большой этап
    items.push({ type: 'major', data: item });
    
    // Добавляем милстоуны после большого этапа
    if (item.milestones && item.milestones.length > 0) {
      item.milestones.forEach((milestone) => {
        items.push({ 
          type: 'milestone', 
          data: { ...milestone, parentItem: item } 
        });
      });
    }
    
    return items;
  });

  if (!isMounted) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-full max-w-[1920px] mx-auto flex">
        <div suppressHydrationWarning>
          <Sidebar 
            activeTab={activeTab} 
            onTabChange={setActiveTab}
            isMobileMenuOpen={isMobileMenuOpen}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
            isCollapsed={isSidebarCollapsed}
            setIsCollapsed={setIsSidebarCollapsed}
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
          <div className="w-10"></div>
        </div>

        <main className="flex-1 overflow-y-auto p-2 sm:p-3 lg:p-4 pt-16 sm:pt-20 lg:pt-4 min-h-0">
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 lg:p-8 min-h-full">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Roadmap</h1>
            
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Таймлайн */}
              <div className="flex-1 min-w-0">
                <div className="relative pb-8 min-h-[400px]">
                  {/* Вертикальная линия */}
                  <div className="absolute left-8 top-0 bottom-8 w-0.5 bg-gray-300 z-0"></div>
                  
                  {/* Элементы таймлайна */}
                  <div className="space-y-8 relative z-10 pl-4">
                    {timelineItems && timelineItems.length > 0 ? timelineItems.map((timelineItem, index) => {
                      if (timelineItem.type === 'major') {
                        const item = timelineItem.data as TimelineItem;
                        return (
                          <div key={`major-${item.id}`} className="relative">
                            <div className="flex items-start gap-4 lg:gap-8">
                              {/* Большая точка для основных этапов */}
                              <div className="relative z-10 flex-shrink-0">
                                <div
                                  className={`w-12 h-12 lg:w-16 lg:h-16 rounded-full ${getStatusColor(item.status)} flex items-center justify-center shadow-lg border-4 border-white`}
                                >
                                  <div className="w-6 h-6 lg:w-8 lg:h-8 rounded-full bg-white"></div>
                                </div>
                              </div>
                              
                              {/* Блок с описанием */}
                              <div className="flex-1 bg-white rounded-lg shadow-md p-4 lg:p-6 hover:shadow-lg transition-all min-w-0">
                                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                                  <span className="text-sm font-semibold text-gray-500">{item.date}</span>
                                  <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(item.status)}`}>
                                    {getStatusText(item.status)}
                                  </span>
                                </div>
                                <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                                <p className="text-gray-600 leading-relaxed text-sm lg:text-base">{item.description}</p>
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        // Мелкая точка для милстоуна
                        const milestone = timelineItem.data as { id: number; title: string; description: string; parentItem: TimelineItem };
                        return (
                          <div key={`milestone-${milestone.id}`} className="relative">
                            <div className="flex items-start gap-4 lg:gap-8">
                              {/* Мелкая точка для милстоуна */}
                              <div className="relative z-10 flex-shrink-0">
                                <div
                                  className="w-3 h-3 lg:w-4 lg:h-4 rounded-full bg-gray-400 shadow-md border-2 border-white"
                                  title={milestone.title}
                                ></div>
                              </div>
                              
                              {/* Блок с описанием милстоуна */}
                              <div className="flex-1 bg-gray-50 rounded-lg shadow-sm p-3 lg:p-4 min-w-0">
                                <h4 className="text-sm font-medium text-gray-900 mb-1">{milestone.title}</h4>
                                <p className="text-xs text-gray-600">{milestone.description}</p>
                              </div>
                            </div>
                          </div>
                        );
                      }
                    }) : (
                      <div className="text-center py-8 text-gray-500">
                        Нет данных для отображения
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
