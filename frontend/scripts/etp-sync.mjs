#!/usr/bin/env node
/**
 * Инкрементальное обновление снапшота ЭТП (b2biz.uz).
 *
 * Качает только то, что изменилось:
 *  - список процедур тянется целиком (один дешёвый запрос);
 *  - детали процедуры перекачиваются только если она новая, сменила статус/дедлайн
 *    или в прошлом снапшоте была незавершённой (не complete);
 *  - файлы, файлы КП и отчёты скачиваются только те, которых нет на диске.
 *
 * Запуск (Git Bash):
 *   B2BIZ_LOGIN=... B2BIZ_PASSWORD=... node scripts/etp-sync.mjs --dry-run
 *   B2BIZ_LOGIN=... B2BIZ_PASSWORD=... node scripts/etp-sync.mjs
 *
 * Флаги:
 *   --dry-run      только показать план обновления, ничего не качать и не писать
 *   --full         перекачать все процедуры, игнорируя дифф
 *   --limit N      обработать не более N процедур (для проверки)
 *   --only CODE    обработать только процедуру с указанным кодом (например 856-7764)
 *   --no-files     не скачивать документы (только data.json)
 *   --probe GUID   сохранить сырые ответы API по одной процедуре в etp/probe-<guid>.json
 */

import { readFile, writeFile, rename, mkdir, access, readdir } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ─────────────────────────────── Конфигурация ───────────────────────────────

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Подхватываем переменные из .env в корне проекта (значения из окружения имеют приоритет). */
async function loadDotEnv() {
  try {
    const raw = await readFile(path.join(ROOT, '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m) continue;
      const [, key, value] = m;
      if (process.env[key] === undefined) {
        process.env[key] = value.replace(/^["']|["']$/g, '');
      }
    }
  } catch {
    // .env не обязателен — переменные можно передать напрямую
  }
}
await loadDotEnv();
const SNAPSHOT_PATH = path.join(ROOT, 'frontend/public/etp/data.json');
const FILES_DIR = path.join(ROOT, 'frontend/public/etp/files');
const PARTICIPANT_FILES_DIR = path.join(ROOT, 'frontend/public/etp/participant-files');
const REPORTS_DIR = path.join(ROOT, 'frontend/public/etp/reports');
const PROBE_DIR = path.join(ROOT, 'etp');

const API = process.env.B2BIZ_API || 'https://b2biz.uz/api/v1';
const CUSTOMER = process.env.B2BIZ_CUSTOMER || 'UZUM MARKET';
/** Параллельность запросов к API (не задираем, чтобы не ловить 429). */
const CONCURRENCY = Number(process.env.B2BIZ_CONCURRENCY || 2);

/** Статусы, которые считаем финальными: такие процедуры не перекачиваем. */
const FINAL_STATUSES = new Set(['complete', 'cancelled', 'canceled']);

/** Переводы i18n-ключей ЭТП (как в текущем снапшоте). Неизвестный ключ остаётся как есть. */
const ETP_TYPE_RU = {
  'common.etp_type.purchase': 'Закупка',
  'common.etp_type.sale': 'Продажа',
};
const PROC_TYPE_RU = {
  'common.proc_types.specified_volume_tender': 'Торги указанного объёма',
  'common.proc_types.unit_price_tender': 'Торги за единицу',
};
const STATUS_RU = {
  draft: 'Черновик',
  published: 'Опубликована',
  receiving_offers: 'Приём предложений',
  review_offers: 'Рассмотрение предложений',
  complete: 'Завершена',
  cancelled: 'Отменена',
  withdrawn: 'Отозвана',
};

// ──────────────────────────────── Аргументы CLI ─────────────────────────────

const argv = process.argv.slice(2);
const hasFlag = (name) => argv.includes(name);
const flagValue = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};

const OPTIONS = {
  dryRun: hasFlag('--dry-run'),
  full: hasFlag('--full'),
  noFiles: hasFlag('--no-files'),
  limit: flagValue('--limit') ? Number(flagValue('--limit')) : null,
  only: flagValue('--only') || null,
  probe: flagValue('--probe') || null,
};

const log = (...args) => console.log(...args);
const warn = (...args) => console.warn('⚠️ ', ...args);

// ─────────────────────────────── HTTP / авторизация ─────────────────────────

let accessToken = process.env.B2BIZ_ACCESS || null;
let refreshToken = process.env.B2BIZ_REFRESH || null;

/** Логин по email/паролю: POST /login/ → { access, refresh }. */
async function login() {
  if (accessToken) return;
  const email = process.env.B2BIZ_LOGIN;
  const password = process.env.B2BIZ_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'Нет учётных данных. Задайте B2BIZ_LOGIN и B2BIZ_PASSWORD (или готовый B2BIZ_ACCESS) в окружении.'
    );
  }
  const res = await fetch(`${API}/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(`Логин не удался: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
  }
  const data = await res.json();
  accessToken = data.access || data.access_token || data?.data?.access;
  refreshToken = data.refresh || data.refresh_token || data?.data?.refresh;
  if (!accessToken) throw new Error(`В ответе логина нет токена: ${JSON.stringify(data).slice(0, 300)}`);
  log('🔑 Авторизация выполнена');
}

