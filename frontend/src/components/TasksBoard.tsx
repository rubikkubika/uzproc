'use client';

import React, { useState, useMemo } from 'react';
import { X, Plus, Edit2, Trash2, Calendar, User, Tag } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignee: string;
  dueDate: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

const INITIAL_TASKS: Task[] = [
  {
    id: '1',
    title: 'Согласовать договор с поставщиком',
    description: 'Необходимо согласовать условия договора с ООО "Поставщик+" по закупке упаковочных материалов',
    status: 'todo',
    priority: 'high',
    assignee: 'Иванов И.И.',
    dueDate: '2024-12-30',
    tags: ['Договор', 'Срочно'],
    createdAt: '2024-12-25T10:00:00',
    updatedAt: '2024-12-25T10:00:00',
  },
  {
    id: '2',
    title: 'Проверить спецификацию товара',
    description: 'Проверить соответствие спецификации товара требованиям заявки',
    status: 'in-progress',
    priority: 'medium',
    assignee: 'Петров А.С.',
    dueDate: '2024-12-28',
    tags: ['Проверка'],
    createdAt: '2024-12-24T14:00:00',
    updatedAt: '2024-12-25T09:00:00',
  },
  {
    id: '3',
    title: 'Подготовить отчет по закупкам',
    description: 'Сформировать ежемесячный отчет по закупкам за декабрь',
    status: 'done',
    priority: 'low',
    assignee: 'Сидоров В.В.',
    dueDate: '2024-12-27',
    tags: ['Отчет'],
    createdAt: '2024-12-23T08:00:00',
    updatedAt: '2024-12-26T16:00:00',
  },
];

const STATUS_CONFIG = {
  todo: { label: 'К выполнению', color: 'bg-gray-100', textColor: 'text-gray-700', borderColor: 'border-gray-300' },
  'in-progress': { label: 'В работе', color: 'bg-blue-100', textColor: 'text-blue-700', borderColor: 'border-blue-300' },
  done: { label: 'Готово', color: 'bg-green-100', textColor: 'text-green-700', borderColor: 'border-green-300' },
};

const PRIORITY_CONFIG = {
  low: { label: 'Низкий', color: 'bg-gray-200 text-gray-700' },
  medium: { label: 'Средний', color: 'bg-yellow-200 text-yellow-700' },
  high: { label: 'Высокий', color: 'bg-red-200 text-red-700' },
};

export default function TasksBoard() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  const tasksByStatus = useMemo(() => {
    return {
      todo: tasks.filter(t => t.status === 'todo'),
      'in-progress': tasks.filter(t => t.status === 'in-progress'),
      done: tasks.filter(t => t.status === 'done'),
    };
  }, [tasks]);

  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, newStatus: Task['status']) => {
    e.preventDefault();
    if (draggedTask && draggedTask.status !== newStatus) {
      setTasks(prev => prev.map(task =>
        task.id === draggedTask.id ? { ...task, status: newStatus, updatedAt: new Date().toISOString() } : task
      ));
      if (selectedTask?.id === draggedTask.id) {
        setSelectedTask({ ...draggedTask, status: newStatus, updatedAt: new Date().toISOString() });
      }
    }
    setDraggedTask(null);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  const handleCloseDetails = () => {
    setSelectedTask(null);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Не указано';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Канбан-доска */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-4 h-full min-w-max">
          {Object.entries(STATUS_CONFIG).map(([status, config]) => (
            <div
              key={status}
              className="flex-shrink-0 w-80 flex flex-col"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, status as Task['status'])}
            >
              <div className={`${config.color} ${config.borderColor} border-2 rounded-t-lg p-3`}>
                <div className="flex items-center justify-between">
                  <h3 className={`font-semibold text-sm ${config.textColor}`}>
                    {config.label}
                  </h3>
                  <span className={`${config.textColor} text-xs font-medium bg-white/50 px-2 py-1 rounded`}>
                    {tasksByStatus[status as keyof typeof tasksByStatus].length}
                  </span>
                </div>
              </div>
              <div className="flex-1 bg-gray-100 rounded-b-lg p-2 space-y-2 overflow-y-auto min-h-[200px]">
                {tasksByStatus[status as keyof typeof tasksByStatus].map(task => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => handleDragStart(task)}
                    onClick={() => handleTaskClick(task)}
                    className={`bg-white rounded-lg p-3 shadow-sm cursor-move hover:shadow-md transition-shadow ${
                      selectedTask?.id === task.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-sm text-gray-900 flex-1">{task.title}</h4>
                      <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_CONFIG[task.priority].color}`}>
                        {PRIORITY_CONFIG[task.priority].label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2 mb-2">{task.description}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>{task.assignee}</span>
                      </div>
                      {task.dueDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(task.dueDate)}</span>
                        </div>
                      )}
                    </div>
                    {task.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {task.tags.map(tag => (
                          <span key={tag} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <button
                  className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors flex items-center justify-center gap-1"
                  onClick={() => {
                    // TODO: Добавить создание новой задачи
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Добавить задачу
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Таблица задач */}
      <div className="border-t border-gray-200 bg-white">
        <div className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Все задачи</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Название</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Приоритет</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Исполнитель</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Срок</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Теги</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => (
                  <tr
                    key={task.id}
                    onClick={() => handleTaskClick(task)}
                    className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                      selectedTask?.id === task.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-sm text-gray-900">{task.title}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_CONFIG[task.status].color} ${STATUS_CONFIG[task.status].textColor}`}>
                        {STATUS_CONFIG[task.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${PRIORITY_CONFIG[task.priority].color}`}>
                        {PRIORITY_CONFIG[task.priority].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{task.assignee}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(task.dueDate)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {task.tags.map(tag => (
                          <span key={tag} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Панель просмотра задачи справа */}
      {selectedTask && (
        <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Детали задачи</h2>
            <button
              onClick={handleCloseDetails}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Название</label>
              <h3 className="mt-1 text-lg font-semibold text-gray-900">{selectedTask.title}</h3>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Описание</label>
              <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{selectedTask.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Статус</label>
                <div className="mt-1">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_CONFIG[selectedTask.status].color} ${STATUS_CONFIG[selectedTask.status].textColor}`}>
                    {STATUS_CONFIG[selectedTask.status].label}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Приоритет</label>
                <div className="mt-1">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${PRIORITY_CONFIG[selectedTask.priority].color}`}>
                    {PRIORITY_CONFIG[selectedTask.priority].label}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
                <User className="w-3 h-3" />
                Исполнитель
              </label>
              <p className="mt-1 text-sm text-gray-900">{selectedTask.assignee}</p>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Срок выполнения
              </label>
              <p className="mt-1 text-sm text-gray-900">{formatDate(selectedTask.dueDate)}</p>
            </div>

            {selectedTask.tags.length > 0 && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  Теги
                </label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {selectedTask.tags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-gray-200">
              <label className="text-xs font-medium text-gray-500 uppercase">Дата создания</label>
              <p className="mt-1 text-sm text-gray-600">{formatDate(selectedTask.createdAt)}</p>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Последнее обновление</label>
              <p className="mt-1 text-sm text-gray-600">{formatDate(selectedTask.updatedAt)}</p>
            </div>

            <div className="pt-4 border-t border-gray-200 flex gap-2">
              <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                <Edit2 className="w-4 h-4" />
                Редактировать
              </button>
              <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

