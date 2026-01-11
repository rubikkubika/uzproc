# План рефакторинга PurchasePlanItemsTable

## Структура файлов после разбиения

```
frontend/src/app/purchase-plan/_components/
├── PurchasePlanItemsTable.tsx (основной компонент - только JSX и композиция)
├── types/
│   └── purchase-plan-items.types.ts
├── constants/
│   └── purchase-plan-items.constants.ts
├── utils/
│   ├── purchase-plan-items.utils.ts
│   ├── date.utils.ts
│   ├── currency.utils.ts
│   └── export.utils.ts
├── hooks/
│   ├── usePurchasePlanItemsTable.ts (главный хук)
│   ├── usePurchasePlanItemsFilters.ts
│   ├── usePurchasePlanItemsColumns.ts
│   ├── usePurchasePlanItemsData.ts
│   ├── usePurchasePlanItemsEditing.ts
│   ├── usePurchasePlanItemsModals.ts
│   └── usePurchasePlanItemsVersions.ts
└── ui/
    ├── PurchasePlanItemsTableHeader.tsx
    ├── PurchasePlanItemsTableBody.tsx
    ├── PurchasePlanItemsTableRow.tsx
    ├── PurchasePlanItemsTableFilters.tsx
    ├── PurchasePlanItemsTableColumnsMenu.tsx
    ├── PurchasePlanItemsDetailsModal.tsx
    ├── PurchasePlanItemsCreateModal.tsx
    ├── PurchasePlanItemsAuthModal.tsx
    ├── PurchasePlanItemsErrorModal.tsx
    ├── PurchasePlanItemsVersionsModal.tsx
    ├── PurchasePlanItemsCreateVersionModal.tsx
    ├── PurchasePlanItemsVersionsListModal.tsx
    ├── SortableHeader.tsx
    ├── FilterDropdown.tsx
    └── GanttChart.tsx (уже существует)
```

---

## 1. ТИПЫ (types/purchase-plan-items.types.ts)

### Что вынести:
- `interface PurchasePlanItem` (строки 10-40)
- `interface PurchaseRequest` (строки 42-56)
- `interface PageResponse` (строки 58-77)
- `type SortField` (строка 79)
- `type SortDirection` (строка 80)

### Дополнительные типы для хуков:
```typescript
// Типы для фильтров
type FilterState = Record<string, string>;
type MultiFilterState = Set<string>;

// Типы для модальных окон
type ModalTab = 'comments' | 'data' | 'changes' | 'purchaseRequest';

// Типы для редактирования
type EditingDate = { itemId: number; field: 'requestDate' } | null;
type EditingField = number | null;

// Типы для версий
type Version = {
  id: number;
  versionNumber: number;
  description: string;
  createdAt: string;
  itemsCount: number;
  isCurrent: boolean;
};
```

---

## 2. КОНСТАНТЫ (constants/purchase-plan-items.constants.ts)

### Что вынести:
- `FILTERS_STORAGE_KEY` (строка 83)
- `COLUMNS_VISIBILITY_STORAGE_KEY` (строка 84)
- `ALL_STATUSES` (строка 87)
- `DEFAULT_STATUSES` (строка 88)
- `ALL_COLUMNS` (строки 91-118)
- `DEFAULT_VISIBLE_COLUMNS` (строки 121-133)
- `USD_TO_UZS_RATE` (строка 213)
- `pageSize` (строка 199) - можно сделать константой

### Дополнительные константы:
```typescript
// Дефолтные значения для новых элементов
export const DEFAULT_NEW_ITEM = {
  company: 'Market',
  status: 'Проект',
};

// Дефолтные ширины колонок (строки 1995-2019)
export const DEFAULT_COLUMN_WIDTHS = {
  id: 80,
  guid: 256,
  year: 80,
  company: 128,
  // ... остальные
};
```

---

## 3. УТИЛИТЫ

