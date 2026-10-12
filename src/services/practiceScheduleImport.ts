import * as XLSX from 'xlsx';
import type { Course, ProgramCode } from '../core/types.js';

export interface ImportedPractice {
  id: string;
  program: ProgramCode;
  course: Course;
  group: string;
  date: string;
  start: string;
  end: string;
  subject: string;
  location: string;
  teacher: string;
  sourceFile: string;
  createdAt: string;
}

interface ImportTarget { program: ProgramCode; course: Course; group: string; }

const DB_NAME = 'almazov-imported-practices';
const STORE = 'practice-events';
const DB_VERSION = 1;
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const aliases: Record<string, string[]> = {
  date: ['дата', 'число', 'дата занятия', 'дата проведения', 'день', 'date'],
  start: ['начало', 'начало занятия', 'время начала', 'время', 'время проведения', 'интервал времени', 'временной интервал', 'период', 'start', 'time'],
  end: ['окончание', 'окончание занятия', 'конец', 'время окончания', 'до', 'end'],
  subject: ['предмет', 'дисциплина', 'занятие', 'название занятия', 'наименование дисциплины', 'тема', 'subject', 'summary', 'название'],
  location: ['аудитория', 'ауд', 'место', 'место проведения', 'корпус', 'кабинет', 'адрес', 'location', 'room'],
  teacher: ['преподаватель', 'преподаватель фио', 'фио преподавателя', 'преподаватель (фио)', 'фио', 'учитель', 'teacher'],
  group: ['группа', 'учебная группа', 'академическая группа', 'group'],
  program: ['программа', 'специальность', 'код специальности', 'направление подготовки', 'program'],
  course: ['курс', 'курс обучения', 'course'],
  type: ['тип', 'вид занятия', 'тип занятия', 'форма занятия', 'type']
};

const norm = (value: unknown) => String(value ?? '').replace(/^\uFEFF/, '').trim().toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').replace(/[._-]+/g, ' ').replace(/\s+/g, ' ');
const clean = (value: unknown) => String(value ?? '').trim().replace(/\s+/g, ' ');

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('scope', 'scope', { unique: false });
        store.createIndex('date', 'date', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Не удалось открыть отдельное хранилище практических занятий.'));
    request.onblocked = () => reject(new Error('Хранилище расписания занято другой вкладкой. Закройте старые вкладки и повторите.'));
  });
}

export function practiceScope(program: ProgramCode, course: Course, group: string): string {
  return `${program}:${course}:${clean(group).toLocaleLowerCase('ru-RU')}`;
}

export async function listImportedPractices(program: ProgramCode, course: Course, group: string, from: string, to: string): Promise<ImportedPractice[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).index('scope').getAll(practiceScope(program, course, group));
    req.onsuccess = () => resolve((req.result as Array<ImportedPractice & { scope: string }>).filter(e => e.date >= from && e.date <= to).sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start)));
    req.onerror = () => reject(req.error ?? new Error('Не удалось прочитать импортированные ПЗ.'));
    tx.oncomplete = () => db.close();
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function countImportedPractices(program: ProgramCode, course: Course, group: string): Promise<number> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).index('scope').count(practiceScope(program, course, group));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Не удалось проверить ранее загруженные ПЗ.'));
    tx.oncomplete = () => db.close();
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function saveImportedPractices(rows: ImportedPractice[], replaceScope: boolean): Promise<{ added: number; total: number }> {
  if (!rows.length) throw new Error('В файле нет строк практических занятий для выбранной группы.');
  const scope = practiceScope(rows[0]!.program, rows[0]!.course, rows[0]!.group);
  if (rows.some(row => practiceScope(row.program, row.course, row.group) !== scope)) throw new Error('Одна загрузка должна относиться к одной программе, курсу и группе.');
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const index = store.index('scope');
    const existingRequest = index.getAll(scope);
    let result = { added: 0, total: 0 };
    existingRequest.onsuccess = () => {
      const existing = existingRequest.result as Array<ImportedPractice & { scope: string }>;
      const duplicateKey = (row: ImportedPractice) => [row.date, row.start, row.end, norm(row.subject), norm(row.location)].join('|');
      const seen = new Set(replaceScope ? [] : existing.map(duplicateKey));
      const additions = rows.filter(row => { const key = duplicateKey(row); if (seen.has(key)) return false; seen.add(key); return true; });
      if (replaceScope) {
        const cursorRequest = index.openCursor(scope);
        cursorRequest.onsuccess = () => { const cursor = cursorRequest.result; if (cursor) { cursor.delete(); cursor.continue(); } };
      }
      for (const row of additions) store.put({ ...row, scope });
      result = { added: additions.length, total: replaceScope ? additions.length : existing.length + additions.length };
    };
    existingRequest.onerror = () => { try { tx.abort(); } catch {} reject(existingRequest.error ?? new Error('Не удалось сохранить ПЗ.')); };
    tx.oncomplete = () => { db.close(); resolve(result); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error('Не удалось сохранить ПЗ.')); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error('Импорт отменён: файл не изменил расписание.')); };
  });
}

