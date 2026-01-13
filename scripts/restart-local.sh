#!/bin/bash
cd "$(dirname "$0")/.."

# Остановка процессов
lsof -ti:8080,3000 2>/dev/null | xargs -r kill -9 2>/dev/null

# Попытка скопировать бэкап с сервера (с коротким таймаутом, так как не всегда сервер доступен)
SERVER="devops@10.123.48.62"
REMOTE_BACKUP_PATH="/home/devops/uzproc/backup"
LOCAL_BACKUP_DIR="backup"

echo "Попытка скопировать бэкап с сервера..."
mkdir -p "$LOCAL_BACKUP_DIR" 2>/dev/null

# Пытаемся найти последний бэкап на сервере и скопировать его (таймаут 5 секунд)
# Используем ConnectTimeout для ограничения времени ожидания, так как timeout может быть недоступен на macOS
LATEST_BACKUP=$(ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$SERVER" "ls -t ${REMOTE_BACKUP_PATH}/uzproc_backup_*.sql 2>/dev/null | head -1" 2>/dev/null)

if [ -n "$LATEST_BACKUP" ]; then
  BACKUP_FILENAME=$(basename "$LATEST_BACKUP")
  echo "Найден бэкап на сервере: $BACKUP_FILENAME"
  
  # Копируем бэкап с сервера (таймаут 10 секунд через ConnectTimeout)
  if scp -o ConnectTimeout=10 -o StrictHostKeyChecking=no "${SERVER}:${LATEST_BACKUP}" "${LOCAL_BACKUP_DIR}/${BACKUP_FILENAME}" 2>/dev/null; then
    if [ -f "${LOCAL_BACKUP_DIR}/${BACKUP_FILENAME}" ]; then
      BACKUP_SIZE=$(du -h "${LOCAL_BACKUP_DIR}/${BACKUP_FILENAME}" | cut -f1)
      echo "✓ Бэкап скопирован с сервера: ${BACKUP_FILENAME} (${BACKUP_SIZE})"
    else
      echo "⚠ Не удалось скопировать бэкап с сервера, используем локальный"
    fi
  else
    echo "⚠ Сервер недоступен или таймаут, используем локальный бэкап"
  fi
else
  echo "⚠ Бэкап на сервере не найден или сервер недоступен, используем локальный"
fi

# Восстановление БД из последнего доступного бэкапа
BACKUP=$(ls -t backup/uzproc_backup_*.sql 2>/dev/null | head -1)
if [ -n "$BACKUP" ]; then
  echo "Восстановление БД из: $(basename "$BACKUP")"
  docker exec -i uzproc-postgres psql -U uzproc_user -d postgres -c "DROP DATABASE IF EXISTS uzproc;" -c "CREATE DATABASE uzproc WITH ENCODING='UTF8' LC_COLLATE='ru_RU.UTF-8' LC_CTYPE='ru_RU.UTF-8' TEMPLATE=template0;" >/dev/null
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