### 3.1. purchase-plan-items.utils.ts
**Что вынести:**
- `getCompanyLogoPath` (строки 136-155)
- `getPurchaseRequestStatusColor` (строки 158-189)
- `getDefaultColumnWidth` (строки 1995-2021)
- `getColumnWidth` (строки 2025-2030) - но это зависит от состояния, может остаться в хуке

### 3.2. date.utils.ts
**Что вынести:**
- `addWorkingDays` (строки 1343-1357)
- `getWorkingDaysByComplexity` (строки 1360-1370)
- `calculateNewContractDate` (строки 1373-1393)

### 3.3. currency.utils.ts
**Что вынести:**
- `formatBudget` (строки 216-232)
- `formatBudgetFull` (строки 235-252)

### 3.4. export.utils.ts
**Что вынести:**
- `prepareExportData` (строки 2081-2120)
- Функции для экспорта в Excel (части из `handleExportToExcelWithFilters` и `handleExportToExcelAll`)

---

## 4. ХУКИ

### 4.1. usePurchasePlanItemsTable.ts (ГЛАВНЫЙ ХУК)
**Что вынести:**
- Композиция всех остальных хуков
- Основные состояния:
  - `data`, `allItems`, `loading`, `error`
  - `currentPage`, `hasMore`, `loadingMore`
  - `selectedYear`, `allYears`, `totalRecords`
  - `selectedMonths`, `selectedMonthYear`, `lastSelectedMonthIndex`
  - `selectedCurrency`
  - `chartData`, `summaryData`
- Основные функции:
  - `fetchData` (строки 2816-3247)
  - `getMonthlyDistribution` (строки 2448-2520)
- useEffect для:
  - Загрузки данных при монтировании
  - Загрузки chartData (строки 2263-2346)
  - Загрузки summaryData (строки 2349-2445)
  - Infinite scroll (строки с IntersectionObserver)

### 4.2. usePurchasePlanItemsFilters.ts
**Что вынести:**
- Состояния фильтров:
  - `filters`, `localFilters`, `focusedField`
  - `cfoFilter`, `companyFilter`, `purchaserCompanyFilter`, `categoryFilter`, `statusFilter`, `purchaserFilter`
  - `isCfoFilterOpen`, `isCompanyFilterOpen`, и т.д.
  - `cfoSearchQuery`, `companySearchQuery`, и т.д.
  - `cfoFilterPosition`, `companyFilterPosition`, и т.д.
  - `cfoFilterButtonRef`, `companyFilterButtonRef`, и т.д.
- Функции:
  - `handleFilterChange` (строка 3315)
  - `handleCfoToggle`, `handleCfoSelectAll`, `handleCfoDeselectAll` (строки 3496-3519)
  - `handleCompanyToggle`, `handleCompanySelectAll`, `handleCompanyDeselectAll` (строки 3520-3558)
  - `handlePurchaserCompanyToggle`, и т.д.
  - `handleStatusToggle`, и т.д.
  - `handlePurchaserToggle`, и т.д.
  - `handleFilterChangeForHeader`, `handleFocusForHeader`, `handleBlurForHeader` (строки 3266-3288)
  - `handlePurchaseSubjectFilterChange`, и т.д. (строки 3294-3314)
- useEffect для:
  - Позиционирования выпадающих списков (строки 423-504)
  - Закрытия фильтров при клике вне (строки 474-504)
  - Debounce для текстовых фильтров
  - Сохранения фильтров в localStorage

### 4.3. usePurchasePlanItemsColumns.ts
**Что вынести:**
- Состояния колонок:
  - `visibleColumns`
  - `columnWidths`, `isResizing`, `resizeStartX`, `resizeStartWidth`, `resizeColumn`
  - `columnOrder`, `draggedColumn`, `dragOverColumn`
  - `isColumnsMenuOpen`, `columnsMenuPosition`, `columnsMenuButtonRef`
- Функции:
  - `toggleColumnVisibility` (строки 545-555)
  - `selectAllColumns` (строки 557-559)
  - `selectDefaultColumns` (строки 561-563)
  - `handleResizeStart` (строки 2568-2578)
  - `handleDragStart`, `handleDragOver`, `handleDragLeave`, `handleDrop` (строки 2579-2610)
  - `handleResizeStartForHeader` (строки 3289-3293)
