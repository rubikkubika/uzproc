'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getBackendUrl } from '@/utils/api';
import { ArrowUp, ArrowDown, ArrowUpDown, Search, Edit, X } from 'lucide-react';

interface User {
  id: number;
  username: string;
  email: string | null;
  password: string | null;
  surname: string | null;
  name: string | null;
  department: string | null;
  position: string | null;
  role: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PageResponse {
  content: User[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

type SortField = keyof User | null;
type SortDirection = 'asc' | 'desc' | null;

export default function UsersTable() {
  const [data, setData] = useState<PageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  
  // Состояние для сортировки
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Состояние для фильтров (используются для запросов)
  const [filters, setFilters] = useState<Record<string, string>>({
    username: '',
    email: '',
    surname: '',
    name: '',
    department: '',
    position: '',
  });

  // Локальное состояние для текстовых фильтров (для debounce)
  const [localFilters, setLocalFilters] = useState<Record<string, string>>({
    username: '',
    email: '',
    surname: '',
    name: '',
    department: '',
    position: '',
  });

  // Состояние для отслеживания поля с фокусом
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Состояние для модального окна редактирования
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState('user');
  const [updating, setUpdating] = useState(false);

  // Состояние для модального окна создания пользователя
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newSurname, setNewSurname] = useState('');
  const [newName, setNewName] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [creating, setCreating] = useState(false);

  // Состояние для ширин колонок
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    id: 80,
    username: 150,
    email: 200,
    password: 150,
    role: 120,
    surname: 150,
    name: 150,
    department: 200,
    position: 200,
    createdAt: 150,
    updatedAt: 150,
  });

  const getColumnWidth = (columnKey: string) => {
    return columnWidths[columnKey] || 150;
  };

  // Порядок колонок
  const columnOrder = ['id', 'username', 'email', 'password', 'role', 'surname', 'name', 'department', 'position', 'createdAt', 'updatedAt'];

