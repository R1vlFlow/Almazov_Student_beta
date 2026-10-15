import { localDate, localTime, localDateTimeInput } from './time.js?v=e928bed48344205e';
export function displayScheduleParts(e) {
    if (!(e.orgMerged || e.mergedConsecutive) || e.doublePart)
        return [e];
    const parts = e.lessonParts;
    if (parts?.length === 2 && parts[0].start === e.start && parts[1].end === e.end && parts.every(p => /^\d{2}:\d{2}$/.test(p.start) && /^\d{2}:\d{2}$/.test(p.end) && p.start < p.end) && parts[0].end <= parts[1].start) {
        return parts.map((p, i) => ({ ...e, ...p, id: `${e.id}-part-${i + 1}`, doublePart: (i + 1) }));
    }
    const start = Number(e.start.slice(0, 2)) * 60 + Number(e.start.slice(3));
    const end = Number(e.end.slice(0, 2)) * 60 + Number(e.end.slice(3));
    const duration = end - start;
    if (![185, 205].includes(duration))
        return [e];
    const partMinutes = (duration - 15) / 2;
    const format = (value) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
    const firstEnd = start + partMinutes;
    const secondStart = firstEnd + 15;
    return [
        { ...e, id: `${e.id}-1`, end: format(firstEnd), double: true, doublePart: 1, mergedConsecutive: undefined, durationMinutes: partMinutes },
        { ...e, id: `${e.id}-2`, start: format(secondStart), double: true, doublePart: 2, mergedConsecutive: undefined, durationMinutes: partMinutes }
    ];
}
function localToUtc(localValue, zone) {
    const m = localValue.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (!m)
        throw new Error('Некорректная локальная дата и время');
    const year = Number(m[1] ?? 0), month = Number(m[2] ?? 0), day = Number(m[3] ?? 0), hour = Number(m[4] ?? 0), minute = Number(m[5] ?? 0), second = Number(m[6] ?? 0);
    const naive = Date.UTC(year, month - 1, day, hour, minute, second);
    const offset = (utc) => {
        const ps = new Intl.DateTimeFormat('en-US', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(utc));
        const g = (t) => Number(ps.find(p => p.type === t)?.value ?? 0);
        return Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second')) - utc;
    };
    let guess = naive;
    for (let i = 0; i < 4; i++)
        guess = naive - offset(guess);
    return new Date(guess).toISOString();
}
export function scheduleToCalendarEvent(e, _displayTimeZone) { const startAt = localToUtc(`${e.date}T${e.start}`, 'Europe/Moscow'); const endAt = localToUtc(`${e.date}T${e.end}`, 'Europe/Moscow'); return { id: e.id, kind: 'schedule', title: e.subject, sourceNotice: e.sourceNotice, description: e.sourceNotice ?? '', category: e.type, status: 'planned', startAt, endAt, timeZone: 'Europe/Moscow', allDay: false, location: e.location, program: e.program, course: e.course, group: e.group, stream: e.stream, type: e.type, teacher: e.teacher, half: e.half, doublePart: e.doublePart, weeks: e.weeks, readOnly: true }; }
export function decorateEvent(e, timeZone) { return { event: e, date: localDate(e.startAt, timeZone), start: localTime(e.startAt, timeZone), end: localTime(e.endAt, timeZone), startInput: localDateTimeInput(e.startAt, timeZone), endInput: localDateTimeInput(e.endAt, timeZone) }; }
export function eventDates(e, timeZone) { const first = localDate(e.startAt, timeZone), last = localDate(e.endAt, timeZone), out = []; let cursor = first; while (cursor <= last && out.length < 370) {
    out.push(cursor);
    const d = new Date(`${cursor}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    cursor = d.toISOString().slice(0, 10);
} return out; }