- useEffect для:
  - Сохранения видимости колонок в localStorage (строки 515-523)
  - Закрытия меню колонок при клике вне (строки 526-542)
  - Позиционирования меню колонок (строки 507-512)

### 4.4. usePurchasePlanItemsData.ts
**Что вынести:**
- Функции загрузки данных:
  - `fetchChanges` (строки 642-675)
  - `fetchModalItemData` (строки 678-708)
  - `fetchPurchaseRequest` (строки 711-741)
  - `loadVersions` (строки 381-408)
- Состояния для данных:
  - `modalItemData`
  - `changesData`
  - `purchaseRequestData`
  - `versions`, `loadingVersions`, `selectedVersionId`, `selectedVersionInfo`

### 4.5. usePurchasePlanItemsEditing.ts
**Что вынести:**
- Состояния редактирования:
  - `editingDate`, `editingStatus`, `statusSelectRef`
  - `editingHolding`, `holdingSelectRef`
  - `editingCompany`, `companySelectRef`
  - `editingPurchaserCompany`, `purchaserCompanySelectRef`
  - `editingCfo`, `creatingNewCfo`, `cfoSelectRef`, `cfoInputRef`, `cfoInputValue`
  - `editingPurchaseRequestId`, `purchaseRequestIdInputRef`
  - `editingPurchaseSubject`, `purchaseSubjectInputRef`
  - `editingPurchaser`, `availablePurchasers`
  - `tempDates`, `animatingDates`
  - `availableCompanies`
- Функции обновления:
  - `handleDateUpdate` (строки 1054-1058)
  - `performDateUpdate` (строки 955-1051)
  - `performGanttDateUpdate` (строки 829-952)
  - `handleStatusUpdate` (строки 1061-1114)
  - `handleHoldingUpdate` (строки 1117-1153)
  - `handleCompanyUpdate` (строки 1212-1340)
  - `handlePurchaserCompanyUpdate` (строки 1155-1210)
  - `handleCfoUpdate` (строки 1443-1575)
  - `handlePurchaserUpdate` (строки 1576-1637)
  - `handlePurchaseSubjectUpdate` (строки 1638-1672)
  - `handlePurchaseRequestIdUpdate` (строки 1673-1722)
- useEffect для:
  - Автоматического открытия календаря (строки 801-826)

### 4.6. usePurchasePlanItemsModals.ts
**Что вынести:**
- Состояния модальных окон:
  - `detailsModalOpen`, `activeTab`
  - `isCreateModalOpen`, `newItemData`
  - `isAuthModalOpen`, `authUsername`, `authPassword`, `authError`, `authLoading`, `pendingDateChange`
  - `errorModal`
- Функции:
  - `handleCreateItem` (строки 1395-1441)
  - `handleAuthConfirm` (строки 1723-2032)
- Проверка прав:
  - `userRole`, `canEdit` (строки 767-787)

### 4.7. usePurchasePlanItemsVersions.ts
**Что вынести:**
- Состояния версий:
  - `isCreateVersionModalOpen`, `isVersionsListModalOpen`
  - `versionDescription`
  - `isViewingArchiveVersion`
- Функции:
  - `loadVersions` (уже в usePurchasePlanItemsData, но можно продублировать или использовать из него)

---

## 5. UI КОМПОНЕНТЫ

### 5.1. PurchasePlanItemsTableHeader.tsx
**Что вынести:**
- Весь блок с заголовком таблицы (строки ~4036-4500+)
- Включает:
  - Выбор года
  - Выбор месяцев
  - Выбор валюты
  - Кнопки экспорта (PDF, Excel)
  - Кнопки создания версии, просмотра версий
  - Информацию о версии
  - Кнопку создания новой строки
  - Кнопку настроек колонок

### 5.2. PurchasePlanItemsTableBody.tsx
**Что вынести:**
- Весь блок с телом таблицы (строки ~4500-6500+)
- Включает:
  - Заголовки колонок с фильтрами и сортировкой
  - Строки таблицы
  - Infinite scroll индикатор

