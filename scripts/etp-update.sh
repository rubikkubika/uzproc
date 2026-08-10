#!/bin/bash
# Запуск обновления снапшота ЭТП (b2biz.uz) — обёртка над scripts/etp-sync.mjs.
#
# Запускать через Git Bash из корня проекта:
#   ./scripts/etp-update.sh                 # инкрементальное обновление
#   ./scripts/etp-update.sh --dry-run       # только показать план, ничего не качать
#   ./scripts/etp-update.sh --full          # перекачать все процедуры
#   ./scripts/etp-update.sh --limit 5       # обработать не более 5 процедур
#   ./scripts/etp-update.sh --only 856-7764 # обработать одну процедуру по коду
#   ./scripts/etp-update.sh --no-files      # без скачивания документов
#
# Учётные данные берутся из .env в корне проекта (B2BIZ_LOGIN, B2BIZ_PASSWORD)
# или из переменных окружения.
#
# Лог каждого запуска пишется в logs/etp-sync-YYYY-MM-DD-HH-mm-ss.log,
# хранятся последние 5 логов (как для бэкапов БД).

set -o pipefail
cd "$(dirname "$0")/.."

LOG_DIR="logs"
MAX_LOGS=5
SNAPSHOT="frontend/public/etp/data.json"

# 1. Проверка Node.js
if ! command -v node >/dev/null 2>&1; then
  echo "✗ Node.js не найден. Установите Node.js 18+ и повторите запуск."
  exit 1
fi

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]" 2>/dev/null)
if [ -n "$NODE_MAJOR" ] && [ "$NODE_MAJOR" -lt 18 ]; then
  echo "✗ Требуется Node.js 18+ (установлен $(node -v))."
  exit 1
fi

# 2. Проверка учётных данных: переменные окружения или .env в корне
if [ -z "$B2BIZ_LOGIN" ] || [ -z "$B2BIZ_PASSWORD" ]; then
  if [ -f .env ] && grep -q "^B2BIZ_LOGIN=" .env && grep -q "^B2BIZ_PASSWORD=" .env; then
    echo "✓ Учётные данные ЭТП взяты из .env"
  else
    echo "✗ Не заданы B2BIZ_LOGIN и B2BIZ_PASSWORD."
    echo "  Добавьте их в .env в корне проекта или передайте в окружении:"
    echo "  B2BIZ_LOGIN=... B2BIZ_PASSWORD=... ./scripts/etp-update.sh"
    exit 1
  fi
else
  echo "✓ Учётные данные ЭТП взяты из окружения"
fi

# 3. Размер снапшота до обновления (для итоговой сводки)
BEFORE_COUNT=0
if [ -f "$SNAPSHOT" ]; then
  BEFORE_COUNT=$(node -e "try{const d=require('./$SNAPSHOT');console.log((d.procedures||[]).length)}catch{console.log(0)}" 2>/dev/null || echo 0)
fi

# 4. Запуск синхронизации с логированием в файл и в консоль
mkdir -p "$LOG_DIR" 2>/dev/null
RUN_DATE=$(date +"%Y-%m-%d-%H-%M-%S")
LOG_FILE="${LOG_DIR}/etp-sync-${RUN_DATE}.log"

echo "Запуск обновления снапшота ЭТП, лог: ${LOG_FILE}"
echo "----------------------------------------------------------"

node scripts/etp-sync.mjs "$@" 2>&1 | tee "$LOG_FILE"
EXIT_CODE=$?

echo "----------------------------------------------------------"

# 5. Очистка старых логов: оставляем последние 5
LOG_COUNT=$(ls -1 "${LOG_DIR}"/etp-sync-*.log 2>/dev/null | wc -l)
if [ "$LOG_COUNT" -gt "$MAX_LOGS" ]; then
  ls -t "${LOG_DIR}"/etp-sync-*.log 2>/dev/null | tail -n +$((MAX_LOGS + 1)) | xargs rm -f 2>/dev/null
  echo "✓ Старые логи удалены, осталось: $(ls -1 "${LOG_DIR}"/etp-sync-*.log 2>/dev/null | wc -l)"
fi

# 6. Итог
if [ "$EXIT_CODE" -ne 0 ]; then
  echo "✗ Обновление снапшота завершилось с ошибкой (код ${EXIT_CODE}). Подробности: ${LOG_FILE}"
  exit "$EXIT_CODE"
fi

if [[ " $* " == *" --dry-run "* ]]; then
  echo "✓ Проверка завершена (--dry-run): снапшот не изменён, процедур в снапшоте: ${BEFORE_COUNT}"
  echo "  Лог: ${LOG_FILE}"
  exit 0
fi

AFTER_COUNT=0
if [ -f "$SNAPSHOT" ]; then
  AFTER_COUNT=$(node -e "try{const d=require('./$SNAPSHOT');console.log((d.procedures||[]).length)}catch{console.log(0)}" 2>/dev/null || echo 0)
fi

echo "✓ Снапшот ЭТП обновлён: процедур было ${BEFORE_COUNT}, стало ${AFTER_COUNT}"
echo "  Файл: ${SNAPSHOT}"
echo "  Лог:  ${LOG_FILE}"
