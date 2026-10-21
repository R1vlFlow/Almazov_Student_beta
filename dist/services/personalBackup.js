import { readPersonalization, savePersonalization } from './personalizationStore.js?v=df0451745786acc4';
const databases = [['almazov-materials', 'files', ['scope', 'createdAt']], ['almazov-imported-practices', 'practice-events', ['scope', 'date']], ['almazov-local-support', 'tickets', []]];
const keys = ['almazov.profile', 'almazov.appearance', 'almazov.theme', 'almazov.timezone', 'almazov.event.draft', 'almazov.personal.events.v3'];
const MAX_BYTES = 80 * 1024 * 1024;
export function mergeBackupRecords(existing, incoming) {
    const seen = new Set(existing.map(row => row.id));
    const merged = [...existing];
    for (const row of incoming) {
        if (seen.has(row.id))
            continue;
        seen.add(row.id);
        merged.push(row);
    }
    return merged;
}
export function validBackupFileEncoding(text, size) {
    // Avoid a repeated-group regexp and decoding a second copy of a large file.
    if (!Number.isInteger(size) || size < 0 || text.length % 4 !== 0)
        return false;
    const padding = text.endsWith('==') ? 2 : text.endsWith('=') ? 1 : 0;
    return text.length / 4 * 3 - padding === size && !/[^A-Za-z0-9+/]/.test(text.slice(0, text.length - padding));
}
export async function decodeBackupFile(text, size, mimeType) {
    if (!validBackupFileEncoding(text, size) || size > 25 * 1024 * 1024)
        throw new Error('Повреждено содержимое файла');
    const bytes = new Uint8Array(size);
    let written = 0;
    for (let offset = 0; offset < text.length; offset += 32768) {
        const chunk = atob(text.slice(offset, offset + 32768));
        for (let i = 0; i < chunk.length; i++)
            bytes[written++] = chunk.charCodeAt(i);
        if (offset % 1048576 === 0)
            await new Promise(resolve => setTimeout(resolve, 0));
    }
    return new Blob([bytes], { type: mimeType });
}
function validDay(value) { if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false; const date = new Date(value + 'T00:00:00Z'); return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value; }
function validTime(value) { return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value); }
function object(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
function open(index) {
    const spec = databases[index];
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(spec[0], 1);
        req.onupgradeneeded = () => { const store = req.result.createObjectStore(spec[1], { keyPath: 'id' }); for (const key of spec[2])
            store.createIndex(key, key, { unique: false }); };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        req.onblocked = () => reject(new Error('Закройте другие вкладки приложения и повторите.'));
    });
}
async function readRows(index) { const db = await open(index); try {
    return await new Promise((resolve, reject) => { const tx = db.transaction(databases[index][1]); const req = tx.objectStore(databases[index][1]).getAll(); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
}
finally {
    db.close();
} }
async function mergeRows(index, rows) { const db = await open(index); try {
    await new Promise((resolve, reject) => { const tx = db.transaction(databases[index][1], 'readwrite'); const store = tx.objectStore(databases[index][1]); for (const row of rows) {
        const req = store.get(row.id);
        req.onsuccess = () => { if (!req.result)
            store.add(row); };
    } tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
}
finally {
    db.close();
} }
function encode(blob) { return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result).split(',')[1] || ''); r.onerror = () => reject(r.error); r.readAsDataURL(blob); }); }
export async function createPersonalBackup() {
    const backup = { format: 'almazov-personal-backup', version: 1, createdAt: new Date().toISOString(), personalization: readPersonalization(), local: {}, stores: {} };
    for (const key of keys) {
        const value = localStorage.getItem(key);
        if (value !== null)
            backup.local[key] = value;
    }
    let bytes = JSON.stringify(backup).length * 2;
    for (let i = 0; i < databases.length; i++) {
        const rows = await readRows(i);
        const output = [];
        for (const row of rows) {
            const copy = { ...row };
            if (copy.blob instanceof Blob) {
                bytes += Math.ceil(copy.blob.size * 4 / 3);
                if (bytes > MAX_BYTES)
                    throw new Error('Объём файлов превышает 80 МБ. Сохраните большие материалы отдельно перед переносом.');
                copy.fileBase64 = await encode(copy.blob);
                delete copy.blob;
            }
            output.push(copy);
        }
        backup.stores[databases[i][1]] = output;
    }
    if (new Blob([JSON.stringify(backup)]).size > MAX_BYTES)
        throw new Error('Резервная копия превышает 80 МБ.');
    return backup;
}
export function validatePersonalBackup(value) {
    if (!object(value) || value.format !== 'almazov-personal-backup' || value.version !== 1 || !object(value.personalization) || !object(value.local) || !object(value.stores))
        throw new Error('Это не резервная копия приложения поддерживаемой версии.');
    if (!Array.isArray(value.personalization.tasks) || !Array.isArray(value.personalization.materials) || [...value.personalization.tasks, ...value.personalization.materials].some(x => !object(x) || typeof x.id !== 'string' || typeof x.title !== 'string'))
        throw new Error('Повреждены персональные данные.');
    for (const [key, text] of Object.entries(value.local)) {
        if (!keys.includes(key) || typeof text !== 'string')
            throw new Error('Копия содержит неподдерживаемые настройки.');
        if (key.endsWith('.v3')) {
            const events = JSON.parse(text);
            if (!Array.isArray(events) || events.some(e => !object(e) || typeof e.id !== 'string' || typeof e.title !== 'string' || !Number.isFinite(Date.parse(String(e.startAt))) || !Number.isFinite(Date.parse(String(e.endAt))) || Date.parse(String(e.startAt)) >= Date.parse(String(e.endAt))))
                throw new Error('Повреждены личные события.');
        }
    }
    for (const [, store] of databases) {
        const rows = value.stores[store];
        if (!Array.isArray(rows) || rows.length > 30000)
            throw new Error('Повреждён раздел ' + store);
        const seen = new Set();
        for (const row of rows) {
            if (!object(row) || typeof row.id !== 'string' || !row.id || seen.has(row.id))
                throw new Error('Повреждена запись ' + store);
            seen.add(row.id);
            const required = store === 'files' ? ['title', 'subject', 'category', 'description', 'fileName', 'mimeType', 'createdAt', 'program', 'group', 'scope', 'fileBase64'] : store === 'practice-events' ? ['program', 'group', 'date', 'start', 'end', 'subject', 'location', 'teacher', 'sourceFile', 'createdAt', 'scope'] : ['number', 'subject', 'category', 'priority', 'status', 'createdAt', 'updatedAt'];
            if (store !== 'tickets' && (!['31.05.01', '31.05.02', '37.05.01'].includes(String(row.program)) || !Number.isInteger(row.course) || Number(row.course) < 1 || Number(row.course) > 6))
                throw new Error('Некорректная учебная группа');
            if (store !== 'tickets' && row.scope !== `${row.program}:${row.course}:${String(row.group).trim().toLocaleLowerCase('ru-RU')}`)
                throw new Error('Запись относится к другой учебной группе');
            if (required.some(key => typeof row[key] !== 'string'))
                throw new Error('Не хватает данных записи ' + store);
            if (store === 'files') {
                if (!/\.(pdf|docx|xlsx|pptx|zip|jpe?g|png)$/i.test(String(row.fileName)))
                    throw new Error('Неподдерживаемый формат материала');
                if (!Array.isArray(row.tags) || row.tags.some(t => typeof t !== 'string') || typeof row.size !== 'number' || row.size < 0 || row.size > 25 * 1024 * 1024 || !Number.isInteger(row.course))
                    throw new Error('Повреждён материал');
                const text = String(row.fileBase64);
                if (!validBackupFileEncoding(text, row.size))
                    throw new Error('Повреждено содержимое файла');
            }
            if (store === 'practice-events' && (!validDay(row.date) || !validTime(row.start) || !validTime(row.end) || String(row.start) >= String(row.end)))
                throw new Error('Повреждено занятие');
            if (store === 'tickets' && (!Array.isArray(row.messages) || row.messages.some(m => !object(m) || typeof m.body !== 'string') || !Array.isArray(row.attachments)))
                throw new Error('Повреждена заметка поддержки');
        }
    }
    return value;
}
export async function readPersonalBackup(file) { if (file.size > MAX_BYTES)
    throw new Error('Файл копии превышает 80 МБ.'); return validatePersonalBackup(JSON.parse(await file.text())); }
