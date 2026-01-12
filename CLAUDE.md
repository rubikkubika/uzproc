# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UzProc is a procurement management system consisting of a Spring Boot backend, Next.js frontend, PostgreSQL database, and Nginx reverse proxy. The system manages purchase requests, purchases, contracts, and procurement plans with Excel import/export capabilities.

## Development Commands

### Frontend (Next.js 16 + React 19 + TypeScript + Tailwind)
```bash
cd frontend
npm run dev        # Start development server (http://localhost:3000)
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
```

### Backend (Spring Boot 3.2 + Java 17 + Maven)
```bash
cd backend
mvn spring-boot:run                                    # Run with default profile (Docker)
mvn spring-boot:run -Dspring-boot.run.profiles=local  # Run with local profile (localhost DB)
mvn clean package                                      # Build JAR
mvn test                                               # Run tests
```

### Database (PostgreSQL 15 in Docker)
```bash
docker compose up -d postgres                          # Start PostgreSQL only
docker exec -i uzproc-postgres psql -U uzproc_user -d uzproc  # Connect to DB
```

### Full Stack (Docker)
```bash
docker compose up -d           # Start all services (postgres, backend, frontend, nginx)
docker compose down            # Stop all services
docker compose logs -f backend # View backend logs
docker compose ps              # Check service status
```

### Local Restart (Перезапуск локально)
```bash
./scripts/restart-local.sh     # Перезапуск backend + frontend + восстановление БД
```

### Deployment
```powershell
.\scripts\deploy-simple.ps1    # Deploy to production server (10.123.48.62)
```

## Architecture

### Backend Structure

**Package Organization:**
- `com.uzproc.backend.entity` - JPA entities (PurchaseRequest, Purchase, Contract, etc.)
- `com.uzproc.backend.repository` - Spring Data JPA repositories
- `com.uzproc.backend.service` - Business logic layer (all logic must be in services, not controllers)
- `com.uzproc.backend.controller` - REST API endpoints (thin layer, delegates to services)
- `com.uzproc.backend.dto` - Data Transfer Objects
- `com.uzproc.backend.config` - Spring configuration
- `com.uzproc.backend.converter` - Entity/DTO converters

**Key Design Patterns:**
- **Service Layer Pattern**: All business logic, database queries (JPA Specifications), filtering, validation, and file processing MUST be in service classes, not controllers
- **Controller Responsibility**: Controllers only handle HTTP concerns (request/response mapping, status codes) and delegate to services
- **Excel Processing**: Separate service methods for each entity type (`loadPurchaseRequestsFromExcel`, `loadPurchasesFromExcel`), using common utility methods for cell parsing
- **Filtering**: All data filtering happens on the backend via JPA Specifications passed as query parameters; pagination applies AFTER filtering

**Database:**
- Flyway migrations in `backend/src/main/resources/db/migration/`
- Schema managed via migrations (never use `ddl-auto: create` or `update`)
- Russian locale support for PostgreSQL (`ru_RU.UTF-8`)

**API Endpoints:**
- Base path: `/api`
- Health check: `/api/health`
- All endpoints return JSON
- Backend runs on port 8080 (exposed through Nginx on port 80 in production)

### Frontend Structure

**Next.js App Router:**
- `frontend/src/app/page.tsx` - Main dashboard
- `frontend/src/app/login/page.tsx` - Login page
- `frontend/src/app/purchase-request/[id]/page.tsx` - Purchase request detail
- `frontend/src/app/purchase/[id]/page.tsx` - Purchase detail
- `frontend/src/app/public-plan/page.tsx` - Public procurement plan view
- `frontend/src/app/delivery-plan/page.tsx` - Delivery plan view
- `frontend/src/components/` - Reusable React components (tables, charts, forms)
- `frontend/src/utils/` - Utility functions

**Key Components:**
- Table components: `PurchaseRequestsTable`, `PurchasesTable`, `ContractsTable`, etc.
- Charts: `MonthlyPurchasesChart`, `CategoryChart`, `SupplierChart`, etc.
- Forms: `CSIForm`, `UploadCSV`
- All tables must include filters and sorting in column headers
- Tables standardized on `PurchaseRequestsTable` style (see .cursorrules section on "Стандартизация таблиц")

