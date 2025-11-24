# UzProc Backend

Spring Boot приложение для бэкенда UzProc.

## Требования

- Java 17 или выше
- Maven 3.6+ (или используйте Maven Wrapper)

## Локальный запуск

### 1. Запустите PostgreSQL в Docker:

```powershell
docker compose up -d postgres
```

### 2. Запустите приложение:

#### Вариант 1: Через Maven (если установлен)
```powershell
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

#### Вариант 2: Через Maven Wrapper
```powershell
.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local
```

#### Вариант 3: Через IDE
- Откройте проект в IntelliJ IDEA / Eclipse / VS Code
- Запустите класс `UzProcBackendApplication` с профилем `local`

### 3. Проверьте работу:

- Health endpoint: http://localhost:8080/api/health
- Actuator: http://localhost:8080/api/actuator/health

## Профили

- `local` - для локальной разработки (подключается к localhost:5432)
- `default` - для Docker (подключается к postgres:5432)

## База данных

- Host: localhost (для локального запуска)
- Port: 5432
- Database: uzproc
- User: uzproc_user
- Password: uzproc_password

Миграции выполняются автоматически через Liquibase при запуске приложения.

