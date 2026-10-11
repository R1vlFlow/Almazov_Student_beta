import * as XLSX from 'xlsx';
const DB_NAME = 'almazov-imported-practices';
const STORE = 'practice-events';
const DB_VERSION = 1;
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const aliases = {
    date: ['дата', 'число', 'date', 'день'],
    start: ['начало', 'с', 'время начала', 'start', 'время', 'time'],
    end: ['окончание', 'конец', 'до', 'время окончания', 'end'],
    subject: ['предмет', 'дисциплина', 'занятие', 'тема', 'subject', 'summary', 'название'],
    location: ['аудитория', 'место', 'корпус', 'кабинет', 'location', 'room'],
    teacher: ['преподаватель', 'преподаватель фио', 'фио преподавателя', 'teacher'],
    group: ['группа', 'group'],
    program: ['программа', 'специальность', 'код специальности', 'program'],
    course: ['курс', 'course'],
    type: ['тип', 'вид занятия', 'type']
};
const norm = (value) => String(value ?? '').replace(/^\uFEFF/, '').trim().toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').replace(/[._-]+/g, ' ').replace(/\s+/g, ' ');
const clean = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');
function openDb() {
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
export function practiceScope(program, course, group) {
    return `${program}:${course}:${clean(group).toLocaleLowerCase('ru-RU')}`;
}
export async function listImportedPractices(program, course, group, from, to) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).index('scope').getAll(practiceScope(program, course, group));
        req.onsuccess = () => resolve(req.result.filter(e => e.date >= from && e.date <= to).sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start)));
        req.onerror = () => reject(req.error ?? new Error('Не удалось прочитать импортированные ПЗ.'));
        tx.oncomplete = () => db.close();
        tx.onerror = () => { db.close(); reject(tx.error); };
    });
}
export async function countImportedPractices(program, course, group) {
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
export async function saveImportedPractices(rows, replaceScope) {
    if (!rows.length)
        throw new Error('В файле нет строк практических занятий для выбранной группы.');
    const scope = practiceScope(rows[0].program, rows[0].course, rows[0].group);
    if (rows.some(row => practiceScope(row.program, row.course, row.group) !== scope))
        throw new Error('Одна загрузка должна относиться к одной программе, курсу и группе.');
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        const index = store.index('scope');
        const existingRequest = index.getAll(scope);
        let result = { added: 0, total: 0 };
        existingRequest.onsuccess = () => {
            const existing = existingRequest.result;
            const duplicateKey = (row) => [row.date, row.start, row.end, norm(row.subject), norm(row.location)].join('|');
            const seen = new Set(replaceScope ? [] : existing.map(duplicateKey));
            const additions = rows.filter(row => { const key = duplicateKey(row); if (seen.has(key))
                return false; seen.add(key); return true; });
            if (replaceScope) {
                const cursorRequest = index.openCursor(scope);
                cursorRequest.onsuccess = () => { const cursor = cursorRequest.result; if (cursor) {
                    cursor.delete();
                    cursor.continue();
                } };
            }
            for (const row of additions)
                store.put({ ...row, scope });
            result = { added: additions.length, total: replaceScope ? additions.length : existing.length + additions.length };
        };
        existingRequest.onerror = () => { try {
            tx.abort();
        }
        catch { } reject(existingRequest.error ?? new Error('Не удалось сохранить ПЗ.')); };
        tx.oncomplete = () => { db.close(); resolve(result); };
        tx.onerror = () => { db.close(); reject(tx.error ?? new Error('Не удалось сохранить ПЗ.')); };
        tx.onabort = () => { db.close(); reject(tx.error ?? new Error('Импорт отменён: файл не изменил расписание.')); };
    });
}
function dateValue(value) {
    if (value instanceof Date && Number.isFinite(value.getTime()))
        return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
    const text = clean(value);
    let m = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (m)
        return `${m[1]}-${String(Number(m[2])).padStart(2, '0')}-${String(Number(m[3])).padStart(2, '0')}`;
    m = text.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/);
    if (m)
        return `${m[3]}-${String(Number(m[2])).padStart(2, '0')}-${String(Number(m[1])).padStart(2, '0')}`;
    if (typeof value === 'number' && value > 20000 && value < 80000) {
        const d = new Date(Date.UTC(1899, 11, 30) + value * 86400000);
        return d.toISOString().slice(0, 10);
    }
    return '';
}
function timeValue(value) {
    if (value instanceof Date && Number.isFinite(value.getTime()))
        return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
    if (typeof value === 'number' && value >= 0 && value < 1) {
        const minutes = Math.round(value * 1440);
        return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
    }
    const match = clean(value).match(/(?:^|\D)([01]?\d|2[0-3])[:.]([0-5]\d)(?:\s|$)/);
    return match ? `${String(Number(match[1])).padStart(2, '0')}:${match[2]}` : '';
}
function parseRows(matrix, fileName, target) {
    const maxHeader = Math.min(matrix.length, 20);
    let headerRow = -1;
    let columns = {};
    for (let i = 0; i < maxHeader; i++) {
        const candidate = {};
        (matrix[i] ?? []).forEach((value, index) => {
            const name = norm(value);
            for (const [key, names] of Object.entries(aliases))
                if (names.includes(name) && candidate[key] === undefined)
                    candidate[key] = index;
        });
        if (candidate.date !== undefined && candidate.subject !== undefined && (candidate.start !== undefined || candidate.end === undefined)) {
            headerRow = i;
            columns = candidate;
            break;
        }
    }
    if (headerRow < 0)
        throw new Error('Не нашёл заголовки столбцов. Нужны: Дата, Предмет, Начало и Окончание (или один столбец «Время»).');
    const value = (row, key) => columns[key] === undefined ? '' : row[columns[key]] ?? '';
    const rows = [];
    const selectedGroup = clean(target.group);
    for (const cells of matrix.slice(headerRow + 1)) {
        if (!cells?.some(cell => clean(cell)))
            continue;
        const providedProgram = norm(value(cells, 'program'));
        const providedCourse = clean(value(cells, 'course')).match(/\d+/)?.[0];
        const providedGroup = clean(value(cells, 'group'));
        const programHint = providedProgram.includes('31 05 01') || providedProgram.includes('лечебное дело') ? '31.05.01' : providedProgram.includes('31 05 02') || providedProgram.includes('педиатр') ? '31.05.02' : providedProgram.includes('37 05 01') || providedProgram.includes('клиническая психология') ? '37.05.01' : '';
        if (programHint && programHint !== target.program)
            continue;
        if (providedCourse && Number(providedCourse) !== target.course)
            continue;
        if (providedGroup && selectedGroup && norm(providedGroup) !== norm(selectedGroup))
            continue;
        const type = norm(value(cells, 'type'));
        if (type && /(лекц|lecture)/.test(type))
            continue;
        const date = dateValue(value(cells, 'date'));
        const subject = clean(value(cells, 'subject'));
        let start = timeValue(value(cells, 'start'));
        let end = timeValue(value(cells, 'end'));
        if ((!start || !end) && columns.start !== undefined && columns.end === undefined) {
            const range = clean(value(cells, 'start')).match(/([01]?\d|2[0-3])[:.]([0-5]\d)\s*[-–—]\s*([01]?\d|2[0-3])[:.]([0-5]\d)/);
            if (range) {
                start = `${String(Number(range[1])).padStart(2, '0')}:${range[2]}`;
                end = `${String(Number(range[3])).padStart(2, '0')}:${range[4]}`;
            }
        }
        if (!date && !subject && !start && !end)
            continue;
        if (!date || !subject || !start || !end)
            continue;
        if (end <= start)
            continue;
        const group = providedGroup || selectedGroup;
        if (!group)
            continue;
        const source = [target.program, target.course, group, date, start, end, subject, clean(value(cells, 'location'))].join('|');
        rows.push({ id: `practice-${simpleHash(source)}`, program: target.program, course: target.course, group, date, start, end, subject: subject.slice(0, 180), location: clean(value(cells, 'location')).slice(0, 180), teacher: clean(value(cells, 'teacher')).slice(0, 120), sourceFile: fileName.slice(0, 180), createdAt: new Date().toISOString() });
    }
    return rows;
}
function simpleHash(text) { let hash = 2166136261; for (const char of text) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
} return (hash >>> 0).toString(16); }
function csvMatrix(text) {
    const firstLine = (text.split(/\r?\n/, 1)[0] ?? '').replace(/^\uFEFF/, '');
    const delimiter = [';', '\t', ','].map(value => ({ value, count: firstLine.split(value).length - 1 })).sort((a, b) => b.count - a.count)[0].value;
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (quoted) {
            if (char === '"' && text[i + 1] === '"') {
                cell += '"';
                i++;
            }
            else if (char === '"')
                quoted = false;
            else
                cell += char;
        }
        else if (char === '"')
            quoted = true;
        else if (char === delimiter) {
            row.push(cell);
            cell = '';
        }
        else if (char === '\n') {
            row.push(cell.replace(/\r$/, ''));
            rows.push(row);
            row = [];
            cell = '';
        }
        else
            cell += char;
    }
    row.push(cell.replace(/\r$/, ''));
    if (row.some(x => x.trim()))
        rows.push(row);
    return rows;
}
function icsMatrix(text) {
    const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
    const rows = [['Дата', 'Начало', 'Окончание', 'Предмет', 'Аудитория', 'Преподаватель', 'Группа']];
    let event = null;
    for (const line of lines) {
        if (line === 'BEGIN:VEVENT') {
            event = {};
            continue;
        }
        if (line === 'END:VEVENT' && event) {
            const start = icsDate(event.DTSTART ?? '', event.startZone);
            const end = icsDate(event.DTEND ?? '', event.endZone);
            if (start && end)
                rows.push([start.date, start.time, end.time, event.SUMMARY ?? '', event.LOCATION ?? '', event.ATTENDEE ?? '', event.GROUP ?? '']);
            event = null;
            continue;
        }
        if (!event)
            continue;
        const separator = line.indexOf(':');
        if (separator < 0)
            continue;
        const keyRaw = line.slice(0, separator);
        const key = keyRaw.split(';')[0];
        const zone = keyRaw.match(/TZID=([^;:]+)/)?.[1] ?? '';
        const raw = line.slice(separator + 1).replace(/\\n/gi, ' ').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\').trim();
        if (key === 'DTSTART')
            event.startZone = zone;
        if (key === 'DTEND')
            event.endZone = zone;
        if (['DTSTART', 'DTEND', 'SUMMARY', 'LOCATION', 'ATTENDEE', 'GROUP'].includes(key))
            event[key] = raw;
        if (key === 'DESCRIPTION' && !event.SUMMARY)
            event.SUMMARY = raw;
    }
    return rows;
}
function icsDate(value, _zone) {
    const match = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
    if (!match)
        return null;
    const date = `${match[1]}-${match[2]}-${match[3]}`;
    let time = match[4] ? `${match[4]}:${match[5]}` : '09:00';
    if (match[7]) {
        const instant = new Date(`${date}T${time}:00Z`);
        if (!Number.isFinite(instant.getTime()))
            return null;
        const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
        const parts = Object.fromEntries(fmt.formatToParts(instant).map(p => [p.type, p.value]));
        return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
    }
    return { date, time };
}
export async function parsePracticeScheduleFile(file, target) {
    if (!file.size || file.size > MAX_FILE_SIZE)
        throw new Error('Файл должен быть не пустым и не больше 20 МБ.');
    const extension = file.name.split('.').pop()?.toLocaleLowerCase('en-US') ?? '';
    let matrix;
    if (extension === 'csv' || extension === 'tsv' || extension === 'txt')
        matrix = csvMatrix(new TextDecoder().decode(await file.arrayBuffer()));
    else if (extension === 'ics')
        matrix = icsMatrix(new TextDecoder().decode(await file.arrayBuffer()));
    else if (extension === 'xlsx' || extension === 'xls') {
        const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0] ?? ''];
        if (!sheet)
            throw new Error('В книге Excel нет листов.');
        matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });
    }
    else
        throw new Error('Поддерживаются Excel (.xlsx, .xls), CSV/TSV и календарь ICS. PDF сохраните как Excel или CSV перед импортом.');
    return parseRows(matrix, file.name, target);
}