**Styling:**
- Tailwind CSS 4
- Standard table styles: gray borders, white background, consistent padding (`px-2 py-2`)
- Dark text in inputs: always use `text-gray-900` or `text-black` with `bg-white`

### Database Schema

**Core Entities:**
- `purchase_requests` - Purchase requests (заявки на закупку)
- `purchases` - Purchases (закупки)
- `contracts` - Contracts (договоры)
- `purchase_plan_items` - Procurement plan items (позиции плана закупок)
- `purchase_plan_versions` - Procurement plan versions
- `purchase_request_approvals` - Approval workflows
- `cfos` - Cost centers (ЦФО)
- `companies` - Companies
- `users` - User accounts

### Excel Import/Export

**Excel Loading:**
- Service: `ExcelStreamingRowHandler`, `EntityExcelLoadService`
- Each entity type has its own loading method (e.g., `loadPurchaseRequestsFromExcel()`)
- Column mapping via constants (e.g., `INNER_ID_COLUMN = "ID заявки"`)
- Update existing records if found by ID, create new otherwise
- Use utility methods: `getCellValueAsString()`, `parseLongCell()`, `parseDateCell()`, `parseBooleanCell()`

**Adding New Fields:**
1. Add constant for Excel column name
2. Use `findColumnIndex()` to locate column
3. Parse value using appropriate utility method
4. Update entity setter
5. Add update logic in `updateEntityFields()` method
6. Follow existing patterns for similar field types

### Important Development Rules (from .cursorrules)

**Backend Development:**
- **ALWAYS create a service before creating a controller** - controllers must be thin and delegate to services
- All business logic, JPA Specifications, filtering, validation in services
- Controllers only handle HTTP request/response mapping
- Use `@Transactional(readOnly = true)` for read operations
- Separate methods for parsing each entity type from Excel
- All filtering on backend, not client (except for computed fields not in DB)

**Frontend Development:**
- Filter inputs must preserve focus during typing (use `data-filter-field`, `focusedField` state, debounce with focus restoration)
- Every table column should have a filter (text input or select)
- Table styling must match `PurchaseRequestsTable` standard unless explicitly requested otherwise
- Input fields must use dark text: `text-gray-900 bg-white`

**Local Development Workflow:**
- PostgreSQL always runs in Docker (`docker compose up -d postgres`)
- Backend and frontend run locally (not in Docker) for development
- Auto-restore DB from latest backup (`backup/uzproc_backup_*.sql`) before local backend restart
- Use Git Bash commands (not PowerShell) for terminal operations when on Windows

**Deployment:**
- Run `.\scripts\deploy-simple.ps1` to deploy to production
- Script builds Docker images, transfers to server, updates containers
- NEVER auto-commit changes during deployment unless explicitly requested
- Clean old Docker images on server before deploying to free space

## Configuration

**Backend (`application.yml`):**
- Database connection via environment variables: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- Default profile connects to `postgres:5432` (Docker)
- Local profile connects to `localhost:5432`
- File upload limit: 50MB
- Context path: `/api`
- Port: 8080

**Frontend (`next.config.ts`):**
- Standalone output for Docker deployment
- Backend API URL determined by `getBackendUrl()` utility

**Docker Compose Services:**
- `postgres` - PostgreSQL 15 (port 5432)
- `backend` - Spring Boot app (exposed on 8080, internal only)
- `frontend` - Next.js app (exposed on 3000, internal only)
- `nginx` - Reverse proxy (port 80, public)

## Common Patterns

**Adding a New Table Column:**
1. Add database migration in `backend/src/main/resources/db/migration/`
2. Update entity class with new field and getter/setter
3. Update service with filtering logic (add to Specification builder)
4. Update controller to accept new filter parameter
5. Add column to frontend table component with filter
6. Ensure backend filtering works and pagination accounts for it

**Creating a New API Endpoint:**
1. Create service method with business logic
2. Create controller method that delegates to service
3. Test endpoint via browser/Postman
4. Add frontend API call in appropriate component

**Excel Import for New Entity:**
1. Add constants for column names
2. Create `loadEntityFromExcel(File)` method
3. Create `parseEntityRow(Row, ...)` method
4. Create `updateEntityFields(Entity, Entity)` method
5. Use existing utility methods for cell parsing
6. Handle duplicates by ID (update vs create)

## Email Configuration