  // Функция форматирования даты
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '-';
    }
  };

  // Функция для получения уникальных значений для фильтров
  const [uniqueValues, setUniqueValues] = useState<Record<string, string[]>>({
    username: [],
    email: [],
    surname: [],
    name: [],
    department: [],
    position: [],
  });

  // Загрузка данных
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('page', String(currentPage));
      params.append('size', String(pageSize));

      // Добавляем сортировку
      if (sortField) {
        params.append('sort', `${sortField},${sortDirection || 'asc'}`);
      }

      // Добавляем фильтры
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value.trim() !== '') {
          params.append(key, value.trim());
        }
      });

      const response = await fetch(`${getBackendUrl()}/api/users?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Ошибка загрузки данных');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, sortField, sortDirection, filters]);

  // Загрузка уникальных значений для фильтров
  const fetchUniqueValues = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.append('page', '0');
      params.append('size', '10000'); // Большой размер для получения всех значений

      const response = await fetch(`${getBackendUrl()}/api/users?${params.toString()}`);
      if (!response.ok) return;

      const result = await response.json();
      const values: Record<string, Set<string>> = {
        username: new Set(),
        email: new Set(),
        surname: new Set(),
        name: new Set(),
        department: new Set(),
        position: new Set(),
      };

      result.content.forEach((user: User) => {
        if (user.username) values.username.add(user.username);
        if (user.email) values.email.add(user.email);
        if (user.surname) values.surname.add(user.surname);
        if (user.name) values.name.add(user.name);
        if (user.department) values.department.add(user.department);
        if (user.position) values.position.add(user.position);
      });

      setUniqueValues({
        username: Array.from(values.username).sort(),
        email: Array.from(values.email).sort(),
        surname: Array.from(values.surname).sort(),
        name: Array.from(values.name).sort(),
        department: Array.from(values.department).sort(),
        position: Array.from(values.position).sort(),
      });
    } catch (err) {
      console.error('Error fetching unique values:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchUniqueValues();
  }, [fetchUniqueValues]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : sortDirection === 'desc' ? null : 'asc');
      if (sortDirection === 'desc') {
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(0);
  };

  const handleFilterChange = (field: string, value: string, isTextFilter: boolean = false) => {
    if (isTextFilter) {
      // Для текстовых фильтров обновляем только локальное состояние
      setLocalFilters(prev => ({
        ...prev,
        [field]: value,
      }));
      // Не сбрасываем страницу сразу для текстовых фильтров (сделаем это через debounce)
    } else {
      // Для select фильтров обновляем оба состояния сразу
      setFilters(prev => ({
        ...prev,
        [field]: value,
      }));
      setLocalFilters(prev => ({
        ...prev,
        [field]: value,
      }));
      setCurrentPage(0); // Сбрасываем на первую страницу при изменении фильтра
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(0);
  };

  const resetFilters = () => {
    const emptyFilters = {
      username: '',
      email: '',
      surname: '',
      name: '',
      department: '',
      position: '',
    };
    setFilters(emptyFilters);
    setLocalFilters(emptyFilters);
    setCurrentPage(0);
  };

  const hasActiveFilters = Object.values(filters).some(v => v && v.trim() !== '');

  // Функция для открытия модального окна редактирования
  const handleEdit = (user: User) => {
    setEditingUser(user);
    setEditEmail(user.email || '');
    setEditPassword('');
    setEditRole(user.role || 'user');
  };

  // Функция для закрытия модального окна
  const handleCloseEdit = () => {
    setEditingUser(null);
    setEditEmail('');
    setEditPassword('');
    setEditRole('user');
  };

  // Функция для обновления пользователя
  const handleUpdateUser = async () => {
    if (!editingUser) return;

    setUpdating(true);
    try {
      const params = new URLSearchParams();
      if (editEmail.trim() !== editingUser.email) {
        params.append('email', editEmail.trim());
      }
      if (editPassword.trim() !== '') {
        params.append('password', editPassword.trim());
      }
      if (editRole !== editingUser.role) {
        params.append('role', editRole);
      }

      const response = await fetch(`${getBackendUrl()}/api/users/${editingUser.id}?${params.toString()}`, {
        method: 'PUT',
      });

      if (!response.ok) {
        throw new Error('Ошибка обновления пользователя');
      }

      // Обновляем данные
      await fetchData();
      handleCloseEdit();
    } catch (err) {
      console.error('Error updating user:', err);
      alert('Ошибка обновления пользователя');
    } finally {
      setUpdating(false);
    }
  };

  // Функция для открытия модального окна создания пользователя
  const handleCreateUser = () => {
    setIsCreatingUser(true);
    setNewUsername('');
    setNewPassword('');
    setNewEmail('');
    setNewSurname('');
    setNewName('');
    setNewDepartment('');
    setNewPosition('');
    setNewRole('user');
  };

  // Функция для закрытия модального окна создания пользователя
  const handleCloseCreate = () => {
    setIsCreatingUser(false);
    setNewUsername('');
    setNewPassword('');
    setNewEmail('');
    setNewSurname('');
    setNewName('');
    setNewDepartment('');
    setNewPosition('');
    setNewRole('user');
  };

  // Функция для создания пользователя
  const handleCreateUserSubmit = async () => {
    if (!newUsername.trim() || !newPassword.trim()) {
      alert('Логин и пароль обязательны для заполнения');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch(`${getBackendUrl()}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword.trim(),
          email: newEmail.trim() || null,
          surname: newSurname.trim() || null,
          name: newName.trim() || null,
          department: newDepartment.trim() || null,
          position: newPosition.trim() || null,
          role: newRole,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Ошибка создания пользователя' }));
        throw new Error(errorData.error || 'Ошибка создания пользователя');
      }

      // Обновляем данные
      await fetchData();
      handleCloseCreate();
    } catch (err: any) {
      console.error('Error creating user:', err);
      alert(err.message || 'Ошибка создания пользователя');
    } finally {
      setCreating(false);
    }
  };

  // Debounce для текстовых фильтров
  useEffect(() => {
    // Проверяем, изменились ли текстовые фильтры
    const textFields = ['username', 'email', 'surname', 'name', 'department', 'position'];
    const hasTextChanges = textFields.some(field => localFilters[field] !== filters[field]);
    
    if (hasTextChanges) {
      // Сохраняем фокус перед обновлением
      const input = focusedField ? document.querySelector(`input[data-filter-field="${focusedField}"]`) as HTMLInputElement : null;
      const cursorPosition = input ? (input.selectionStart || 0) : null;
      
      const timer = setTimeout(() => {
        setFilters(prev => {
          // Обновляем только измененные текстовые поля
          const updated = { ...prev };
          textFields.forEach(field => {
            updated[field] = localFilters[field];
          });
          return updated;
        });
        setCurrentPage(0); // Сбрасываем на первую страницу после применения фильтра
        
        // Восстанавливаем фокус после обновления
        if (focusedField && cursorPosition !== null) {
          setTimeout(() => {
            const inputAfterRender = document.querySelector(`input[data-filter-field="${focusedField}"]`) as HTMLInputElement;
            if (inputAfterRender) {
              inputAfterRender.focus();
              const newPos = Math.min(cursorPosition, inputAfterRender.value.length);
              inputAfterRender.setSelectionRange(newPos, newPos);
            }
          }, 0);
        }
      }, 500); // Задержка 500мс

      return () => clearTimeout(timer);
    }
  }, [localFilters, filters, focusedField]);

  // Восстановление фокуса после обновления localFilters
  useEffect(() => {
    if (focusedField) {
      const input = document.querySelector(`input[data-filter-field="${focusedField}"]`) as HTMLInputElement;
      if (input) {
        // Сохраняем позицию курсора
        const cursorPosition = input.selectionStart || 0;
        const currentValue = input.value;
        
        // Восстанавливаем фокус в следующем тике, чтобы не мешать текущему вводу
        requestAnimationFrame(() => {
          const inputAfterRender = document.querySelector(`input[data-filter-field="${focusedField}"]`) as HTMLInputElement;
          if (inputAfterRender && inputAfterRender.value === currentValue) {
            inputAfterRender.focus();
            // Восстанавливаем позицию курсора
            const newPosition = Math.min(cursorPosition, inputAfterRender.value.length);
            inputAfterRender.setSelectionRange(newPosition, newPosition);
          }
        });
      }
    }
  }, [localFilters, focusedField]);

  // Восстановление фокуса после обновления данных
  useEffect(() => {
    if (focusedField && !loading) {
      // Небольшая задержка, чтобы дать время компоненту перерисоваться
      setTimeout(() => {
        const input = document.querySelector(`input[data-filter-field="${focusedField}"]`) as HTMLInputElement;
        if (input) {
          input.focus();
          // Устанавливаем курсор в конец текста
          const length = input.value.length;
          input.setSelectionRange(length, length);
        }
      }, 50);
    }
  }, [data, loading, focusedField]);

  // Компонент заголовка с фильтром
  const SortableHeader = ({ field, label, filterType = 'text' }: { field: SortField; label: string; filterType?: 'text' | 'select' }) => {
    const isActive = sortField === field;
    return (
      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative">
        <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%' }}>
          {/* Верхний уровень - фильтр */}
          <div className="h-[24px] flex items-center flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px', minWidth: 0, width: '100%' }}>
            {filterType === 'text' ? (
              <input
                key={`filter-${field || ''}`}
                type="text"
                data-filter-field={field || ''}
                value={localFilters[field || ''] || ''}
                onChange={(e) => {
                  const newValue = e.target.value;
                  const cursorPos = e.target.selectionStart || 0;
                  setLocalFilters(prev => ({
                    ...prev,
                    [field || '']: newValue,
                  }));
                  // Сохраняем позицию курсора после обновления
                  requestAnimationFrame(() => {
                    const input = e.target as HTMLInputElement;
                    if (input && document.activeElement === input) {
                      const newPos = Math.min(cursorPos, newValue.length);
                      input.setSelectionRange(newPos, newPos);
                    }
                  });
                }}
                onFocus={(e) => {
                  e.stopPropagation();
                  setFocusedField(field || '');
                }}
                onBlur={(e) => {
                  // Снимаем фокус только если пользователь явно кликнул в другое место
                  setTimeout(() => {
                    const activeElement = document.activeElement as HTMLElement;
                    if (activeElement && 
                        activeElement !== e.target && 
                        !activeElement.closest('input[data-filter-field]') &&
                        !activeElement.closest('select')) {
                      setFocusedField(null);
                    }
                  }, 200);
                }}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  // Предотвращаем потерю фокуса при нажатии некоторых клавиш
                  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.stopPropagation();
                  }
                }}
                className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Фильтр"
                style={{ height: '24px', minHeight: '24px', maxHeight: '24px', minWidth: 0, boxSizing: 'border-box' }}
              />
            ) : (
              <select
                value={filters[field || ''] || ''}
                onChange={(e) => handleFilterChange(field || '', e.target.value, false)}
                onClick={(e) => e.stopPropagation()}
                onFocus={(e) => e.stopPropagation()}
                className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                style={{ height: '24px', minHeight: '24px', maxHeight: '24px', minWidth: 0, boxSizing: 'border-box' }}
              >
                <option value="">Все</option>
                {(uniqueValues[field || ''] || []).map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            )}
          </div>
          {/* Нижний уровень - сортировка и название */}
          <div className="flex items-center gap-1 min-h-[20px]">
            <button
              onClick={() => handleSort(field)}
              className="flex items-center justify-center hover:text-gray-700 transition-colors flex-shrink-0"
              style={{ width: '20px', height: '20px', minWidth: '20px', maxWidth: '20px', minHeight: '20px', maxHeight: '20px', padding: 0 }}
            >
              {isActive ? (
                sortDirection === 'asc' ? (
                  <ArrowUp className="w-3 h-3 flex-shrink-0" />
                ) : (
                  <ArrowDown className="w-3 h-3 flex-shrink-0" />
                )
              ) : (
                <ArrowUpDown className="w-3 h-3 opacity-30 flex-shrink-0" />
              )}
            </button>
            <span className="text-xs font-medium text-gray-500 tracking-wider">{label}</span>
          </div>
        </div>
      </th>
    );
  };

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4">
        <div className="text-center py-6">
          <p className="text-red-600 mb-4">Ошибка: {error}</p>
          <button
            onClick={() => fetchData()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col flex-1 min-h-0">
      {/* Кнопки управления */}
      <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <button
          onClick={handleCreateUser}
          className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          Создать пользователя
        </button>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="px-4 py-2 text-sm font-medium bg-red-50 text-red-700 rounded-lg border-2 border-red-300 hover:bg-red-100 hover:border-red-400 transition-colors shadow-sm"
          >
            Сбросить фильтры
          </button>
        )}
      </div>

      {/* Таблица */}
      <div className="flex-1 min-h-0 overflow-auto relative">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {columnOrder.map((columnKey) => {
                const labels: Record<string, string> = {
                  id: 'ID',
                  username: 'Логин',
                  email: 'Email',
                  password: 'Пароль',
                  role: 'Роль',
                  surname: 'Фамилия',
                  name: 'Имя',
                  department: 'Отдел',
                  position: 'Должность',
                  createdAt: 'Создан',
                  updatedAt: 'Обновлен',
                };
                return (
                  <SortableHeader
                    key={columnKey}
                    field={columnKey as SortField}
                    label={labels[columnKey] || columnKey}
                    filterType="text"
                  />
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={columnOrder.length} className="px-6 py-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-gray-500">Загрузка данных...</p>
                </td>
              </tr>
            ) : data && data.content.length > 0 ? (
              data.content.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-200 whitespace-nowrap">
                    {user.id}
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-200 whitespace-nowrap">
                    {user.username || '-'}
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-200 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {user.email || '-'}
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        title="Редактировать email и пароль"
                      >
                        <Edit className="w-3 h-3 text-gray-600" />
                      </button>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-200 whitespace-nowrap">
                    {user.password ? '••••••••' : '-'}
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-200 whitespace-nowrap">
                    {user.role === 'admin' ? 'Администратор' : user.role === 'user' ? 'Пользователь' : user.role || '-'}
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-200 whitespace-nowrap">
                    {user.surname || '-'}
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-200 whitespace-nowrap">
                    {user.name || '-'}
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-200 whitespace-nowrap">
                    {user.department || '-'}
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-200 whitespace-nowrap">
                    {user.position || '-'}
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-200 whitespace-nowrap">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-200 whitespace-nowrap">
                    {formatDate(user.updatedAt)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columnOrder.length} className="px-6 py-8 text-center text-gray-500">
                  Нет данных
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Пагинация */}
      {data && data.totalPages > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-700">
              Показано {data.content.length} из {data.totalElements} записей
            </span>
            <div className="flex items-center gap-2">
              <label htmlFor="pageSize" className="text-sm text-gray-700">
                Элементов на странице:
              </label>
              <select
                id="pageSize"
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(0)}
              disabled={currentPage === 0}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Первая
            </button>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 0}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Назад
            </button>
            <span className="px-4 py-2 text-sm font-medium text-gray-700">
              Страница {currentPage + 1} из {data.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= data.totalPages - 1}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Вперед
            </button>
            <button
              onClick={() => handlePageChange(data.totalPages - 1)}
              disabled={currentPage >= data.totalPages - 1}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Последняя
            </button>
          </div>
        </div>
      )}

      {/* Модальное окно создания пользователя */}
      {isCreatingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Создать пользователя
              </h2>
              <button
                onClick={handleCloseCreate}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="newUsername" className="block text-sm font-medium text-gray-700 mb-1">
                  Логин <span className="text-red-500">*</span>
                </label>
                <input
                  id="newUsername"
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Введите логин"
                />
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Пароль <span className="text-red-500">*</span>
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Введите пароль"
                />
              </div>

              <div>
                <label htmlFor="newEmail" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="newEmail"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Введите email"
                />
              </div>

              <div>
                <label htmlFor="newSurname" className="block text-sm font-medium text-gray-700 mb-1">
                  Фамилия
                </label>
                <input
                  id="newSurname"
                  type="text"
                  value={newSurname}
                  onChange={(e) => setNewSurname(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Введите фамилию"
                />
              </div>

              <div>
                <label htmlFor="newName" className="block text-sm font-medium text-gray-700 mb-1">
                  Имя
                </label>
                <input
                  id="newName"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Введите имя"
                />
              </div>

              <div>
                <label htmlFor="newDepartment" className="block text-sm font-medium text-gray-700 mb-1">
                  Отдел
                </label>
                <input
                  id="newDepartment"
                  type="text"
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Введите отдел"
                />
              </div>

              <div>
                <label htmlFor="newPosition" className="block text-sm font-medium text-gray-700 mb-1">
                  Должность
                </label>
                <input
                  id="newPosition"
                  type="text"
                  value={newPosition}
                  onChange={(e) => setNewPosition(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Введите должность"
                />
              </div>

              <div>
                <label htmlFor="newRole" className="block text-sm font-medium text-gray-700 mb-1">
                  Роль
                </label>
                <select
                  id="newRole"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="user">Пользователь</option>
                  <option value="admin">Администратор</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreateUserSubmit}
                disabled={creating || !newUsername.trim() || !newPassword.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? 'Создание...' : 'Создать'}
              </button>
              <button
                onClick={handleCloseCreate}
                disabled={creating}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно редактирования */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Редактировать пользователя: {editingUser.username}
              </h2>
              <button
                onClick={handleCloseEdit}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="editEmail" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="editEmail"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Введите email"
                />
              </div>

              <div>
                <label htmlFor="editPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Новый пароль (оставьте пустым, чтобы не менять)
                </label>
                <input
                  id="editPassword"
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Введите новый пароль"
                />
              </div>

              <div>
                <label htmlFor="editRole" className="block text-sm font-medium text-gray-700 mb-1">
                  Роль
                </label>
                <select
                  id="editRole"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="user">Пользователь</option>
                  <option value="admin">Администратор</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleUpdateUser}
                disabled={updating}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {updating ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button
                onClick={handleCloseEdit}
                disabled={updating}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