export async function restorePersonalBackup(backup) {
    validatePersonalBackup(backup);
    // Add missing records only. Existing files and notes always win on ID collision.
    for (let i = 0; i < databases.length; i++) {
        const rows = [];
        for (const source of backup.stores[databases[i][1]]) {
            const row = { ...source };
            if (typeof row.fileBase64 === 'string') {
                row.blob = await decodeBackupFile(row.fileBase64, Number(row.size), String(row.mimeType));
                delete row.fileBase64;
            }
            rows.push(row);
        }
        await mergeRows(i, rows);
    }
    const current = readPersonalization();
    const merge = mergeBackupRecords;
    savePersonalization({ ...backup.personalization, tasks: merge(current.tasks, backup.personalization.tasks), materials: merge(current.materials, backup.personalization.materials), subjectTeachers: { ...backup.personalization.subjectTeachers, ...current.subjectTeachers }, subjectColors: { ...backup.personalization.subjectColors, ...current.subjectColors } });
    for (const key of keys) {
        const text = backup.local[key];
        if (text === undefined)
            continue;
        if (key === 'almazov.personal.events.v3') {
            const old = JSON.parse(localStorage.getItem(key) || '[]');
            localStorage.setItem(key, JSON.stringify(merge(old, JSON.parse(text))));
        }
        else if (localStorage.getItem(key) === null)
            localStorage.setItem(key, text);
    }
}
export function bindPersonalBackup() {
    const status = document.getElementById('backupStatus');
    const exportButton = document.getElementById('exportPersonalBackup');
    const fileInput = document.getElementById('restorePersonalBackup');
    let busy = false;
    const lock = (value) => { busy = value; if (exportButton)
        exportButton.disabled = value; if (fileInput)
        fileInput.disabled = value; };
    exportButton?.addEventListener('click', async () => { if (busy)
        return; lock(true); if (status)
        status.textContent = 'Собираем настройки, заметки, импортированные ПЗ и файлы…'; try {
        const data = await createPersonalBackup();
        const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = 'almazov-backup-' + new Date().toISOString().slice(0, 10) + '.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        if (status)
            status.textContent = 'Копия подготовлена. Проверьте загрузки и сохраните файл в надёжном месте: он содержит ваши личные данные.';
    }
    catch (e) {
        if (status)
            status.textContent = String(e instanceof Error ? e.message : e);
    }
    finally {
        lock(false);
    } });
    fileInput?.addEventListener('change', async () => { const file = fileInput.files?.[0]; if (!file || busy)
        return; lock(true); try {
        const data = await readPersonalBackup(file);
        const count = Object.values(data.stores).reduce((n, rows) => n + rows.length, 0);
        if (!confirm('Восстановить копию от ' + data.createdAt + '? Записей файлов, ПЗ и заметок: ' + count + '. Существующие записи сохранятся, настройки из копии будут применены. Сначала рекомендуется скачать копию текущих данных.'))
            return;
        if (status)
            status.textContent = 'Восстанавливаем данные…';
        await restorePersonalBackup(data);
        if (status)
            status.textContent = 'Данные восстановлены. Сохраните открытые формы и перезагрузите страницу, чтобы увидеть их.';
    }
    catch (e) {
        if (status)
            status.textContent = 'Восстановление не завершено: ' + String(e instanceof Error ? e.message : e) + '. Уже добавленные записи сохранены; можно повторить перенос, дубликаты по ID не добавятся.';
    }
    finally {
        fileInput.value = '';
        lock(false);
    } });
}
