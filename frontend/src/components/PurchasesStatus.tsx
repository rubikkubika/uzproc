'use client';

import React, { useState, useEffect, useMemo } from 'react';

interface PurchaseData {
  [key: string]: string;
}

export default function PurchasesStatus() {
  const [data, setData] = useState<PurchaseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(''); // Текст в поле поиска
  const [searchQuery, setSearchQuery] = useState(''); // Активный поисковый запрос
  const [activeTabs, setActiveTabs] = useState<{ [key: number]: 'main' | 'approvals' }>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 50;

  // Загрузка данных с сервера с пагинацией и поиском
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const searchParam = searchQuery.trim() ? `&search=${encodeURIComponent(searchQuery.trim())}` : '';
        const url = `/api/purchases-data?page=${currentPage}&limit=${itemsPerPage}${searchParam}`;
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const result = await res.json();
        
        setData(result.data);
        setTotalPages(result.pagination.totalPages);
        setTotalItems(result.pagination.total);
        setLoading(false);
      } catch (err) {
        console.error('Error:', err);
        setLoading(false);
      }
    };
    
    loadData();
  }, [currentPage, itemsPerPage, searchQuery]);

  // Данные уже отфильтрованы на сервере, используем их напрямую
  const allPurchases = data;

  // Вычисляем индексы для отображения
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  // Сброс на первую страницу при изменении поиска
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Обработчик поиска по Enter
  const handleSearch = () => {
    setSearchQuery(searchInput);
  };

  // Обработчик нажатия Enter
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const setActiveTab = (index: number, tab: 'main' | 'approvals') => {
    setActiveTabs({ ...activeTabs, [index]: tab });
  };

  const renderApprovalTimeline = (item: PurchaseData) => {
    // Этапы согласования с ролями
    const approvalStages = [
      {
        stageName: 'Согласование заявки',
        icon: '📝',
        roles: [
          { name: 'Руководитель закупщика', prefix: 'Согласование Заявки на ЗПРуководитель закупщика', icon: '👤' },
          { name: 'Руководитель ЦФО', prefix: 'Согласование Заявки на ЗПРуководитель ЦФО', icon: '👔' },
          { name: 'Председатель ЦФО', prefix: 'Согласование Заявки на ЗППредседатель ЦФО M - PVZ', icon: '🏛️' },
          { name: 'Финансист ЦФО', prefix: 'Согласование Заявки на ЗПФинансист ЦФО', icon: '💰' },
          { name: 'Генеральный директор', prefix: 'Согласование Заявки на ЗПГенеральный директор', icon: '👔' },
          { name: 'Финансовый директор', prefix: 'Согласование Заявки на ЗПФинансовый директор', icon: '💼' },
          { name: 'Финансовый директор (Маркет)', prefix: 'Согласование Заявки на ЗПФинансовый директор (Маркет)', icon: '💼' },
          { name: 'Служба безопасности', prefix: 'Согласование Заявки на ЗПСлужба безопасности', icon: '🔒' },
          { name: 'Руководитель ЦФО M - IT', prefix: 'Согласование Заявки на ЗПРуководитель ЦФО M - IT', icon: '💻' },
          { name: 'Руководитель ЦФО M - Maintenance', prefix: 'Согласование Заявки на ЗПРуководитель ЦФО M - Maintenance', icon: '🔧' }
        ]
      },
      {
        stageName: 'Утверждение',
        icon: '✍️',
        roles: [
          { name: 'Ответственный закупщик', prefix: 'Утверждение заявки на ЗПОтветственный закупщик', icon: '👤' },
          { name: 'Подготовил документ', prefix: 'Утверждение заявки на ЗППодготовил документ', icon: '📄' },
          { name: 'Руководитель закупщика', prefix: 'Утверждение заявки на ЗПРуководитель закупщика', icon: '👤' }
        ]
      },
      {
        stageName: 'Утверждение заявки на ЗП (НЕ требуется ЗП)',
        icon: '✍️',
        roles: [
          { name: 'Ответственный закупщик', prefix: 'Утверждение заявки на ЗП (НЕ требуется ЗП)Ответственный закупщик', icon: '👤' }
        ]
      },
      {
        stageName: 'Закупочная комиссия',
        icon: '🏛️',
        roles: [
          { name: 'Финансовый директор', prefix: 'Закупочная комиссияФинансовый директор', icon: '💼' },
          { name: 'Финансовый директор (Маркет)', prefix: 'Закупочная комиссияФинансовый директор (Маркет)', icon: '💼' },
          { name: 'Генеральный директор', prefix: 'Закупочная комиссияГенеральный директор', icon: '👔' },
          { name: 'Ответственный закупщик', prefix: 'Проверка результата закупочной комиссииОтветственный закупщик', icon: '✓' }
        ]
      },
      {
        stageName: 'Согласование результатов',
        icon: '✅',
        roles: [
          { name: 'Служба безопасности', prefix: 'Согласование результатов ЗПСлужба безопасности', icon: '🔒' },
          { name: 'Руководитель закупщика', prefix: 'Согласование результатов ЗПРуководитель закупщика', icon: '👤' },
          { name: 'Руководитель ЦФО', prefix: 'Согласование результатов ЗПРуководитель ЦФО', icon: '👔' },
          { name: 'Финансист ЦФО', prefix: 'Согласование результатов ЗПФинансист ЦФО', icon: '💰' }
        ]
      }
    ];

    const renderRole = (role: { name: string; prefix: string; icon: string }) => {
      const { dateAppointed, dateCompleted, daysInWork } = findRoleFields(role);
      
      
      const hasData = dateAppointed || dateCompleted || daysInWork;
      const isCompleted = dateCompleted && dateCompleted !== '' && !dateCompleted.includes('Пропущено');
      const isPending = dateAppointed && !dateCompleted && !dateCompleted.includes('Пропущено');
      const isSkipped = (dateAppointed && dateAppointed.includes('Пропущено')) || (dateCompleted && dateCompleted.includes('Пропущено'));
      
      if (!hasData) return null;
      
      return (
        <div key={role.name} className="bg-white rounded-lg border-2 border-gray-300 p-1.5 mb-0.5">
          {/* Мобильная версия */}
          <div className="md:hidden">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">{role.icon}</span>
              <span className="font-medium text-gray-900 text-sm">{role.name}</span>
              <div className="ml-auto">
                {isCompleted && <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-medium">✓</span>}
                {isPending && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">⏳</span>}
                {isSkipped && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">Пропущено</span>}
                {!isCompleted && !isPending && !isSkipped && <span className="px-2 py-0.5 bg-gray-100 text-gray-400 rounded-full text-xs font-medium">—</span>}
              </div>
            </div>
            {!isSkipped && (
              <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                <div>
                  <div className="text-gray-500 text-[10px] mb-0.5">Назначено</div>
                  <div className="font-medium text-gray-900">{formatDate(dateAppointed) || '-'}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-[10px] mb-0.5">Выполнено</div>
                  <div className="font-medium text-gray-900">{formatDate(dateCompleted) || '-'}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-[10px] mb-0.5">Дней</div>
                  <div className="font-medium text-gray-900">{daysInWork || '-'}</div>
                </div>
              </div>
            )}
          </div>
          
          {/* Десктопная версия */}
          <div className="hidden md:grid grid-cols-[auto_100px_100px_60px_100px] lg:grid-cols-[auto_120px_120px_80px_120px] gap-2 lg:gap-3 items-center text-xs">
            <div className="flex items-center gap-2 min-w-[150px] lg:min-w-0">
              <span className="text-base">{role.icon}</span>
              <span className="font-medium text-gray-900 truncate">{role.name}</span>
            </div>
            {isSkipped ? (
              <>
                <div className="text-xs text-gray-400">-</div>
                <div className="text-xs text-gray-400">-</div>
                <div className="text-xs text-gray-400">-</div>
                <div className="text-xs">
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium">Пропущено</span>
                </div>
              </>
            ) : (
              <>
                <div className="text-xs text-gray-600">
                  {formatDate(dateAppointed) || '-'}
                </div>
                <div className="text-xs text-gray-600">
                  {formatDate(dateCompleted) || '-'}
                </div>
                <div className="text-xs text-gray-600">
                  {daysInWork || '-'}
                </div>
                <div className="text-xs">
                  {isCompleted && <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full font-medium">✓</span>}
                  {isPending && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full font-medium">⏳</span>}
                  {!isCompleted && !isPending && <span className="px-2 py-0.5 bg-gray-100 text-gray-400 rounded-full font-medium">—</span>}
                </div>
              </>
            )}
          </div>
        </div>
      );
    };

    // Вспомогательная функция для поиска полей роли
    const findRoleFields = (role: { name: string; prefix: string }) => {
      let dateAppointed = '';
      let dateCompleted = '';
      let daysInWork = '';
      
      // Ищем по точному префиксу
      const exactKey1 = `${role.prefix}Дата назначения`;
      const exactKey2 = `${role.prefix}Дата выполнения`;
      const exactKey3 = `${role.prefix}Дней в работе`;
      
      // Проверяем наличие ключей в объекте
      if (exactKey1 in item) {
        dateAppointed = String(item[exactKey1] || '').trim();
      }
      if (exactKey2 in item) {
        dateCompleted = String(item[exactKey2] || '').trim();
      }
      if (exactKey3 in item) {
        daysInWork = String(item[exactKey3] || '').trim();
      }
      
      // Если не найдено, ищем все ключи, которые начинаются с префикса
      if (!dateAppointed || !dateCompleted || !daysInWork) {
        Object.keys(item).forEach(key => {
          if (key.startsWith(role.prefix)) {
            const value = String(item[key] || '').trim();
            if (value) {
              if ((key.includes('Дата назначения') || key.endsWith('Дата назначения')) && !dateAppointed) {
                dateAppointed = value;
              }
              if ((key.includes('Дата выполнения') || key.endsWith('Дата выполнения')) && !dateCompleted) {
                dateCompleted = value;
              }
              if ((key.includes('Дней в работе') || key.endsWith('Дней в работе')) && !daysInWork) {
                daysInWork = value;
              }
            }
          }
        });
      }
      
      return { dateAppointed, dateCompleted, daysInWork };
    };

    const renderStage = (stage: typeof approvalStages[0], stageIndex: number) => {
      const hasRoles = stage.roles.some(role => {
        const { dateAppointed, dateCompleted, daysInWork } = findRoleFields(role);
        return dateAppointed || dateCompleted || daysInWork;
      });
      
      if (!hasRoles) return null;
      
      return (
        <div key={stageIndex} className="mb-6">
          <div className="flex items-center gap-2 lg:gap-3 mb-3 border-b border-gray-200 pb-2">
            <span className="text-xl lg:text-2xl">{stage.icon}</span>
            <h5 className="text-base lg:text-lg font-semibold text-gray-900">{stage.stageName}</h5>
          </div>
          
          {/* Заголовки колонок - только для десктопа */}
          <div className="hidden md:grid grid-cols-[auto_100px_100px_60px_100px] lg:grid-cols-[auto_120px_120px_80px_120px] gap-2 lg:gap-3 px-2 mb-1 bg-gray-100 rounded-lg py-1.5">
            <div className="font-medium text-gray-700 text-xs lg:text-sm min-w-[150px] lg:min-w-0">Роль</div>
            <div className="font-medium text-gray-700 text-xs">Назначено</div>
            <div className="font-medium text-gray-700 text-xs">Выполнено</div>
            <div className="font-medium text-gray-700 text-xs">Дней</div>
            <div className="font-medium text-gray-700 text-xs">Статус</div>
          </div>
          
          <div>
            {stage.roles.map(role => renderRole(role))}
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-4 overflow-x-auto">
        {approvalStages.map((stage, index) => renderStage(stage, index))}
      </div>
    );
  };

  const formatNumber = (value: string) => {
    if (!value || value.trim() === '') return '-';
    // Удаляем все пробелы и запятые (разделители тысяч)
    // Оставляем точку как десятичный разделитель
    let cleanedValue = value.replace(/\s/g, '').replace(/,/g, '');
    const num = parseFloat(cleanedValue);
    if (isNaN(num)) return value;
    
    // Определяем, были ли десятичные знаки в исходном значении
    const hasDecimals = value.includes('.') && value.split('.')[1] && value.split('.')[1].length > 0;
    const decimalPlaces = hasDecimals ? Math.min(2, value.split('.')[1].length) : 0;
    
    return new Intl.NumberFormat('ru-RU', { 
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces
    }).format(num);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    if (dateStr.includes('Пропущено')) return '-';
    try {
      // Новый формат: DD.MM.YYYY HH:MM или DD.MM.YYYY
      if (dateStr.includes('.')) {
        const [datePart] = dateStr.split(' ');
        return datePart; // Возвращаем только дату без времени
      }
      // Старый формат: DD/MM/YYYY
      const [day, month, year] = dateStr.split('/');
      return `${day}.${month}.${year}`;
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow-lg h-64 bg-gray-200"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Статус заявок</h2>
        <p className="text-sm text-gray-600">Всего закупок: {totalItems}</p>
      </div>

      {/* Строка поиска */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Поиск по номеру, предмету, ЦФО, инициатору, закупщику, поставщику, статусу... (нажмите Enter)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 placeholder-gray-500"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
          >
            Найти
          </button>
        </div>
        {searchQuery && (
          <div className="mt-2 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Найдено результатов: {totalItems}
            </div>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchInput('');
                  setSearchQuery('');
                }}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Очистить поиск
              </button>
            )}
          </div>
        )}
      </div>

      {/* Область результатов */}
      {loading ? (
        <div className="bg-white p-6 rounded-lg shadow-lg text-center text-gray-500">
          Загрузка...
        </div>
      ) : allPurchases.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow-lg text-center text-gray-500">
          {searchQuery ? 'Ничего не найдено' : 'Нет данных'}
        </div>
      ) : (
        <>
          {allPurchases.map((item, localIndex) => {
            const globalIndex = startIndex + localIndex;
            const currentTab = activeTabs[globalIndex] || 'main';
            
            return (
              <div key={globalIndex} className="bg-white rounded-lg shadow-lg">
                <div className="p-3 sm:p-4">
                  <div className="border-b border-gray-200 pb-2 mb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                          Заявка #{item['№ заявки'] || 'N/A'}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600">{item['Предмет ЗП'] || '-'}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        item['Состояние заявки на ЗП']?.includes('Согласован') 
                          ? 'bg-green-100 text-green-800'
                          : item['Состояние заявки на ЗП']?.includes('Не согласован')
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item['Состояние заявки на ЗП'] || 'В обработке'}
                      </span>
                    </div>
                  </div>

            {/* Вкладки */}
            <div className="border-b border-gray-200 mb-2">
              <div className="flex space-x-1">
                <button
                  onClick={() => setActiveTab(globalIndex, 'main')}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-t-lg transition-colors ${
                    currentTab === 'main'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Основная информация
                </button>
                <button
                  onClick={() => setActiveTab(globalIndex, 'approvals')}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-t-lg transition-colors ${
                    currentTab === 'approvals'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Согласования
                </button>
              </div>
            </div>

            {/* Контент вкладок */}
            {currentTab === 'main' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 text-sm">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Детали заявки</h4>
                    <div className="space-y-1.5">
                      <div className="flex gap-2">
                        <span className="text-gray-600 whitespace-nowrap">Номер заявки:</span>
                        <span className="font-medium text-gray-900">#{item['№ заявки'] || '-'}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-gray-600 whitespace-nowrap">ЦФО:</span>
                        <span className="font-medium text-gray-900">{item['ЦФО'] || '-'}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-gray-600 whitespace-nowrap">Формат:</span>
                        <span className="font-medium text-gray-900">{item['Формат ЗП'] || '-'}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-gray-600 whitespace-nowrap">Дата создания:</span>
                        <span className="font-medium text-gray-900">{formatDate(item['Дата создания ЗП'])}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-gray-600 whitespace-nowrap">Лимит (план):</span>
                        <span className="font-medium text-gray-900">
                          сум{formatNumber(item['Лимит ЗП ПЛАН (сум без НДС)'])}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-gray-600 whitespace-nowrap">Сумма (факт):</span>
                        <span className="font-medium text-gray-900">
                          сум{formatNumber(item['Cумма предпологаемого контракта ФАКТ'])}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-gray-600 whitespace-nowrap">Экономия:</span>
                        <span className="font-medium text-green-600">
                          сум{formatNumber(item['Экономия'])}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Участники</h4>
                    <div className="space-y-1.5">
                      <div className="flex gap-2">
                        <span className="text-gray-600 whitespace-nowrap">Инициатор:</span>
                        <span className="font-medium text-gray-900 truncate" title={item['Инициатор ЗП']}>
                          {item['Инициатор ЗП'] || '-'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-gray-600 whitespace-nowrap">Закупщик:</span>
                        <span className="font-medium text-gray-900 truncate" title={item['Закупшик']}>
                          {item['Закупшик'] || '-'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-gray-600 whitespace-nowrap">Поставщик:</span>
                        <span className="font-medium text-gray-900 truncate" title={item['Наименование поставщика (Закупочная процедура)']}>
                          {item['Наименование поставщика (Закупочная процедура)'] || '-'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-gray-600 whitespace-nowrap">Дата запуска:</span>
                        <span className="font-medium text-gray-900">{formatDate(item['Дата запуска'])}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-gray-600 whitespace-nowrap">Дней в работе:</span>
                        <span className="font-medium text-gray-900">{item['Дней в работе закупщика'] || '-'}</span>
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className="text-gray-600 whitespace-nowrap">Статус процедуры:</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          item['Статус закупочной процедуры']?.includes('Согласован') 
                            ? 'bg-green-100 text-green-800'
                            : item['Статус закупочной процедуры']?.includes('Не согласован')
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item['Статус закупочной процедуры'] || '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {item['Комментарий'] && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-1">Комментарий</h4>
                    <p className="text-xs sm:text-sm text-gray-700 bg-gray-50 p-2 rounded-lg">
                      {item['Комментарий']}
                    </p>
                  </div>
                )}
              </>
            )}

            {currentTab === 'approvals' && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  {renderApprovalTimeline(item)}
                </div>
              </div>
            )}
          </div>
        </div>
        );
      })}

          {/* Пагинация */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4 bg-white p-4 rounded-lg shadow-lg">
              <div className="text-sm text-gray-700">
                Показано {startIndex + 1} - {endIndex} из {totalItems} заявок
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Назад
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      // Показываем первую, последнюю, текущую и соседние страницы
                      return page === 1 || 
                             page === totalPages || 
                             (page >= currentPage - 2 && page <= currentPage + 2);
                    })
                    .map((page, index, array) => {
                      // Добавляем многоточие если есть пропуски
                      const showEllipsis = index > 0 && array[index - 1] !== page - 1;
                      return (
                        <React.Fragment key={page}>
                          {showEllipsis && (
                            <span className="px-2 text-gray-500">...</span>
                          )}
                          <button
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-2 text-sm font-medium rounded-lg ${
                              currentPage === page
                                ? 'bg-blue-500 text-white'
                                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      );
                    })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Вперед
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

