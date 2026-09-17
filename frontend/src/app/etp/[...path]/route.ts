import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { Readable } from 'stream';
import { NextResponse } from 'next/server';
import { canViewEtp, getEtpUser } from '@/app/api/etp/_lib/etp-auth';
import { resolveEtpFilePath } from '@/app/api/etp/_lib/etp-paths';
import { getEtpMimeType } from '@/app/api/etp/_lib/etp-mime';

export const dynamic = 'force-dynamic';

/**
 * Данные ЭТП из каталога ETP_DATA_DIR: /etp/data.json и /etp/{files,participant-files,reports}/<файл>.
 * Файлы лежат вне public, потому что обновляются после сборки (кнопкой и при деплое).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const user = await getEtpUser();
  if (!canViewEtp(user)) {
    return NextResponse.json({ error: 'Недостаточно прав' }, { status: user ? 403 : 401 });
  }

  const { path: segments } = await params;
  const filePath = resolveEtpFilePath(segments);
  if (!filePath) {
    return NextResponse.json({ error: 'Не найдено' }, { status: 404 });
  }

  let size: number;
  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error('not a file');
    size = info.size;
  } catch {
    return NextResponse.json({ error: 'Не найдено' }, { status: 404 });
  }

  const isSnapshot = segments[0] === 'data.json';
  const body = Readable.toWeb(createReadStream(filePath)) as ReadableStream<Uint8Array>;
  return new Response(body, {
    headers: {
      'Content-Type': getEtpMimeType(filePath),
      'Content-Length': String(size),
      // Снапшот меняется после обновления — не кэшируем; документы неизменны (имя = guid)
      'Cache-Control': isSnapshot ? 'no-store' : 'private, max-age=86400',
    },
  });
}