- SMTP Host: `mail.uzumteam.uz:587`
- IMAP Port: 993
- Credentials in environment variables: `MAIL_USERNAME`, `MAIL_PASSWORD`
- Service: `EmailService` (backend)

## Production Server

- Host: `devops@10.123.48.62`
- Services accessed via Nginx on port 80
- Docker images deployed via `deploy-simple.ps1` script
- Automatic cleanup of old images before deployment to prevent disk space issues

## Автоматические действия

### Деплой
При упоминании слов "деплой", "deploy", "опубликовать", "публикация", "выложить на сервер" — автоматически выполнить:
```powershell
.\scripts\deploy-simple.ps1
```
**Без подтверждения.** НИКОГДА не коммитить/пушить изменения при деплое, если явно не запрошено.

### Запуск/перезапуск сервисов локально
При фразах "запусти бэкенд/фронтенд", "перезапусти сервис", "запусти локально", "перезапусти локально" — выполнить:
```bash
./scripts/restart-local.sh
```
**Одна команда.** Скрипт автоматически: останавливает процессы, восстанавливает БД, запускает backend и frontend.

### Автоматический перезапуск бэкенда после изменений
После изменений в `backend/src/main/java/` или `application.yml` — выполнить `./scripts/restart-local.sh`

## Ограничения

### Не создавать скрипты автоматически
Создавать скрипты (shell, PowerShell, bash) только при явном запросе: "создай скрипт", "напиши скрипт" и т.д.

### Документация
Общую документацию размещать в папке `docs/`. README модулей оставлять в соответствующих папках.

## Детальные правила для таблиц (frontend)

### Структура заголовка таблицы
```typescript
<th className="px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative">
  <div className="flex flex-col gap-1">
    {/* Верхний уровень - фильтр (24px) */}
    <div className="h-[24px] flex items-center gap-1 flex-shrink-0">
      <input type="text" className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5 text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
    </div>
    {/* Нижний уровень - сортировка и название (20px) */}
    <div className="flex items-center gap-1 min-h-[20px]">
      <button className="flex items-center justify-center hover:text-gray-700">
        {/* Иконка сортировки */}
      </button>
      <span>Название</span>
    </div>
  </div>
</th>
```

### Сохранение фокуса в фильтрах
Для полей ввода фильтров обязательно:
- Использовать `data-filter-field` атрибут
- Отслеживать `focusedField` состояние
- Восстанавливать фокус и позицию курсора после debounce
- Использовать `requestAnimationFrame` для восстановления позиции курсора

```typescript
const [focusedField, setFocusedField] = useState<string | null>(null);

<input
  data-filter-field={field}
  onFocus={() => setFocusedField(field)}
  onChange={(e) => {
    const cursorPos = e.target.selectionStart || 0;
    // ... обновление значения
    requestAnimationFrame(() => {
      e.target.setSelectionRange(cursorPos, cursorPos);
    });
  }}
/>
```

### Обязательные правила для таблиц
- Каждый столбец должен иметь фильтр
- Фильтрация на бэкенде (не на клиенте)
- Пагинация применяется ПОСЛЕ фильтрации
- Стили ячеек: `px-2 py-2 text-xs text-gray-900 border-r border-gray-300`
- Для полей ввода: `text-gray-900 bg-white`

## Структура компонентов фронтенда

**КРИТИЧЕСКИ ВАЖНО:** При создании новых элементов фронтенда (таблицы, формы, страницы и т.д.) **ОБЯЗАТЕЛЬНО** нужно раскладывать все по отдельным компонентам, следуя структуре плана закупок (`purchase-plan/_components`).

### Правила организации компонентов:

