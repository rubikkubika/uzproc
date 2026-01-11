#!/bin/bash
cd "$(dirname "$0")/.."

# Остановка процессов
lsof -ti:8080,3000 2>/dev/null | xargs -r kill -9 2>/dev/null

# Восстановление БД
BACKUP=$(ls -t backup/uzproc_backup_*.sql 2>/dev/null | head -1)
if [ -n "$BACKUP" ]; then
  docker exec -i uzproc-postgres psql -U uzproc_user -d postgres -c "DROP DATABASE IF EXISTS uzproc;" -c "CREATE DATABASE uzproc WITH ENCODING='UTF8' LC_COLLATE='ru_RU.UTF-8' LC_CTYPE='ru_RU.UTF-8' TEMPLATE=template0;" >/dev/null
  docker exec -i uzproc-postgres psql -U uzproc_user -d uzproc < "$BACKUP" >/dev/null 2>&1
  echo "✓ БД восстановлена"
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
