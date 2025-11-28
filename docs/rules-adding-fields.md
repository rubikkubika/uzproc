# Правила добавления полей для обработки из Excel

Этот документ описывает процесс добавления новых полей в сущность `PurchaseRequest` и их обработки из Excel файлов.

## Шаги для добавления нового поля

### 1. Добавление поля в сущность PurchaseRequest

**Файл:** `backend/src/main/java/com/uzproc/backend/entity/PurchaseRequest.java`

- Добавить поле с соответствующими аннотациями JPA:
  ```java
  @Column(name = "field_name", length = 255)  // для String полей
  private String fieldName;
  
  @Column(name = "field_name")
  private Long fieldName;  // для Long полей
  
  @Column(name = "field_name")
  private LocalDateTime fieldName;  // для дат
  ```

- Добавить геттер и сеттер в конец класса:
  ```java
  public String getFieldName() {
      return fieldName;
  }

  public void setFieldName(String fieldName) {
      this.fieldName = fieldName;
  }
  ```

### 2. Создание миграции базы данных

**Файл:** `backend/src/main/resources/db/migration/V{N}__Add_field_name.sql`

Создать новую миграцию Flyway с номером версии больше последней существующей:

```sql
ALTER TABLE purchase_requests
    ADD COLUMN field_name VARCHAR(255);  -- для String
    -- или
    ADD COLUMN field_name BIGINT;  -- для Long
    -- или
    ADD COLUMN field_name TIMESTAMP;  -- для LocalDateTime
```

**Важно:** Номер версии `V{N}` должен быть последовательным (например, если последняя миграция `V6`, то следующая будет `V7`).

### 3. Обновление EntityExcelLoadService

**Файл:** `backend/src/main/java/com/uzproc/backend/service/EntityExcelLoadService.java`

#### 3.1. Добавление константы для названия колонки

В начале класса добавить константу с точным названием колонки из Excel:

```java
private static final String FIELD_NAME_COLUMN = "Название колонки в Excel";
```

#### 3.2. Поиск колонки в Excel

В методе `loadPurchaseRequestsFromExcel` после поиска других колонок добавить:

```java
Integer fieldNameColumnIndex = findColumnIndex(columnIndexMap, FIELD_NAME_COLUMN);
```

**Примечание:** Если поле необязательное, можно добавить логирование:

```java
if (fieldNameColumnIndex != null) {
    logger.info("Found field name column at index {}", fieldNameColumnIndex);
} else {
    logger.info("Field name column not found, will skip this field");
}
```

#### 3.3. Обновление вызова parsePurchaseRequestRow

В методе `loadPurchaseRequestsFromExcel` обновить вызов метода парсинга:

```java
PurchaseRequest pr = parsePurchaseRequestRow(row, requestNumberColumnIndex, creationDateColumnIndex, innerIdColumnIndex, fieldNameColumnIndex);
```

#### 3.4. Обновление метода parsePurchaseRequestRow

Добавить параметр `Integer fieldNameColumnIndex` в сигнатуру метода и добавить парсинг:

```java
private PurchaseRequest parsePurchaseRequestRow(Row row, int requestNumberColumnIndex, int creationDateColumnIndex, Integer innerIdColumnIndex, Integer fieldNameColumnIndex) {
    // ... существующий код ...
    
    // Парсинг нового поля (опционально, если колонка может отсутствовать)
    if (fieldNameColumnIndex != null) {
        Cell fieldNameCell = row.getCell(fieldNameColumnIndex);
        String fieldName = getCellValueAsString(fieldNameCell);
        if (fieldName != null && !fieldName.trim().isEmpty()) {
            pr.setFieldName(fieldName.trim());
        }
    }
    
    return pr;
}
```

**Для разных типов данных:**

- **String:** Использовать `getCellValueAsString(cell)` и `trim()`
- **Long:** Использовать `parseLongCell(cell)` (уже есть в сервисе)
- **LocalDateTime:** Использовать `parseDateCell(cell)` (уже есть в сервисе)

#### 3.5. Обновление метода updatePurchaseRequestFields

Добавить логику обновления нового поля только если оно отличается:

