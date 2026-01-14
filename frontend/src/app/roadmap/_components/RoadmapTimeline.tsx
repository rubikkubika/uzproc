'use client';

import { useState } from 'react';
import { Plus, X, Trash2 } from 'lucide-react';

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
    status?: 'completed' | 'in-progress' | 'planned';
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
        description: 'Создание, редактирование и отслеживание заявок на закупку',
        status: 'completed'
      },
      {
        id: 2,
        title: 'Система согласований',
        description: 'Многоуровневая система согласований с ролевым доступом',
        status: 'completed'
      },
      {
        id: 3,
        title: 'Управление закупками',
        description: 'Отслеживание статусов закупок и управление договорами',
        status: 'completed'
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
        description: 'Визуализация данных по закупкам, заявкам и согласованиям',
        status: 'completed'
      },
      {
        id: 5,
        title: 'Отчеты и экспорт',
        description: 'Генерация отчетов в различных форматах',
        status: 'completed'
      }
    ]
  }
];

export default function RoadmapTimeline() {
  const [data, setData] = useState<TimelineItem[]>(timelineData);
  const [addingMilestoneFor, setAddingMilestoneFor] = useState<number | null>(null);
  const [newMilestone, setNewMilestone] = useState<{ description: string }>({ description: '' });
  const [addingMajorAfter, setAddingMajorAfter] = useState<number | null>(null);
  const [newMajor, setNewMajor] = useState<{ title: string; description: string; status: 'completed' | 'in-progress' | 'planned' }>({ title: '', description: '', status: 'planned' });

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

  const updateMajorStatus = (itemId: number, newStatus: 'completed' | 'in-progress' | 'planned') => {
    setData(prev => prev.map(item => 
      item.id === itemId ? { ...item, status: newStatus } : item
    ));
  };

  const updateMilestoneStatus = (itemId: number, milestoneId: number, newStatus: 'completed' | 'in-progress' | 'planned') => {
    setData(prev => prev.map(item => 
      item.id === itemId 
        ? { 
            ...item, 
            milestones: item.milestones?.map(m => 
              m.id === milestoneId ? { ...m, status: newStatus } : m
            )
          }
        : item
    ));
  };

  const handleAddMilestone = (itemId: number) => {
    setAddingMilestoneFor(itemId);
    setNewMilestone({ description: '' });
  };

  const handleSaveMilestone = (itemId: number) => {
    if (!newMilestone.description.trim()) {
      return;
    }

    setData(prev => {
      // Находим максимальный ID среди всех милстоунов во всех вехах
      const allMilestones = prev.flatMap(item => item.milestones || []);
      const maxId = allMilestones.length > 0 
        ? Math.max(...allMilestones.map(m => m.id))
        : 0;
      
      return prev.map(item => {
        if (item.id === itemId) {
          const existingMilestones = item.milestones || [];
          
          return {
            ...item,
            milestones: [
              ...existingMilestones,
              {
                id: maxId + 1,
                title: '',
                description: newMilestone.description.trim(),
                status: 'planned'
              }
            ]
          };
        }
        return item;
      });
    });

    setAddingMilestoneFor(null);
    setNewMilestone({ description: '' });
  };

  const handleCancelAddMilestone = () => {
    setAddingMilestoneFor(null);
    setNewMilestone({ description: '' });
  };

  const handleDeleteMilestone = (itemId: number, milestoneId: number) => {
    setData(prev => prev.map(item => 
      item.id === itemId 
        ? { 
            ...item, 
            milestones: item.milestones?.filter(m => m.id !== milestoneId) || []
          }
        : item
    ));
  };

  const handleAddMajor = (afterItemId: number) => {
    setAddingMajorAfter(afterItemId);
    setNewMajor({ title: '', description: '', status: 'planned' });
  };

  const handleSaveMajor = (afterItemId: number) => {
    if (!newMajor.title.trim() || !newMajor.description.trim()) {
      return;
    }

    setData(prev => {
      const maxId = prev.length > 0 ? Math.max(...prev.map(item => item.id)) : 0;
      const newItem: TimelineItem = {
        id: maxId + 1,
        date: '',
        title: newMajor.title.trim(),
        description: newMajor.description.trim(),
        isMajor: true,
        status: newMajor.status,
        milestones: []
      };

      const afterIndex = prev.findIndex(item => item.id === afterItemId);
      if (afterIndex === -1) {
        return [...prev, newItem];
      }

      const newData = [...prev];
      newData.splice(afterIndex + 1, 0, newItem);
      return newData;
    });

    setAddingMajorAfter(null);
    setNewMajor({ title: '', description: '', status: 'planned' });
  };

  const handleCancelAddMajor = () => {
    setAddingMajorAfter(null);
    setNewMajor({ title: '', description: '', status: 'planned' });
  };

  const handleDeleteMajor = (itemId: number) => {
    setData(prev => prev.filter(item => item.id !== itemId));
  };

  // Преобразуем данные в плоский список элементов таймлайна
  const timelineItems = data.flatMap((item) => {
    const items: Array<{
      type: 'major' | 'milestone' | 'add-milestone-form' | 'add-major-form';
      data: TimelineItem | { id: number; title: string; description: string; status?: 'completed' | 'in-progress' | 'planned'; parentItem: TimelineItem } | TimelineItem;
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
    
    // Добавляем форму добавления милстоуна, если она открыта для этой вехи
    if (addingMilestoneFor === item.id) {
      items.push({ type: 'add-milestone-form', data: item });
    }
    
    // Добавляем форму добавления новой вехи, если она открыта после этой вехи
    if (addingMajorAfter === item.id) {
      items.push({ type: 'add-major-form', data: item });
    }
    
    return items;
  });

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Roadmap</h1>
      
      <div className="relative pb-8 min-h-[400px]">
        {/* Вертикальная линия */}
        <div className="absolute left-8 top-0 bottom-8 w-0.5 bg-gray-300 z-0"></div>
        
        {/* Элементы таймлайна */}
        <div className="space-y-4 relative z-10">
          {timelineItems && timelineItems.length > 0 ? timelineItems.map((timelineItem, index) => {
            if (timelineItem.type === 'major') {
              const item = timelineItem.data as TimelineItem;
              return (
                <div key={`major-${item.id}`} className="relative">
                  <div className="flex items-start gap-3 lg:gap-4 pl-4">
                    {/* Большая точка для основных этапов */}
                    <div className="relative z-10 flex-shrink-0 -ml-4 w-12 lg:w-16">
                      {/* Кнопка добавления новой вехи слева от круга */}
                      <button
                        onClick={() => handleAddMajor(item.id)}
                        className="absolute -left-6 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex items-center justify-center z-20"
                        title="Добавить веху"
                      >
                        <Plus size={14} />
                      </button>
                      <div
                        className={`w-10 h-10 lg:w-12 lg:h-12 rounded-full ${getStatusColor(item.status)} flex items-center justify-center shadow-lg border-2 border-white`}
                      >
                        <div className="w-5 h-5 lg:w-6 lg:h-6 rounded-full bg-white"></div>
                      </div>
                    </div>
                    
                    {/* Блок с описанием */}
                    <div className="flex-1 max-w-[780px] bg-white rounded-lg shadow-md p-3 lg:p-4 hover:shadow-lg transition-all min-w-0 relative">
                      {/* Кнопка удаления вехи справа вверху */}
                      <button
                        onClick={() => handleDeleteMajor(item.id)}
                        className="absolute top-2 right-2 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex items-center justify-center z-10"
                        title="Удалить веху"
                      >
                        <X size={14} />
                      </button>
                      <div className="flex items-start justify-between gap-3 mb-1 pr-8">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base lg:text-lg font-bold text-gray-900 mb-0.5">{item.title}</h3>
                          <p className="text-gray-600 leading-relaxed text-xs lg:text-sm">{item.description}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <select
                            value={item.status}
                            onChange={(e) => updateMajorStatus(item.id, e.target.value as 'completed' | 'in-progress' | 'planned')}
                            className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(item.status)} border-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8`}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'right 0.5rem center',
                              backgroundSize: '1.5em 1.5em',
                              paddingRight: '2rem'
                            }}
                          >
                            <option value="completed">Завершено</option>
                            <option value="in-progress">В работе</option>
                            <option value="planned">Запланировано</option>
                          </select>
                        </div>
                      </div>
                      {/* Кнопка добавления милстоуна внизу вехи */}
                      <button
                        onClick={() => handleAddMilestone(item.id)}
                        className="w-full mt-2 py-1.5 px-3 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-100 border border-gray-300 transition-colors flex items-center justify-center gap-2"
                        title="Добавить милстоун"
                      >
                        <Plus size={14} />
                        <span className="text-xs">Добавить милстоун</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            } else if (timelineItem.type === 'milestone') {
              // Мелкая точка для милстоуна
              const milestone = timelineItem.data as { id: number; title: string; description: string; status?: 'completed' | 'in-progress' | 'planned'; parentItem: TimelineItem };
              const milestoneStatus = milestone.status || 'planned';
              return (
                <div key={`milestone-${milestone.parentItem.id}-${milestone.id}`} className="relative">
                  <div className="flex items-start gap-3 lg:gap-4 pl-4">
                    {/* Левая часть: пустое пространство для выравнивания с основными вехами */}
                    <div className="relative z-10 flex-shrink-0 w-12 lg:w-16 flex items-center justify-end -ml-4">
                      {/* Мелкая точка справа от линии */}
                      <div
                        className={`w-3 h-3 lg:w-4 lg:h-4 rounded-full ${getStatusColor(milestoneStatus)} shadow-md border-2 border-white ml-2`}
                        title={milestone.title}
                      ></div>
                    </div>
                    
                    {/* Блок с описанием милстоуна - начинается там же, где основные вехи */}
                    <div className="flex-1 max-w-[780px] bg-gray-50 rounded-lg shadow-sm p-2 lg:p-3 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-xs text-gray-600 flex-1 min-w-0">{milestone.description}</p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <select
                            value={milestoneStatus}
                            onChange={(e) => updateMilestoneStatus(milestone.parentItem.id, milestone.id, e.target.value as 'completed' | 'in-progress' | 'planned')}
                            className={`px-2 py-0.5 rounded-full text-xs font-medium text-white ${getStatusColor(milestoneStatus)} border-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-6`}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'right 0.25rem center',
                              backgroundSize: '1em 1em',
                              paddingRight: '1.5rem'
                            }}
                          >
                            <option value="completed">Завершено</option>
                            <option value="in-progress">В работе</option>
                            <option value="planned">Запланировано</option>
                          </select>
                          <button
                            onClick={() => handleDeleteMilestone(milestone.parentItem.id, milestone.id)}
                            className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex items-center justify-center"
                            title="Удалить милстоун"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            } else if (timelineItem.type === 'add-milestone-form') {
              // Форма добавления милстоуна
              const item = timelineItem.data as TimelineItem;
              return (
                <div key={`add-milestone-${item.id}`} className="relative">
                  <div className="flex items-start gap-3 lg:gap-4 pl-4">
                    {/* Левая часть: пустое пространство для выравнивания */}
                    <div className="relative z-10 flex-shrink-0 w-12 lg:w-16 flex items-center justify-end -ml-4">
                      {/* Плейсхолдер для точки */}
                      <div className="w-3 h-3 lg:w-4 lg:h-4 rounded-full bg-gray-300 shadow-md border-2 border-white ml-2"></div>
                    </div>
                    
                    {/* Форма добавления милстоуна */}
                    <div className="flex-1 max-w-[780px] bg-blue-50 rounded-lg shadow-sm p-3 lg:p-4 min-w-0 border-2 border-blue-300">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-blue-700">Новый милстоун</span>
                        <button
                          onClick={handleCancelAddMilestone}
                          className="p-1 rounded-full hover:bg-blue-200 transition-colors"
                          title="Отмена"
                        >
                          <X size={14} className="text-blue-700" />
                        </button>
                      </div>
                      <textarea
                        placeholder="Описание милстоуна"
                        value={newMilestone.description}
                        onChange={(e) => setNewMilestone(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full mb-2 px-2 py-1.5 text-xs border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 resize-none"
                        rows={2}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => handleSaveMilestone(item.id)}
                          disabled={!newMilestone.description.trim()}
                          className="px-3 py-1 text-xs font-medium text-white bg-blue-500 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Сохранить
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            } else if (timelineItem.type === 'add-major-form') {
              // Форма добавления новой вехи
              const afterItem = timelineItem.data as TimelineItem;
              return (
                <div key={`add-major-${afterItem.id}`} className="relative">
                  <div className="flex items-start gap-3 lg:gap-4 pl-4">
                    {/* Левая часть: пустое пространство для выравнивания */}
                    <div className="relative z-10 flex-shrink-0 w-12 lg:w-16 -ml-4"></div>
                    {/* Большая точка для новой вехи (плейсхолдер) */}
                    <div className="relative z-10 flex-shrink-0 w-12 lg:w-16">
                      <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-gray-300 flex items-center justify-center shadow-lg border-2 border-white">
                        <div className="w-5 h-5 lg:w-6 lg:h-6 rounded-full bg-white"></div>
                      </div>
                    </div>
                    
                    {/* Форма добавления новой вехи */}
                    <div className="flex-1 max-w-[780px] bg-blue-50 rounded-lg shadow-sm p-3 lg:p-4 min-w-0 border-2 border-blue-300">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-blue-700">Новая веха</span>
                        <button
                          onClick={handleCancelAddMajor}
                          className="p-1 rounded-full hover:bg-blue-200 transition-colors"
                          title="Отмена"
                        >
                          <X size={14} className="text-blue-700" />
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Название вехи"
                        value={newMajor.title}
                        onChange={(e) => setNewMajor(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full mb-2 px-2 py-1.5 text-xs border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <textarea
                        placeholder="Описание вехи"
                        value={newMajor.description}
                        onChange={(e) => setNewMajor(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full mb-2 px-2 py-1.5 text-xs border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 resize-none"
                        rows={2}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex items-center justify-between gap-2">
                        <select
                          value={newMajor.status}
                          onChange={(e) => setNewMajor(prev => ({ ...prev, status: e.target.value as 'completed' | 'in-progress' | 'planned' }))}
                          className={`px-2 py-0.5 rounded-full text-xs font-medium text-white ${getStatusColor(newMajor.status)} border-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-6`}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 0.25rem center',
                            backgroundSize: '1em 1em',
                            paddingRight: '1.5rem'
                          }}
                        >
                          <option value="completed">Завершено</option>
                          <option value="in-progress">В работе</option>
                          <option value="planned">Запланировано</option>
                        </select>
                        <button
                          onClick={() => handleSaveMajor(afterItem.id)}
                          disabled={!newMajor.title.trim() || !newMajor.description.trim()}
                          className="px-3 py-1 text-xs font-medium text-white bg-blue-500 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Сохранить
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          }) : (
            <div className="text-center py-8 text-gray-500">
              Нет данных для отображения
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
