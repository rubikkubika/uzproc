import path from 'path';

/** Разделы каталога данных ЭТП, которые можно отдавать по /etp/<раздел>/<файл> */
const FILE_SECTIONS = new Set(['files', 'participant-files', 'reports']);

/** Имя файла: guid/код + расширение, без подкаталогов и «..» */
const SAFE_FILE_NAME = /^[\w-]+(\.[\w-]+)*$/;

/**
 * Каталог данных ЭТП. На проде — том /app/etp-data (docker-compose),
 * локально — frontend/etp-data.
 */
export function getEtpDataDir(): string {
  return path.resolve(process.env.ETP_DATA_DIR || path.join(process.cwd(), 'etp-data'));
}

export function getEtpStatusPath(): string {
  return path.join(getEtpDataDir(), 'sync-status.json');
}

/** Скрипт синхронизации: frontend/scripts локально, /app/scripts в Docker-образе */
export function getEtpSyncScriptPath(): string {
  return path.join(process.cwd(), 'scripts', 'etp-sync.mjs');
}

/**
 * Путь к файлу ЭТП по сегментам URL /etp/...
 * Разрешены только data.json и файлы из files/, participant-files/, reports/.
 * @returns абсолютный путь или null, если запрос не разрешён
 */
export function resolveEtpFilePath(segments: string[]): string | null {
  const dataDir = getEtpDataDir();
  let relative: string | null = null;

  if (segments.length === 1 && segments[0] === 'data.json') {
    relative = 'data.json';
  } else if (
    segments.length === 2 &&
    FILE_SECTIONS.has(segments[0]) &&
    SAFE_FILE_NAME.test(segments[1])
  ) {
    relative = path.join(segments[0], segments[1]);
  }
  if (!relative) return null;

  const absolute = path.resolve(dataDir, relative);
  return absolute.startsWith(dataDir + path.sep) ? absolute : null;
}