/** Обновление access-токена по refresh (POST /token/refresh/). */
async function refreshAccess() {
  if (!refreshToken) return false;
  const res = await fetch(`${API}/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh: refreshToken }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  accessToken = data.access || data?.data?.access || accessToken;
  return Boolean(data.access || data?.data?.access);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Глобальный троттлинг: не чаще одного запроса в MIN_INTERVAL_MS (b2biz отдаёт 429). */
const MIN_INTERVAL_MS = Number(process.env.B2BIZ_MIN_INTERVAL_MS || 250);
let nextSlot = 0;
async function throttle() {
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + MIN_INTERVAL_MS;
  if (wait > 0) await sleep(wait);
}

/** GET к API: троттлинг, обновление токена при 401, ретраи с backoff при 429/5xx. */
async function apiGet(pathname, { raw = false, retry = true, attempt = 0 } = {}) {
  const url = pathname.startsWith('http') ? pathname : `${API}/${pathname.replace(/^\//, '')}`;
  await throttle();
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });

  if (res.status === 401 && retry && (await refreshAccess())) {
    return apiGet(pathname, { raw, retry: false });
  }

  // 429 (rate limit) и 5xx — ждём и пробуем снова, до 5 раз
  if ((res.status === 429 || res.status >= 500) && attempt < 5) {
    const retryAfter = Number(res.headers.get('retry-after'));
    const delay = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : Math.min(30000, 1000 * 2 ** attempt);
    // Притормаживаем и остальные запросы, чтобы не долбить площадку параллельно
    nextSlot = Math.max(nextSlot, Date.now() + delay);
    await sleep(delay);
    return apiGet(pathname, { raw, retry, attempt: attempt + 1 });
  }

  if (!res.ok) {
    const err = new Error(`GET ${url} → HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return raw ? res : res.json();
}

/** Безопасный GET: при ошибке возвращает null и пишет предупреждение. */
async function apiGetSafe(pathname, label) {
  try {
    return await apiGet(pathname);
  } catch (e) {
    warn(`${label || pathname}: ${e.message}`);
    return null;
  }
}

/** Пул задач с ограниченной параллельностью. */
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

// ───────────────────────────────── Утилиты ──────────────────────────────────

const statusKeyOf = (statusName) => String(statusName || '').split('.').pop() || '';
const statusRuOf = (statusName) => {
  const key = statusKeyOf(statusName);
  return STATUS_RU[key] || key;
};
const exists = async (p) => access(p).then(() => true).catch(() => false);

/** Сравнение дат по моменту времени: API отдаёт то с микросекундами, то без. */
const sameMoment = (a, b) => {
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  return Number.isNaN(ta) || Number.isNaN(tb) ? a === b : ta === tb;
};

const formatSize = (bytes) => {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

// ─────────────────────────── Снапшот: чтение / запись ───────────────────────

async function loadSnapshot() {
  try {
    const raw = await readFile(SNAPSHOT_PATH, 'utf8');
    const snapshot = JSON.parse(raw);
    log(`📦 Текущий снапшот: ${snapshot.count} процедур от ${snapshot.generatedAt}`);
    return snapshot;
  } catch {
    warn('Снапшот не найден — будет собран с нуля');
    return { generatedAt: null, source: 'b2biz.uz', customer: CUSTOMER, count: 0, procedures: [] };
  }
}

/**
 * Один код закупки = одна запись. При новом этапе торгов b2biz заводит новую процедуру
 * с тем же pcode, но своим guid — оставляем самую свежую по дате создания.
 */
function dedupeByCode(procedures) {
  const byKey = new Map();
  for (const p of procedures) {
    const key = p.code || p.guid;
    const kept = byKey.get(key);
    if (!kept || String(p.createdDate || '') > String(kept.createdDate || '')) {
      byKey.set(key, p);
    }
  }
  const dropped = procedures.length - byKey.size;
  if (dropped > 0) log(`🧹 Схлопнуто прежних этапов: ${dropped}`);
  return [...byKey.values()];
}

/** Пересчёт агрегатов и атомарная запись (с бэкапом предыдущей версии). */
async function saveSnapshot(rawProcedures) {
  const procedures = dedupeByCode(rawProcedures);
  procedures.sort((a, b) => String(b.createdDate || '').localeCompare(String(a.createdDate || '')));
  const byStatus = {};
  let filesTotal = 0;
  let participantFilesTotal = 0;
  let competitionCount = 0;
  for (const p of procedures) {
    byStatus[p.statusRu] = (byStatus[p.statusRu] || 0) + 1;
    filesTotal += p.files?.length || 0;
    participantFilesTotal += (p.participants || []).reduce((s, x) => s + (x.files?.length || 0), 0);
    if (p.competition) competitionCount += 1;
  }
  const snapshot = {
    generatedAt: new Date().toISOString().slice(0, 10),
    source: 'b2biz.uz',
    customer: CUSTOMER,
    count: procedures.length,
    byStatus,
    filesTotal,
    participantFilesTotal,
    competitionCount,
    procedures,
  };
  const tmp = `${SNAPSHOT_PATH}.tmp`;
  await writeFile(tmp, JSON.stringify(snapshot), 'utf8');
  if (await exists(SNAPSHOT_PATH)) {
    await writeFile(`${SNAPSHOT_PATH}.bak`, await readFile(SNAPSHOT_PATH));
  }
  await rename(tmp, SNAPSHOT_PATH);
  log(
    `💾 Снапшот сохранён: ${snapshot.count} процедур · ${filesTotal} док. · ` +
      `${participantFilesTotal} файлов КП · ${competitionCount} конкурентных листов`
  );
}

// ──────────────────────────── Список процедур ЭТП ───────────────────────────

/** GUID компании-заказчика (по нему фильтруем общий список опубликованных процедур). */
async function fetchCustomerGuid() {
  if (process.env.B2BIZ_CUSTOMER_GUID) return process.env.B2BIZ_CUSTOMER_GUID;
  const company = await apiGetSafe('etp/company/get-company-data/', 'company');
  if (company?.supl_guid) {
    log(`🏢 Заказчик: ${company.brandname || CUSTOMER} (${company.supl_guid})`);
    return company.supl_guid;
  }
  warn('Не удалось определить GUID компании — берём все процедуры из списка');
  return null;
}

/**
 * Список опубликованных процедур (постранично, по 30 записей на страницу),
 * отфильтрованный по компании-заказчику.
 */
async function fetchProcedureList() {
  const customerGuid = await fetchCustomerGuid();
  const rows = [];
  let page = 1;
  let total = null;
  while (true) {
    const data = await apiGet(`etp/get-list-published-procedures/?page=${page}`);
    const chunk = data?.results || [];
    if (total == null) total = data?.count ?? null;
    rows.push(...chunk);
    if (!data?.next || chunk.length === 0) break;
    page += 1;
    if (page > 200) break; // страховка от бесконечного цикла
  }
  const own = customerGuid ? rows.filter((r) => r.supl_guid === customerGuid) : rows;
  log(`📋 Получено ${rows.length} процедур (всего ${total ?? '?'}), из них наших: ${own.length}`);
  return own;
}

/** Приведение строки списка к { guid, code, statusKey, deadline, createdDate }. */
function normalizeListRow(row) {
  return {
    guid: row.guid || row.etp_guid || row.proc_guid,
    code: row.pcode || row.code || null,
    statusKey: statusKeyOf(row.pstatusname || row.status_name || row.status),
    // Сравниваем именно базовый дедлайн: deadline_extended — это автопродление торгов,
    // оно есть у списка, но в снапшот не попадает, иначе получаем ложные «изменения».
    deadline: row.deadline || null,
    createdDate: row.create_date || row.created || row.created_date || null,
    raw: row,
  };
}

// ───────────────────── Решение: что перекачивать, что нет ───────────────────

/**
 * Нужно ли перекачивать процедуру.
 * @returns {null | string} причина обновления или null, если можно взять из снапшота
 */
function refreshReason(row, old) {
  if (OPTIONS.full) return 'принудительно (--full)';
  if (!old) return 'новая';
  if (row.statusKey && old.statusKey && row.statusKey !== old.statusKey) {
    return `статус ${old.statusKey} → ${row.statusKey}`;
  }
  if (
    row.deadline &&
    old.deadline &&
    !sameMoment(row.deadline, old.deadline) &&
    !FINAL_STATUSES.has(row.statusKey)
  ) {
    return 'сдвинут дедлайн';
  }
  if (!FINAL_STATUSES.has(old.statusKey)) return `не финальный статус (${old.statusKey})`;
  return null;
}

// ──────────────────────── Сборка процедуры из API ───────────────────────────

/**
 * Полная карточка процедуры в формате снапшота (EtpProcedure).
 * @param old прежняя версия из снапшота — из неё берутся секции, которые API не отдал
 */
async function fetchProcedure(guid, listRow, old = null) {
  const q = `?etp_guid=${guid}`;
  const [overview, positions, params, aside, stages, contacts, files, categories, results] =
    await Promise.all([
      apiGetSafe(`etp/procedure/stage-get-overview/${q}`, `overview ${guid}`),
      apiGetSafe(`etp/procedure/stage-get-positions/${q}`, `positions ${guid}`),
      apiGetSafe(`etp/procedure/stage-get-params/${q}`, `params ${guid}`),
      apiGetSafe(`etp/procedure/get-aside-info/${q}`, `aside ${guid}`),
      apiGetSafe(`etp/procedure/get-stages/${q}`, `stages ${guid}`),
      apiGetSafe(`etp/procedure/stage-get-contacts/${q}`, `contacts ${guid}`),
      apiGetSafe(`etp/procedure/stage-get-files-list/${q}`, `files ${guid}`),
      apiGetSafe(`etp/procedure/get-categories/${q}`, `categories ${guid}`),
      apiGetSafe(`etp/procedure/results/get-results/${q}`, `results ${guid}`),
    ]);

  // Без базовых секций карточка получится «пустой» — лучше оставить прежнюю версию
  if (!aside || !overview) {
    throw new Error('не получены базовые секции (aside/overview)');
  }

  const participantsRaw = await apiGetSafe(
    `etp/procedure/stage-get-participants/${q}&statuses=`,
    `participants ${guid}`
  );
  // Конкурентный лист (позиции, ставки поставщиков, критерии и ответы на них)
  const biddingRaw = await apiGetSafe(`etp/bidding/get-last-proposals/${q}`, `competition ${guid}`);

  const asideStatus = aside?.status || {};
  const general = aside?.general_info || overview || {};
  const statusName = asideStatus.status_name;

  const procedure = {
    code: general.pcode || listRow?.code || null,
    guid,
    title: general.title || overview?.title || '',
    etpTypeName: ETP_TYPE_RU[general.etp_type_name] || general.etp_type_name || '',
    procTypeName: PROC_TYPE_RU[general.proc_type_name] || general.proc_type_name || '',
    statusKey: statusKeyOf(statusName),
    statusRu: statusRuOf(statusName),
    createdDate: asideStatus.created_date || listRow?.createdDate || null,
    publishedDate: asideStatus.latest_publish_date || null,
    deadline: asideStatus.deadline || null,
    completedDate: asideStatus.status_date || null,
    customer: {
      brandName: aside?.customer_company_info?.brand_name || CUSTOMER,
      legalName: aside?.customer_company_info?.legal_name || '',
    },
    invitationHtml: overview?.info?.invitation || '',
    contacts: contacts?.contacts_list || overview?.info?.contacts || '',
    criterias: (overview?.criterias?.criterias || []).map((c) => c.title || c.name || String(c)),
    categories: (categories?.categories || []).map((c) => c.name),
    rules: mapRules(params?.data),
    positions: (positions?.positions || []).map((p, i) => ({
      num: i + 1,
      title: p.title || '',
      descr: p.descr || '',
      quantity: Number(p.quantity ?? 0),
      unitName: p.unit_name || '',
    })),
    stages: (stages?.stage_data?.stages || []).map((s) => ({
      number: String(s.stage_number ?? ''),
      statusRu: statusRuOf(s.status_name),
      publishedDate: s.published_date || null,
      completedDate: s.completed_date || null,
    })),
    stagesCount: (stages?.stage_data?.stages || []).length,
    participants: participantsRaw ? mapParticipants(participantsRaw) : old?.participants ?? [],
    participantsCount: 0,
    submittedCount: 0,
    participantFilesCount: 0,
    results: results ? mapResults(results?.data?.data || results?.data) : old?.results ?? [],
    winner: null,
    competition: biddingRaw ? mapCompetition(biddingRaw.data) : old?.competition ?? null,
    reports: { competition: null, history: null },
    files: files ? mapFiles(files, '/etp/files') : old?.files ?? [],
    filesCount: 0,
    stat: {
      views: aside?.stat?.views ?? 0,
      downloads: aside?.stat?.downloads ?? 0,
      favorites: aside?.stat?.added_favorites ?? 0,
      submitted: aside?.stat?.submitted_proposals ?? 0,
    },
  };

  procedure.participantsCount = procedure.participants.length;
  procedure.filesCount = procedure.files.length;
  procedure.winner = pickWinner(procedure.results);
  // stat.submitted_proposals у API всегда 0 — считаем поданные предложения сами
  const submittedByStatus = procedure.participants.filter(
    (p) => p.statusRu === 'Предложение направлено'
  ).length;
  procedure.submittedCount = submittedByStatus || procedure.competition?.suppliers?.length || 0;
  procedure.stat.submitted = procedure.submittedCount;
  return procedure;
}

function mapRules(data) {
  if (!data) return { currency: 'UZS' };
  return {
    currencyId: data.currency_id,
    currency: data.currency || 'UZS',
    vat: data.vat,
    renewalTimeMin: data.renewal_time,
    viewSubmissions: data.view_submissions,
    decreaseStep: data.decrease_step,
    openDate: data.open_date,
    visibilityId: data.visibility_id,
    transpType: data.transp_type,
  };
}

function mapFiles(raw, publicDir) {
  const list = Array.isArray(raw) ? raw : raw?.files || raw?.data || [];
  if (!Array.isArray(list)) return [];
  return list.map((f) => ({
    fileGuid: f.file_guid,
    name: f.file_usr_name || f.name || '',
    ext: f.ext || path.extname(f.file_usr_name || ''),
    size: f.size ?? 0,
    sizeFormatted: f.size_formatted || formatSize(f.size),
    uploadedBy: f.uploaded_by || '',
    uploaded: f.uploaded_formatted || f.uploaded || '',
    path: `${publicDir}/${f.file_guid}${f.ext || ''}`,
  }));
}

function mapParticipants(raw) {
  const list = raw?.data?.data || raw?.data || raw?.participants || [];
  if (!Array.isArray(list)) return [];
  return list.map((p) => ({
    suplGuid: p.supl_guid,
    company: p.company_name || '',
    shortName: p.participant?.participant_name || '',
    inn: p.inn || '',
    address: p.legal_address || '',
    email: p.email || '',
    phone: p.phone || '',
    statusRu: p.participant?.participant_status || '',
    statusDate: p.participant?.status_date || null,
    contactName: p.participant?.contact?.name || '',
    contactEmail: p.participant?.contact?.email || '',
    contactPhone: p.participant?.contact?.phone || '',
    files: [],
  }));
}

function mapResults(raw) {
  const list = Array.isArray(raw) ? raw : [];
  return list.map((r) => ({
    brand: r.supl_brand_name || '',
    legal: r.supl_legal_name || '',
    totalPrice: Number(r.supl_total_price ?? 0),
    currency: r.currency || 'UZS',
    vat: Boolean(r.vat),
    sharePct: r.supl_total_share != null ? Number(r.supl_total_share) * 100 : null,
    positions: (r.positions || []).map((p) => ({
      name: p.position_name || '',
      quantity: Number(p.quantity ?? 0),
      unitPrice: Number(p.unit_price ?? 0),
    })),
  }));
}

function pickWinner(results) {
  if (!results?.length) return null;
  const best = results.reduce((a, b) => (a.totalPrice <= b.totalPrice ? a : b));
  return { brand: best.brand, totalPrice: best.totalPrice, currency: best.currency };
}

/** Ответ участника на критерий → строка (варианты, {value} или пусто). */
function answerToText(answer) {
  if (answer == null) return '';
  if (Array.isArray(answer)) return answer.map((x) => x?.label ?? x ?? '').join(', ');
  if (typeof answer === 'object') return String(answer.label ?? answer.value ?? '');
  return String(answer);
}

/** Конкурентный лист из ответа etp/bidding/get-last-proposals. */
function mapCompetition(data) {
  const positions = data?.positions;
  if (!Array.isArray(positions) || positions.length === 0) return null;
  const suppliers = data?.suppliers_data || [];
  const criteria = data?.criterias?.criterias || [];
  const responses = data?.criterias?.responses || [];

  // answers[supplierGuid][criteriaGuid] = подпись выбранного варианта
  const answers = {};
  for (const r of responses) {
    const guid = r.supplier_guid;
    if (!guid) continue;
    const map = {};
    for (const a of r.answers || []) {
      if (!a.criteria_guid) continue;
      // Ответ приходит либо списком вариантов, либо объектом {value} (числовые/текстовые вопросы)
      map[a.criteria_guid] = answerToText(a.answer);
    }
    if (Object.keys(map).length) answers[guid] = map;
  }

  return {
    positions: positions.map((p) => ({
      guid: p.position_guid,
      title: p.position_title || '',
      count: Number(p.position_count ?? 0),
      unit: p.position_unit,
      bestPrice: p.position_best_price != null ? Number(p.position_best_price) : 0,
      currency: p.position_currency || 'UZS',
    })),
    suppliers: suppliers.map((s) => ({
      guid: s.supplier_guid,
      name: s.supplier || '',
      rankSum: Number(s.rank_sum ?? 0),
      total: Number(s.supplier_total_cost ?? 0),
      currency: s.positions?.[0]?.position_currency || 'UZS',
      positions: (s.positions || []).map((p) => ({
        posGuid: p.position_guid,
        price: Number(p.position_price ?? 0),
        count: Number(p.position_count ?? 0),
        rank: Number(p.rank ?? 0),
        deltaPercent: Number(p.delta_percent ?? 0),
        isSelected: Boolean(p.is_selected),
      })),
    })),
    criteria: criteria.map((c) => ({
      guid: c.criteria_guid,
      title: c.question_title || '',
      descr: c.question_descr || '',
    })),
    answers,
  };
}

// ─────────────────────── Докачивание недостающих файлов ─────────────────────

/** Скачивает файл, если его ещё нет на диске. @returns true, если качали */
async function downloadIfMissing(url, targetPath) {
  if (await exists(targetPath)) return false;
  if (OPTIONS.dryRun) return true;
  const res = await apiGet(url, { raw: true });
  await mkdir(path.dirname(targetPath), { recursive: true });
  await pipeline(Readable.fromWeb(res.body), createWriteStream(targetPath));
  return true;
}

/** Документы процедуры, файлы КП участников и отчёты — только отсутствующие. */
async function syncProcedureFiles(procedure, old = null) {
  let downloaded = 0;
  const guid = procedure.guid;

  for (const f of procedure.files) {
    const target = path.join(FILES_DIR, `${f.fileGuid}${f.ext || ''}`);
    try {
      if (await downloadIfMissing(`files/download/?file_guid=${f.fileGuid}`, target)) downloaded += 1;
    } catch (e) {
      warn(`Файл ${f.name} (${f.fileGuid}): ${e.message}`);
    }
  }

  // Файлы коммерческих предложений участников
  for (const participant of procedure.participants) {
    const raw = await apiGetSafe(
      `etp/procedure/results/get-participant-files/?etp_guid=${guid}&supl_guid=${participant.suplGuid}`,
      `participant files ${participant.suplGuid}`
    );
    // Если запрос не прошёл — сохраняем список файлов из прежнего снапшота, а не пустой
    participant.files = raw
      ? mapFiles(raw, '/etp/participant-files')
      : (old?.participants || []).find((p) => p.suplGuid === participant.suplGuid)?.files ?? [];
    for (const f of participant.files) {
      const target = path.join(PARTICIPANT_FILES_DIR, `${f.fileGuid}${f.ext || ''}`);
      try {
        const url = `etp/participant/files/download-proposal/?etp_guid=${guid}&file_guid=${f.fileGuid}`;
        if (await downloadIfMissing(url, target)) downloaded += 1;
      } catch (e) {
        warn(`Файл КП ${f.name}: ${e.message}`);
      }
    }
  }
  procedure.participantFilesCount = procedure.participants.reduce((s, p) => s + p.files.length, 0);

  // Отчёты: конкурентный лист и история торгов
  const reports = [
    ['competition', `etp/procedure/results/reports/export-competition/?etp_guid=${guid}`, `${guid}-competition.xlsx`],
    ['history', `etp/procedure/results/reports/export-bidding-history/?etp_guid=${guid}`, `${guid}-history.xlsx`],
  ];
  for (const [key, url, fileName] of reports) {
    const target = path.join(REPORTS_DIR, fileName);
    const had = await exists(target);
    try {
      if (await downloadIfMissing(url, target)) downloaded += 1;
      procedure.reports[key] = `/etp/reports/${fileName}`;
    } catch {
      // Отчёт может быть недоступен (процедура не дошла до результатов) — это норма.
      // Если файл уже лежал на диске или был в прежнем снапшоте — ссылку сохраняем.
      if (had) procedure.reports[key] = `/etp/reports/${fileName}`;
      else if (old?.reports?.[key]) procedure.reports[key] = old.reports[key];
    }
  }

  return downloaded;
}

// ──────────────────────────────── Probe-режим ───────────────────────────────

async function probe(guid) {
  const q = `?etp_guid=${guid}`;
  const endpoints = {
    overview: `etp/procedure/stage-get-overview/${q}`,
    positions: `etp/procedure/stage-get-positions/${q}`,
    params: `etp/procedure/stage-get-params/${q}`,
    aside: `etp/procedure/get-aside-info/${q}`,
    stages: `etp/procedure/get-stages/${q}`,
    contacts: `etp/procedure/stage-get-contacts/${q}`,
    files: `etp/procedure/stage-get-files-list/${q}`,
    categories: `etp/procedure/get-categories/${q}`,
    results: `etp/procedure/results/get-results/${q}`,
    participants: `etp/procedure/stage-get-participants/${q}&statuses=`,
    supplierResults: `etp/procedure/results/get-supplier-results/${q}`,
    criterias: `etp/procedure/criterias/participant/${q}`,
    list: 'user/get-list-procedures/?page=1&per_page=5',
  };
  const out = {};
  for (const [name, url] of Object.entries(endpoints)) {
    try {
      out[name] = { ok: true, data: await apiGet(url) };
    } catch (e) {
      out[name] = { ok: false, error: e.message };
    }
  }
  await mkdir(PROBE_DIR, { recursive: true });
  const target = path.join(PROBE_DIR, `probe-${guid}.json`);
  await writeFile(target, JSON.stringify(out, null, 1), 'utf8');
  log(`🔍 Сырые ответы сохранены: ${target}`);
}

// ──────────────────────────────── Основной поток ────────────────────────────

async function main() {
  await login();

  if (OPTIONS.probe) {
    await probe(OPTIONS.probe);
    return;
  }

  const snapshot = await loadSnapshot();
  const oldByGuid = new Map(snapshot.procedures.map((p) => [p.guid, p]));
  const oldByCode = new Map(snapshot.procedures.map((p) => [p.code, p]));

  const rows = (await fetchProcedureList()).map(normalizeListRow);
  const filtered = OPTIONS.only ? rows.filter((r) => r.code === OPTIONS.only) : rows;

  const plan = [];
  for (const row of filtered) {
    const old = oldByGuid.get(row.guid) || oldByCode.get(row.code) || null;
    const reason = refreshReason(row, old);
    if (reason) plan.push({ row, old, reason });
  }

  log(`\n🔄 К обновлению: ${plan.length} из ${filtered.length} процедур`);
  for (const item of plan.slice(0, 40)) {
    log(`   · ${item.row.code || item.row.guid} — ${item.reason}`);
  }
  if (plan.length > 40) log(`   … и ещё ${plan.length - 40}`);

  if (OPTIONS.dryRun) {
    log('\n(--dry-run: ничего не скачано и не записано)');
    return;
  }

  const work = OPTIONS.limit ? plan.slice(0, OPTIONS.limit) : plan;
  let downloadedFiles = 0;

  const updated = await mapLimit(work, CONCURRENCY, async (item, i) => {
    const label = item.row.code || item.row.guid;
    try {
      const procedure = await fetchProcedure(item.row.guid, item.row, item.old);
      if (!OPTIONS.noFiles) downloadedFiles += await syncProcedureFiles(procedure, item.old);
      else procedure.participantFilesCount = item.old?.participantFilesCount ?? 0;
      log(`   ✓ [${i + 1}/${work.length}] ${label}`);
      return procedure;
    } catch (e) {
      warn(`[${i + 1}/${work.length}] ${label}: ${e.message} — оставляем прежнюю версию`);
      return item.old || null;
    }
  });

  // Собираем итог: обновлённые + нетронутые из старого снапшота, которые есть в списке
  const result = new Map(snapshot.procedures.map((p) => [p.guid, p]));
  for (const p of updated) if (p) result.set(p.guid, p);

  await saveSnapshot([...result.values()]);
  log(`📥 Докачано файлов: ${downloadedFiles}`);
}

main().catch((e) => {
  console.error(`\n❌ ${e.message}`);
  process.exit(1);
});
