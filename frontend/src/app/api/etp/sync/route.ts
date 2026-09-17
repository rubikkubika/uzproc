import { NextResponse } from 'next/server';
import { canSyncEtp, getEtpUser } from '../_lib/etp-auth';
import { readSyncStatus } from '../_lib/etp-sync-status';
import { startEtpSync } from '../_lib/etp-sync-runner';

export const dynamic = 'force-dynamic';

/** Текущий статус обновления ЭТП (только admin) */
export async function GET() {
  const user = await getEtpUser();
  if (!canSyncEtp(user)) {
    return NextResponse.json({ error: 'Недостаточно прав' }, { status: user ? 403 : 401 });
  }
  return NextResponse.json(await readSyncStatus(), { headers: { 'Cache-Control': 'no-store' } });
}

/** Запуск обновления ЭТП с b2biz.uz (только admin). 202 — запущено, 409 — уже идёт. */
export async function POST() {
  const user = await getEtpUser();
  if (!canSyncEtp(user)) {
    return NextResponse.json({ error: 'Недостаточно прав' }, { status: user ? 403 : 401 });
  }

  const result = await startEtpSync(user?.sub || 'admin');
  if (result.started) {
    return NextResponse.json({ started: true, status: result.status }, { status: 202 });
  }
  if (result.reason === 'running') {
    return NextResponse.json(
      { started: false, status: result.status, error: 'Обновление уже выполняется' },
      { status: 409 }
    );
  }
  return NextResponse.json(
    { started: false, status: result.status, error: result.error },
    { status: 500 }
  );
}
