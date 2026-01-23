#!/bin/bash
cd "$(dirname "$0")/.."

# Остановка процессов
lsof -ti:8080,3000 2>/dev/null | xargs -r kill -9 2>/dev/null

# Попытка создать бэкап на сервере и скопировать его (с коротким таймаутом, так как не всегда сервер доступен)
SERVER="devops@10.123.48.62"
REMOTE_BACKUP_PATH="/home/devops/uzproc/backup"
LOCAL_BACKUP_DIR="backup"

echo "Попытка создать бэкап на сервере и скопировать его..."
mkdir -p "$LOCAL_BACKUP_DIR" 2>/dev/null

# Проверяем, запущен ли контейнер БД на сервере
CONTAINER_CHECK=$(ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$SERVER" "docker ps --filter name=uzproc-postgres --format '{{.Names}}' 2>/dev/null" 2>/dev/null)

if echo "$CONTAINER_CHECK" | grep -q "uzproc-postgres"; then
  echo "Контейнер БД на сервере запущен, создаем бэкап..."
  
  # Создаем имя файла бэкапа с датой и временем
  BACKUP_DATE=$(date +"%Y-%m-%d_%H-%M-%S")
  BACKUP_FILENAME="uzproc_backup_${BACKUP_DATE}.sql"
  
  # Создаем папку backup на сервере, если её нет
  ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$SERVER" "mkdir -p ${REMOTE_BACKUP_PATH}" 2>/dev/null
  
  # Создаем бэкап БД через pg_dump внутри контейнера
  # Используем timeout, если доступен, иначе используем альтернативный подход
  BACKUP_COMMAND="if command -v timeout >/dev/null 2>&1; then timeout 60 bash -c 'docker exec uzproc-postgres pg_dump -U uzproc_user -d uzproc -F p > ${REMOTE_BACKUP_PATH}/${BACKUP_FILENAME} 2>&1'; else docker exec uzproc-postgres pg_dump -U uzproc_user -d uzproc -F p > ${REMOTE_BACKUP_PATH}/${BACKUP_FILENAME} 2>&1; fi"
  
  BACKUP_RESULT=$(ssh -o ConnectTimeout=10 -o ServerAliveInterval=5 -o ServerAliveCountMax=2 -o StrictHostKeyChecking=no "$SERVER" "$BACKUP_COMMAND" 2>&1)
  
  # Проверяем, что бэкап создан и не пустой
  BACKUP_CHECK=$(ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$SERVER" "test -f ${REMOTE_BACKUP_PATH}/${BACKUP_FILENAME} && test -s ${REMOTE_BACKUP_PATH}/${BACKUP_FILENAME} && echo 'OK' || echo 'FAIL'" 2>/dev/null)
  
  if [ "$BACKUP_CHECK" = "OK" ]; then
    echo "✓ Бэкап создан на сервере: ${BACKUP_FILENAME}"
    
    # Копируем бэкап с сервера (таймаут 30 секунд через ConnectTimeout, так как файл может быть большим)
    if scp -o ConnectTimeout=30 -o StrictHostKeyChecking=no "${SERVER}:${REMOTE_BACKUP_PATH}/${BACKUP_FILENAME}" "${LOCAL_BACKUP_DIR}/${BACKUP_FILENAME}" 2>/dev/null; then
      if [ -f "${LOCAL_BACKUP_DIR}/${BACKUP_FILENAME}" ]; then
        BACKUP_SIZE=$(du -h "${LOCAL_BACKUP_DIR}/${BACKUP_FILENAME}" | cut -f1)
        echo "✓ Бэкап скопирован с сервера: ${BACKUP_FILENAME} (${BACKUP_SIZE})"
        
        # Удаляем старые бэкапы, оставляя только последние 5
        echo "Очистка старых бэкапов (оставляем последние 5)..."
        BACKUP_COUNT=$(ls -1 "${LOCAL_BACKUP_DIR}"/uzproc_backup_*.sql 2>/dev/null | wc -l)
        if [ "$BACKUP_COUNT" -gt 5 ]; then
          # Удаляем самые старые бэкапы
          ls -t "${LOCAL_BACKUP_DIR}"/uzproc_backup_*.sql 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null
          REMAINING=$(ls -1 "${LOCAL_BACKUP_DIR}"/uzproc_backup_*.sql 2>/dev/null | wc -l)
          echo "✓ Удалены старые бэкапы, осталось: ${REMAINING}"
        else
          echo "✓ Количество бэкапов в норме: ${BACKUP_COUNT}"
        fi
        
        # Удаляем бэкап с сервера после успешного копирования
        echo "Удаление бэкапа с сервера..."
        ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$SERVER" "rm -f ${REMOTE_BACKUP_PATH}/${BACKUP_FILENAME}" 2>/dev/null
        echo "✓ Бэкап удален с сервера"
      else
        echo "⚠ Не удалось скопировать бэкап с сервера, используем локальный"
      fi
    else
      echo "⚠ Не удалось скопировать бэкап с сервера (таймаут или ошибка), используем локальный"
      # Удаляем бэкап с сервера, если копирование не удалось
      ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$SERVER" "rm -f ${REMOTE_BACKUP_PATH}/${BACKUP_FILENAME}" 2>/dev/null
    fi
  else
    echo "⚠ Не удалось создать бэкап на сервере, используем локальный"
  fi
else
  echo "⚠ Контейнер БД на сервере не запущен или сервер недоступен, используем локальный бэкап"
fi

# Восстановление БД из последнего доступного бэкапа
BACKUP=$(ls -t backup/uzproc_backup_*.sql 2>/dev/null | head -1)
if [ -n "$BACKUP" ]; then
  echo "Восстановление БД из: $(basename "$BACKUP")"
  # Закрываем все активные соединения с базой данных
  echo "Закрытие активных соединений с БД..."
  docker exec -i uzproc-postgres psql -U uzproc_user -d postgres -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = 'uzproc' AND pid <> pg_backend_pid();" >/dev/null 2>&1
  sleep 1
  # Удаляем и пересоздаем базу данных
  docker exec -i uzproc-postgres psql -U uzproc_user -d postgres -c "DROP DATABASE IF EXISTS uzproc;" >/dev/null 2>&1
  docker exec -i uzproc-postgres psql -U uzproc_user -d postgres -c "CREATE DATABASE uzproc WITH ENCODING='UTF8' LC_COLLATE='ru_RU.UTF-8' LC_CTYPE='ru_RU.UTF-8' TEMPLATE=template0;" >/dev/null
  docker exec -i uzproc-postgres psql -U uzproc_user -d uzproc < "$BACKUP" >/dev/null 2>&1
  echo "✓ БД восстановлена"
else
  echo "⚠ Локальный бэкап не найден, БД не восстановлена"
fi

# Запуск сервисов
ROOT=$(pwd)
(cd "$ROOT/backend" && mvn spring-boot:run -Dspring-boot.run.profiles=local -q) &
(cd "$ROOT/frontend" && npm run dev) &

# Ожидание готовности
for i in {1..30}; do
  sleep 2
  BE=$(curl -s http://localhost:8080/api/health 2>/dev/null | grep -c UP)
  FE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null)
  [ "$BE" = "1" ] && [ "$FE" = "307" -o "$FE" = "200" ] && echo "✓ Backend: UP | Frontend: Ready" && exit 0
done
echo "⚠ Таймаут"