```java
private boolean updatePurchaseRequestFields(PurchaseRequest existing, PurchaseRequest newData) {
    boolean updated = false;
    
    // ... существующая логика ...
    
    // Обновление нового поля только если оно отличается
    if (newData.getFieldName() != null && !newData.getFieldName().trim().isEmpty()) {
        if (existing.getFieldName() == null || !existing.getFieldName().equals(newData.getFieldName())) {
            existing.setFieldName(newData.getFieldName());
            updated = true;
            logger.debug("Updated fieldName for request {}: {}", existing.getIdPurchaseRequest(), newData.getFieldName());
        }
    }
    
    return updated;
}
```

**Для разных типов данных:**

- **String:** Проверка на `null` и `isEmpty()`, сравнение через `equals()`
- **Long:** Проверка на `null`, сравнение через `equals()`
- **LocalDateTime:** Проверка на `null`, сравнение через `equals()`

### 4. Перезапуск бэкенда

После всех изменений необходимо перезапустить бэкенд для применения миграций и обновлений кода.

## Примеры

### Пример 1: Добавление строкового поля (innerId)

1. **Сущность:**
   ```java
   @Column(name = "inner_id", length = 255)
   private String innerId;
   ```

2. **Миграция:**
   ```sql
   ALTER TABLE purchase_requests
       ADD COLUMN inner_id VARCHAR(255);
   ```

3. **Константа:**
   ```java
   private static final String INNER_ID_COLUMN = "Внутренний номер";
   ```

4. **Парсинг:**
   ```java
   if (innerIdColumnIndex != null) {
       Cell innerIdCell = row.getCell(innerIdColumnIndex);
       String innerId = getCellValueAsString(innerIdCell);
       if (innerId != null && !innerId.trim().isEmpty()) {
           pr.setInnerId(innerId.trim());
       }
   }
   ```

### Пример 2: Добавление числового поля (idPurchaseRequest)

1. **Сущность:**
   ```java
   @Column(name = "id_purchase_request")
   private Long idPurchaseRequest;
   ```

2. **Миграция:**
   ```sql
   ALTER TABLE purchase_requests
       ADD COLUMN id_purchase_request BIGINT;
   ```

3. **Парсинг:**
   ```java
   Cell requestNumberCell = row.getCell(requestNumberColumnIndex);
   Long requestNumber = parseLongCell(requestNumberCell);
   if (requestNumber != null) {
       pr.setIdPurchaseRequest(requestNumber);
   }
   ```

### Пример 3: Добавление поля даты (purchaseRequestCreationDate)

1. **Сущность:**
   ```java
   @Column(name = "purchase_request_creation_date")
   private LocalDateTime purchaseRequestCreationDate;
   ```

2. **Миграция:**
   ```sql
   ALTER TABLE purchase_requests
       ADD COLUMN purchase_request_creation_date TIMESTAMP;
   ```

3. **Парсинг:**
   ```java
   Cell creationDateCell = row.getCell(creationDateColumnIndex);
   LocalDateTime creationDate = parseDateCell(creationDateCell);
   if (creationDate != null) {
       pr.setPurchaseRequestCreationDate(creationDate);
   }
   ```

## Важные замечания

1. **Порядок миграций:** Всегда проверяйте номер последней миграции перед созданием новой
2. **Обязательные vs опциональные поля:** Если поле опциональное, используйте `Integer` для индекса колонки и проверяйте на `null`
3. **Логирование:** Добавляйте логирование для отладки поиска колонок и парсинга значений
4. **Обновление существующих записей:** Метод `updatePurchaseRequestFields` обновляет только измененные поля, что предотвращает лишние обновления в БД
5. **Кодировка:** Метод `findColumnIndex` уже обрабатывает проблемы с кодировкой для кириллических названий колонок

## Проверка

После добавления поля проверьте:

1. ✅ Миграция выполнилась успешно (проверить логи бэкенда)
2. ✅ Колонка найдена в Excel (проверить логи при загрузке)
3. ✅ Значения парсятся корректно (проверить данные в БД)
4. ✅ Обновление работает (повторная загрузка обновляет только измененные поля)