function dateValue(value: unknown): string {
  if (value instanceof Date && Number.isFinite(value.getTime())) return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  const text = clean(value);
  let m = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return `${m[1]}-${String(Number(m[2])).padStart(2, '0')}-${String(Number(m[3])).padStart(2, '0')}`;
  m = text.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/);
  if (m) return `${m[3]}-${String(Number(m[2])).padStart(2, '0')}-${String(Number(m[1])).padStart(2, '0')}`;
  if (typeof value === 'number' && value > 20000 && value < 80000) {
    const d = new Date(Date.UTC(1899, 11, 30) + value * 86400000);
    return d.toISOString().slice(0, 10);
  }
  return '';
}

function timeValue(value: unknown): string {
  if (value instanceof Date && Number.isFinite(value.getTime())) return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
  if (typeof value === 'number' && value >= 0 && value < 1) { const minutes = Math.round(value * 1440); return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`; }
  const match = clean(value).match(/(?:^|\D)([01]?\d|2[0-3])[:.]([0-5]\d)(?:\s|$)/);
  return match ? `${String(Number(match[1])).padStart(2, '0')}:${match[2]}` : '';
}

function headerField(value: unknown): string {
  const name = norm(value);
  for (const [key, names] of Object.entries(aliases)) if (names.includes(name)) return key;
  if (/дата|числ/.test(name)) return 'date';
  if (/групп/.test(name)) return 'group';
  if (/препод|учител|доцент|профессор|фио/.test(name)) return 'teacher';
  if (/дисциплин|предмет|назван.*занят|занятие|тема/.test(name)) return 'subject';
  if (/аудит|кабинет|место|корпус|адрес/.test(name)) return 'location';
  if (/специальност|направлени|программ/.test(name)) return 'program';
  if (/курс/.test(name)) return 'course';
  if (/тип|вид занятия|форма занятия/.test(name)) return 'type';
  if (/оконч|конец|время до/.test(name)) return 'end';
  if (/начал|время|интервал|период|временн/.test(name)) return 'start';
  return '';
}

function timeRange(value: unknown): [string, string] | null {
  const matches = [...clean(value).matchAll(/([01]?\d|2[0-3])[:.]([0-5]\d)/g)];
  if (matches.length < 2) return null;
  const first = matches[0]!, second = matches[1]!;
  return [`${String(Number(first[1])).padStart(2, '0')}:${first[2]}`, `${String(Number(second[1])).padStart(2, '0')}:${second[2]}`];
}

function parseRows(matrix: unknown[][], fileName: string, target: ImportTarget): ImportedPractice[] {
  const rows = (matrix ?? []).filter(row => Array.isArray(row));
  if (!rows.length) throw new Error('В файле не нашёл строк таблицы. Проверьте, что лист не пустой и данные сохранены как таблица.');
  const candidates: Array<{ header: number; columns: Record<string, number>; score: number; dataStart: number }> = [];
  const maxHeader = Math.min(rows.length, 40);
  for (let i = 0; i < maxHeader; i++) {
    const columns: Record<string, number> = {};
    (rows[i] ?? []).forEach((cell, index) => {
      const field = headerField(cell);
      if (field && columns[field] === undefined) columns[field] = index;
    });
    const sample = rows.slice(i + 1, i + 13);
    const width = Math.max(0, ...sample.map(row => row.length));
    const hasDate = columns.date !== undefined || Array.from({ length: width }, (_, col) => col).some(col => sample.filter(row => !!dateValue(row[col])).length >= 2);
    const hasSubject = columns.subject !== undefined || Array.from({ length: width }, (_, col) => col).some(col =>
      sample.filter(row => { const v = clean(row[col]); return v.length >= 3 && !dateValue(row[col]) && !timeValue(row[col]) && !timeRange(row[col]) && !/^\d{3}(?:КП|П)?$/i.test(v); }).length >= 2);
    const timeColumns = Array.from({ length: width }, (_, col) => col);
    const hasRange = timeColumns.some(col => sample.filter(row => !!timeRange(row[col])).length >= 1);
    const splitTimeColumns = timeColumns.filter(col => sample.filter(row => !!timeValue(row[col])).length >= 2);
    const hasSplitTime = splitTimeColumns.length >= 2;
    const hasTime = columns.start !== undefined || hasRange || hasSplitTime;
    const signalCount = Object.keys(columns).length;
    const score = (hasDate ? 5 : 0) + (hasSubject ? 4 : 0) + (hasTime ? 5 : 0) + Math.min(signalCount, 6) + Math.min(sample.filter(row => row.some(v => clean(v))).length, 8) / 10;
    if (hasDate && hasSubject && hasTime) candidates.push({ header: i, columns, score, dataStart: i + 1 });
  }
  candidates.sort((a, b) => b.score - a.score || a.header - b.header);
  const best = candidates[0];
  const second = candidates[1];
  if (!best) {
    throw new Error('Не удалось уверенно распознать таблицу. Нужны столбцы с датой, предметом и временем; заголовки могут называться по-разному. В Excel проверьте, что дата и время находятся в ячейках, а не только в изображении.');
  }
  if (second && Math.abs(best.score - second.score) < 0.15 && best.header !== second.header) {
    throw new Error('В файле найдено несколько похожих таблиц. Оставьте нужное расписание на одном листе или удалите повторную шапку.');
  }
  const columns = { ...best.columns };
  const sample = rows.slice(best.dataStart, best.dataStart + 20);
  const width = Math.max(0, ...sample.map(row => row.length));
  const findDataColumn = (predicate: (value: unknown) => boolean, minimum = 1) => {
    let winner = -1, count = 0;
    for (let col = 0; col < width; col++) {
      const hits = sample.filter(row => predicate(row[col])).length;
      if (hits > count) { winner = col; count = hits; }
    }
    return count >= minimum ? winner : -1;
  };
  if (columns.date === undefined) { const col = findDataColumn(v => !!dateValue(v), 2); if (col >= 0) columns.date = col; }
  if (columns.subject === undefined) {
    const col = findDataColumn(v => { const x = clean(v); return x.length >= 3 && !dateValue(v) && !timeValue(v) && !timeRange(v) && !/^\d{3}(?:КП|П)?$/i.test(x); }, 2);
    if (col >= 0) columns.subject = col;
  }
  if (columns.start === undefined) {
    const rangeCol = findDataColumn(v => !!timeRange(v), 1);
    if (rangeCol >= 0) columns.start = rangeCol;
    else {
      const timeCols = Array.from({ length: width }, (_, col) => col).filter(col => sample.filter(row => !!timeValue(row[col])).length >= 2);
      if (timeCols.length >= 2) { columns.start = timeCols[0]!; if (columns.end === undefined) columns.end = timeCols[1]!; }
      else if (timeCols.length === 1) columns.start = timeCols[0]!;
    }
  }
  const value = (row: unknown[], key: string) => columns[key] === undefined ? '' : row[columns[key]!] ?? '';
  const rowsOut: ImportedPractice[] = [];
  const selectedGroup = clean(target.group);
  const seen = new Set<string>();
  for (const cells of rows.slice(best.dataStart)) {
    if (!cells?.some(cell => clean(cell))) continue;
    const providedProgram = norm(value(cells, 'program'));
    const providedCourse = clean(value(cells, 'course')).match(/\d+/)?.[0];
    const providedGroup = clean(value(cells, 'group'));
    const programHint = providedProgram.includes('31 05 01') || providedProgram.includes('лечебное дело') ? '31.05.01' : providedProgram.includes('31 05 02') || providedProgram.includes('педиатр') ? '31.05.02' : providedProgram.includes('37 05 01') || providedProgram.includes('клиническая психология') ? '37.05.01' : '';
    if (programHint && programHint !== target.program) continue;
    if (providedCourse && Number(providedCourse) !== target.course) continue;
    if (providedGroup && selectedGroup && norm(providedGroup) !== norm(selectedGroup)) continue;
    const type = norm(value(cells, 'type'));
    if (type && /(лекц|lecture)/.test(type)) continue;
    const rowDate = cells.map(dateValue).find(Boolean) ?? '';
    const date = dateValue(value(cells, 'date')) || rowDate;
    const subjectCell = clean(value(cells, 'subject'));
    const subject = subjectCell || clean(cells.find(cell => {
      const text = clean(cell);
      return text.length >= 3 && !dateValue(cell) && !timeValue(cell) && !timeRange(cell)
        && !/^\d+(?:[.,]\d+)?$/.test(text) && !/^\d{3}(?:КП|П)?$/i.test(text);
    }) ?? '');
    let start = timeValue(value(cells, 'start'));
    let end = timeValue(value(cells, 'end'));
    const range = cells.map(timeRange).find((candidate): candidate is [string, string] => !!candidate) ?? null;
    if (range) { if (!start || columns.end === undefined) start = range[0]; if (!end) end = range[1]; }
    if (!start || !end) {
      const clocks = cells.map(timeValue).filter(Boolean);
      if (!start && clocks[0]) start = clocks[0];
      if (!end && clocks[1]) end = clocks[1];
    }
    if (!date || !subject || !start || !end || end <= start) continue;
    const group = providedGroup || selectedGroup;
    if (!group) continue;
    const location = clean(value(cells, 'location'));
    const teacher = clean(value(cells, 'teacher'));
    const source = [target.program, target.course, group, date, start, end, subject, location, teacher].join('|');
    const id = `practice-${simpleHash(source)}`;
    if (seen.has(id)) continue;
    seen.add(id);
    rowsOut.push({ id, program: target.program, course: target.course, group, date, start, end, subject: subject.slice(0, 180), location: location.slice(0, 180), teacher: teacher.slice(0, 120), sourceFile: fileName.slice(0, 180), createdAt: new Date().toISOString() });
  }
  if (!rowsOut.length) throw new Error('Таблица распознана, но подходящих ПЗ для выбранных курса и группы не нашлось. Проверьте даты, группу и тип занятий.');
  return rowsOut;
}
function simpleHash(text: string): string { let hash = 2166136261; for (const char of text) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); } return (hash >>> 0).toString(16); }

function csvMatrix(text: string): string[][] {
  const firstLine = (text.split(/\r?\n/, 1)[0] ?? '').replace(/^\uFEFF/, '');
  const delimiter = [';', '\t', ','].map(value => ({ value, count: firstLine.split(value).length - 1 })).sort((a, b) => b.count - a.count)[0]!.value;
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;
    if (quoted) { if (char === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (char === '"') quoted = false; else cell += char; }
    else if (char === '"') quoted = true;
    else if (char === delimiter) { row.push(cell); cell = ''; }
    else if (char === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += char;
  }
  row.push(cell.replace(/\r$/, '')); if (row.some(x => x.trim())) rows.push(row);
  return rows;
}

function decodeScheduleText(data: ArrayBuffer): string {
  const bytes = new Uint8Array(data);
  const utf8 = new TextDecoder('utf-8').decode(bytes);
  if (!utf8.includes('\uFFFD')) return utf8;
  try {
    const windows = new TextDecoder('windows-1251').decode(bytes);
    return (windows.match(/\uFFFD/g)?.length ?? 0) < (utf8.match(/\uFFFD/g)?.length ?? 0) ? windows : utf8;
  } catch { return utf8; }
}

function htmlScheduleTables(text: string): string[][][] {
  if (typeof DOMParser === 'undefined') return [];
  const document = new DOMParser().parseFromString(text, 'text/html');
  return Array.from(document.querySelectorAll('table')).map(table =>
    Array.from(table.querySelectorAll('tr')).map(row =>
      Array.from(row.querySelectorAll('th,td')).map(cell => (cell.textContent ?? '').replace(/\s+/g, ' ').trim())
    )
  ).filter(rows => rows.some(row => row.some(cell => cell)));
}

function icsMatrix(text: string): string[][] {
  const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  const rows: string[][] = [['Дата', 'Начало', 'Окончание', 'Предмет', 'Аудитория', 'Преподаватель', 'Группа']];
  let event: Record<string, string> | null = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { event = {}; continue; }
    if (line === 'END:VEVENT' && event) {
      const start = icsDate(event.DTSTART ?? '', event.startZone);
      const end = icsDate(event.DTEND ?? '', event.endZone);
      if (start && end) rows.push([start.date, start.time, end.time, event.SUMMARY ?? '', event.LOCATION ?? '', event.ATTENDEE ?? '', event.GROUP ?? '']);
      event = null; continue;
    }
    if (!event) continue;
    const separator = line.indexOf(':'); if (separator < 0) continue;
    const keyRaw = line.slice(0, separator); const key = keyRaw.split(';')[0]!;
    const zone = keyRaw.match(/TZID=([^;:]+)/)?.[1] ?? '';
    const raw = line.slice(separator + 1).replace(/\\n/gi, ' ').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\').trim();
    if (key === 'DTSTART') event.startZone = zone;
    if (key === 'DTEND') event.endZone = zone;
    if (['DTSTART', 'DTEND', 'SUMMARY', 'LOCATION', 'ATTENDEE', 'GROUP'].includes(key)) event[key] = raw;
    if (key === 'DESCRIPTION' && !event.SUMMARY) event.SUMMARY = raw;
  }
  return rows;
}

function icsDate(value: string, _zone?: string): { date: string; time: string } | null {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!match) return null;
  const date = `${match[1]}-${match[2]}-${match[3]}`;
  let time = match[4] ? `${match[4]}:${match[5]}` : '09:00';
  if (match[7]) {
    const instant = new Date(`${date}T${time}:00Z`);
    if (!Number.isFinite(instant.getTime())) return null;
    const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    const parts = Object.fromEntries(fmt.formatToParts(instant).map(p => [p.type, p.value]));
    return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
  }
  return { date, time };
}

export async function parsePracticeScheduleFile(file: File, target: ImportTarget): Promise<ImportedPractice[]> {
  if (!file.size || file.size > MAX_FILE_SIZE) throw new Error('Файл должен быть не пустым и не больше 20 МБ.');
  const extension = file.name.split('.').pop()?.toLocaleLowerCase('en-US') ?? '';
  let matrix: unknown[][];
  if (extension === 'csv' || extension === 'tsv' || extension === 'txt') matrix = csvMatrix(decodeScheduleText(await file.arrayBuffer()));
  else if (extension === 'ics') matrix = icsMatrix(decodeScheduleText(await file.arrayBuffer()));
  else if (extension === 'html' || extension === 'htm') {
    const tables = htmlScheduleTables(decodeScheduleText(await file.arrayBuffer()));
    const parsed = tables.flatMap(table => { try { return parseRows(table, file.name, target); } catch { return []; } });
    const unique = new Map(parsed.map(row => [row.id, row]));
    if (!unique.size) throw new Error('В HTML не нашёл таблицу расписания с датами, предметами и временем.');
    return [...unique.values()];
  }
  else if (['xlsx', 'xls', 'ods'].includes(extension)) {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
    const sheets = workbook.SheetNames.map(name => {
      const sheet = workbook.Sheets[name];
      return sheet ? XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: '' }) : [];
    }).filter(sheet => sheet.length);
    if (!sheets.length) throw new Error('В книге Excel нет заполненных листов.');
    const parsed: ImportedPractice[] = [];
    const ignored: string[] = [];
    for (const sheetRows of sheets) {
      try { parsed.push(...parseRows(sheetRows, file.name, target)); }
      catch (error) { ignored.push(error instanceof Error ? error.message : String(error)); }
    }
    const unique = new Map(parsed.map(row => [row.id, row]));
    if (!unique.size) throw new Error(ignored[0] ?? 'В книге не найдено подходящее расписание.');
    return [...unique.values()];
  } else throw new Error('Поддерживаются Excel (.xlsx, .xls), CSV/TSV и календарь ICS. PDF сохраните как Excel или CSV перед импортом.');
  return parseRows(matrix, file.name, target);
}
