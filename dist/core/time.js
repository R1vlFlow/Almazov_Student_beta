export function userTimeZone() {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Moscow';
    }
    catch {
        return 'Europe/Moscow';
    }
}
const partFormatters = new Map();
const partCache = new Map();
function parts(date, timeZone) {
    const key = `${timeZone}:${date.getTime()}`;
    const cached = partCache.get(key);
    if (cached)
        return { ...cached };
    let formatter = partFormatters.get(timeZone);
    if (!formatter) {
        formatter = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
        if (partFormatters.size >= 32)
            partFormatters.clear();
        partFormatters.set(timeZone, formatter);
    }
    const ps = formatter.formatToParts(date);
    const get = (type) => Number(ps.find(p => p.type === type)?.value ?? 0);
    const result = { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute'), second: get('second') };
    if (partCache.size >= 4096)
        partCache.clear();
    partCache.set(key, result);
    return { ...result };
}
function offsetMs(date, timeZone) {
    const p = parts(date, timeZone);
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - date.getTime();
}
export function localDateTimeToUtc(localValue, timeZone) {
    const m = localValue.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (!m)
        throw new Error('Некорректная локальная дата и время');
    const naive = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6] ?? 0));
    let guess = new Date(naive);
    for (let i = 0; i < 4; i++)
        guess = new Date(naive - offsetMs(guess, timeZone));
    return guess.toISOString();
}
export function formatInstant(iso, timeZone, options) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime()))
        throw new Error('Некорректный ISO instant');
    return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short', timeZone, ...options }).format(date);
}
export function localParts(iso, timeZone) { return parts(new Date(iso), timeZone); }
export function localDate(iso, timeZone) { const p = localParts(iso, timeZone); return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`; }
export function localTime(iso, timeZone) { const p = localParts(iso, timeZone); return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`; }
export function localDateTimeInput(iso, timeZone) { const p = localParts(iso, timeZone); return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}T${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`; }
export function minutesBetween(a, b) { return Math.max(0, Math.round((Date.parse(b) - Date.parse(a)) / 60000)); }
export function dateDiffDays(a, b) { return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000); }