### 5.3. PurchasePlanItemsTableRow.tsx
**Что вынести:**
- Одна строка таблицы
- Включает:
  - Ячейки с данными
  - Редактирование inline
  - GanttChart для дат
  - Обработчики кликов

### 5.4. PurchasePlanItemsTableFilters.tsx
**Что вынести:**
- Компоненты фильтров (если они вынесены отдельно):
  - Текстовые фильтры
  - Выпадающие списки с чекбоксами
  - Поиск внутри фильтров

### 5.5. PurchasePlanItemsTableColumnsMenu.tsx
**Что вынести:**
- Модальное окно выбора колонок (строки ~6500-6800+)
- Включает:
  - Чекбоксы для каждой колонки
  - Кнопки "Выбрать все", "По умолчанию"

### 5.6. PurchasePlanItemsDetailsModal.tsx
**Что вынести:**
- Модальное окно деталей (строки 7196-7547)
- Включает:
  - Вкладки (Комментарии, Данные, Изменения, Данные о заявке)
  - Содержимое каждой вкладки
  - Пагинацию для изменений

### 5.7. PurchasePlanItemsCreateModal.tsx
**Что вынести:**
- Модальное окно создания новой строки (строки ~6800-7000+)
- Включает:
  - Форму с полями для нового элемента
  - Кнопки "Создать" и "Отмена"

### 5.8. PurchasePlanItemsAuthModal.tsx
**Что вынести:**
- Модальное окно повторной аутентификации (строки ~6800-7000+)
- Включает:
  - Поля логин/пароль
  - Кнопки "Подтвердить" и "Отмена"

### 5.9. PurchasePlanItemsErrorModal.tsx
**Что вынести:**
- Модальное окно ошибки
- Простое окно с сообщением об ошибке

### 5.10. PurchasePlanItemsVersionsModal.tsx
**Что вынести:**
- Модальное окно создания версии (строки 7000-7076)
- Включает:
  - Поле описания
  - Кнопки "Создать" и "Отмена"

### 5.11. PurchasePlanItemsVersionsListModal.tsx
**Что вынести:**
- Модальное окно списка версий (строки 7078-7194)
- Включает:
  - Таблицу с версиями
  - Выбор версии

### 5.12. SortableHeader.tsx
**Что вынести:**
- Компонент заголовка колонки с сортировкой и фильтром
- Используется в каждой колонке таблицы
- Включает:
  - Кнопку сортировки
  - Поле фильтра (текстовое или выпадающий список)
  - Обработчики событий

### 5.13. FilterDropdown.tsx
**Что вынести:**
- Компонент выпадающего списка фильтра
- Включает:
  - Поиск внутри списка
  - Чекбоксы для множественного выбора
  - Кнопки "Выбрать все", "Снять все"

---

## 6. ГЛАВНЫЙ КОМПОНЕНТ PurchasePlanItemsTable.tsx

**Что оставить:**
- Только композицию всех хуков и UI компонентов
- Минимальный JSX для структуры страницы
- Импорты всех необходимых компонентов и хуков

**Структура:**
```typescript
export default function PurchasePlanItemsTable() {
  // Используем все хуки
  const tableData = usePurchasePlanItemsTable();
  const filters = usePurchasePlanItemsFilters();
  const columns = usePurchasePlanItemsColumns();
  const editing = usePurchasePlanItemsEditing();
  const modals = usePurchasePlanItemsModals();
  const versions = usePurchasePlanItemsVersions();
  
  // Композиция компонентов
  return (
    <div>
      <PurchasePlanItemsTableHeader {...headerProps} />
      <PurchasePlanItemsTableBody {...bodyProps} />
      {/* Модальные окна */}
    </div>
  );
}
```

---

## 7. РЕКОМЕНДАЦИИ ПО SHARED КОМПОНЕНТАМ

### Можно вынести в shared (используются на нескольких страницах):

