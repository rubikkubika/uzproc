#!/bin/bash
# Ручной запуск обновления снапшота ЭТП (b2biz.uz) — обёртка над frontend/scripts/etp-sync.mjs.
# Обычно обновление запускается кнопкой на странице ЭТП; скрипт — для отладки и --dry-run.
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
# Данные пишутся в ETP_DATA_DIR (по умолчанию frontend/etp-data). Лог каждого запуска
# и статус синхронизации ведёт сам etp-sync.mjs: <ETP_DATA_DIR>/logs, хранятся последние 5.

set -o pipefail
cd "$(dirname "$0")/.."

SNAPSHOT="${ETP_DATA_DIR:-frontend/etp-data}/data.json"

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
  BEFORE_COUNT=$(node -e "try{const d=require(require('path').resolve('$SNAPSHOT'));console.log((d.procedures||[]).length)}catch{console.log(0)}" 2>/dev/null || echo 0)
fi

# 4. Запуск синхронизации (лог и статус пишет сам скрипт)
echo "Запуск обновления снапшота ЭТП"
echo "----------------------------------------------------------"

node frontend/scripts/etp-sync.mjs "$@"
EXIT_CODE=$?

echo "----------------------------------------------------------"

# 5. Итог
if [ "$EXIT_CODE" -ne 0 ]; then
  echo "✗ Обновление снапшота завершилось с ошибкой (код ${EXIT_CODE})."
  exit "$EXIT_CODE"
fi

if [[ " $* " == *" --dry-run "* ]]; then
  echo "✓ Проверка завершена (--dry-run): снапшот не изменён, процедур в снапшоте: ${BEFORE_COUNT}"
  exit 0
fi

AFTER_COUNT=0
if [ -f "$SNAPSHOT" ]; then
  AFTER_COUNT=$(node -e "try{const d=require(require('path').resolve('$SNAPSHOT'));console.log((d.procedures||[]).length)}catch{console.log(0)}" 2>/dev/null || echo 0)
fi

echo "✓ Снапшот ЭТП обновлён: процедур было ${BEFORE_COUNT}, стало ${AFTER_COUNT}"
echo "  Файл: ${SNAPSHOT}"