1. **Основная структура папок:**
   ```
   app/[feature]/_components/
   ├── [Feature]Table.tsx              # Главный компонент (интегрирует все остальные)
   ├── hooks/                          # Кастомные хуки
   │   ├── use[Feature]Table.ts        # Главный хук, композирующий остальные
   │   ├── use[Feature]Filters.ts      # Хук для фильтров
   │   ├── use[Feature]Columns.ts      # Хук для колонок
   │   ├── use[Feature]Editing.ts      # Хук для редактирования
   │   ├── use[Feature]Data.ts         # Хук для данных
   │   └── use[Feature]Modals.ts       # Хук для модальных окон
   ├── ui/                             # UI компоненты
   │   ├── [Feature]TableHeader.tsx   # Заголовок таблицы
   │   ├── [Feature]TableBody.tsx      # Тело таблицы
   │   ├── [Feature]TableRow.tsx       # Строка таблицы
   │   ├── [Feature]TableFilters.tsx  # Фильтры таблицы
   │   └── [Feature]DetailsModal.tsx  # Модальное окно деталей
   ├── filters/                        # Компоненты фильтров
   │   ├── [Field]FilterDropdown.tsx  # Выпадающий список фильтра
   │   └── MultiSelectFilterDropdown.tsx # Базовый компонент для множественного выбора
   ├── types/                          # TypeScript типы
   │   └── [feature].types.ts         # Типы для feature
   ├── utils/                          # Утилиты
   │   ├── [feature].utils.ts         # Общие утилиты
   │   ├── currency.utils.ts          # Утилиты для валют
   │   └── date.utils.ts              # Утилиты для дат
   └── constants/                      # Константы
       └── [feature].constants.ts     # Константы для feature
   ```

2. **Разделение ответственности:**
   - **Главный компонент** (`[Feature]Table.tsx`): только интеграция хуков и UI компонентов, минимальная логика
   - **Хуки**: вся бизнес-логика, состояние, обработчики событий
   - **UI компоненты**: только отображение, получают данные и обработчики через пропсы
   - **Фильтры**: отдельные компоненты для каждого типа фильтра
   - **Утилиты**: переиспользуемые функции без состояния
   - **Типы**: TypeScript интерфейсы и типы
   - **Константы**: конфигурация, значения по умолчанию

3. **Пример структуры (план закупок):**
   ```
   purchase-plan/_components/
   ├── PurchasePlanItemsTable.tsx          # Главный компонент
   ├── hooks/
   │   ├── usePurchasePlanItemsTable.ts    # Главный хук (композирует все)
   │   ├── usePurchasePlanItemsFilters.ts  # Фильтры
   │   ├── usePurchasePlanItemsColumns.ts  # Колонки
   │   ├── usePurchasePlanItemsEditing.ts  # Редактирование
   │   ├── usePurchasePlanItemsData.ts     # Данные
   │   ├── usePurchasePlanItemsModals.ts   # Модальные окна
   │   └── usePurchasePlanItemsVersions.ts # Версии
   ├── ui/
   │   ├── PurchasePlanItemsTableHeader.tsx
   │   ├── PurchasePlanItemsTableBody.tsx
   │   ├── PurchasePlanItemsTableRow.tsx
   │   ├── PurchasePlanItemsTableFilters.tsx
   │   └── PurchasePlanItemsDetailsModal.tsx
   ├── filters/
   │   ├── StatusFilterDropdown.tsx
   │   ├── CfoFilterDropdown.tsx
   │   └── MultiSelectFilterDropdown.tsx
   ├── types/
   │   └── purchase-plan-items.types.ts
   ├── utils/
   │   └── purchase-plan-items.utils.ts
   └── constants/
       └── purchase-plan-items.constants.ts
   ```

4. **Правила создания компонентов:**
   - **НЕ создавать монолитные компоненты** - разбивать на отдельные файлы
   - **Каждый хук отвечает за свою область** - фильтры, колонки, редактирование и т.д.
   - **UI компоненты должны быть максимально простыми** - только отображение
   - **Переиспользуемые компоненты** (фильтры, модальные окна) выносить в отдельные файлы
   - **Типы и константы** всегда в отдельных файлах

5. **Что НЕ делать:**
   - ❌ Создавать один большой файл со всей логикой
   - ❌ Смешивать логику и UI в одном компоненте
   - ❌ Дублировать код между компонентами
   - ❌ Хранить типы и константы в компонентах

6. **Что делать:**
   - ✅ Разбивать на отдельные компоненты по функциональности
   - ✅ Выносить логику в хуки
   - ✅ Создавать переиспользуемые UI компоненты
   - ✅ Использовать отдельные файлы для типов и констант
   - ✅ Следовать структуре плана закупок как примеру

**ВАЖНО:** При создании нового функционала всегда использовать эту структуру. Если функционал простой (например, одна форма), можно упростить структуру, но основные принципы разделения должны соблюдаться.