1. **SortableHeader.tsx** → `app/_components/SortableHeader.tsx`
   - Используется в других таблицах (PurchaseRequestsTable, PurchasesTable и т.д.)

2. **FilterDropdown.tsx** → `app/_components/FilterDropdown.tsx`
   - Универсальный компонент для фильтров с чекбоксами

3. **GanttChart.tsx** → `app/_components/GanttChart.tsx`
   - Если используется на других страницах

4. **Утилиты для дат** → `utils/date.utils.ts` (в корне utils)
   - `addWorkingDays`, `getWorkingDaysByComplexity`, `calculateNewContractDate`
   - Могут использоваться в других местах

5. **Утилиты для валют** → `utils/currency.utils.ts` (в корне utils)
   - `formatBudget`, `formatBudgetFull`
   - Могут использоваться в других местах

6. **Утилиты для экспорта** → `utils/export.utils.ts` (в корне utils)
   - `prepareExportData` и функции экспорта в Excel
   - Могут использоваться в других таблицах

7. **Типы** → `types/purchase-plan.types.ts` (в корне types или в shared)
   - `PurchasePlanItem`, `PurchaseRequest`, `PageResponse`
   - Если используются на других страницах

8. **Константы статусов** → `constants/status.constants.ts` (в корне constants)
   - `ALL_STATUSES`, `DEFAULT_STATUSES`
   - Если используются в других местах

---

## 8. ПОРЯДОК РЕФАКТОРИНГА

1. **Шаг 1: Типы и константы**
   - Вынести все типы в `types/purchase-plan-items.types.ts`
   - Вынести все константы в `constants/purchase-plan-items.constants.ts`

2. **Шаг 2: Утилиты**
   - Вынести утилиты в отдельные файлы
   - Обновить импорты в основном компоненте

3. **Шаг 3: Хуки (по одному)**
   - Начать с `usePurchasePlanItemsFilters.ts` (самый простой)
   - Затем `usePurchasePlanItemsColumns.ts`
   - Затем `usePurchasePlanItemsData.ts`
   - Затем `usePurchasePlanItemsEditing.ts`
   - Затем `usePurchasePlanItemsModals.ts`
   - Затем `usePurchasePlanItemsVersions.ts`
   - В конце `usePurchasePlanItemsTable.ts` (главный хук)

4. **Шаг 4: UI компоненты (по одному)**
   - Начать с простых модальных окон
   - Затем более сложные компоненты
   - В конце основные компоненты таблицы

5. **Шаг 5: Главный компонент**
   - Упростить до композиции хуков и компонентов

---

## 9. ВАЖНЫЕ ЗАМЕЧАНИЯ

- **Не менять имена переменных и функций** - использовать те же имена
- **Не менять JSX и стили** - переносить как есть
- **Не оптимизировать поведение** - только разбиение на слои
- **Сохранить все зависимости** - все useEffect, useCallback, useMemo должны работать так же
- **Тестировать после каждого шага** - убедиться, что функциональность не сломалась

---

## 10. ПРИМЕРЫ ИМПОРТОВ

### В главном компоненте:
```typescript
import { usePurchasePlanItemsTable } from './hooks/usePurchasePlanItemsTable';
import { usePurchasePlanItemsFilters } from './hooks/usePurchasePlanItemsFilters';
import { PurchasePlanItemsTableHeader } from './ui/PurchasePlanItemsTableHeader';
import { PurchasePlanItemsTableBody } from './ui/PurchasePlanItemsTableBody';
```

### В хуках:
```typescript
import { PurchasePlanItem, SortField, SortDirection } from '../types/purchase-plan-items.types';
import { FILTERS_STORAGE_KEY, DEFAULT_STATUSES } from '../constants/purchase-plan-items.constants';
import { formatBudget } from '../utils/currency.utils';
import { calculateNewContractDate } from '../utils/date.utils';
```

### В UI компонентах:
```typescript
import { PurchasePlanItem } from '../types/purchase-plan-items.types';
import { formatBudget } from '../utils/currency.utils';
```
