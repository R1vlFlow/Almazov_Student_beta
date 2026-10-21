import { localDate } from './time.js?v=df0451745786acc4';
/** Ordinals describe the loaded timetable, not attendance or a department topic plan. */
export function numberLessons(events, selectedGroup) {
    const result = events.map(e => ({ ...e, lessonNumber: undefined }));
    const counters = new Map();
    const ordered = result.filter(e => e.kind === 'schedule' && e.type === 'practice' && e.status !== 'cancelled').sort((a, b) => a.startAt.localeCompare(b.startAt) || a.id.localeCompare(b.id));
    for (const e of ordered) {
        const date = localDate(e.startAt, 'Europe/Moscow'), year = Number(date.slice(0, 4)), month = Number(date.slice(5, 7));
        const term = month >= 9 ? `${year}-autumn` : month === 1 ? `${year - 1}-autumn` : `${year}-spring`;
        const subject = (e.subject || e.title).normalize('NFKC').toLocaleLowerCase('ru').replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
        const key = JSON.stringify([e.program, e.course, selectedGroup ?? e.group, term, subject, e.type]);
        const lessons = counters.get(key) ?? new Map();
        // The date is essential: recurring doubleOf identifiers can span many weeks.
        const identity = JSON.stringify(e.doubleOf ? [date, e.doubleOf] : [date, e.startAt, e.endAt, e.location || '']);
        if (!lessons.has(identity))
            lessons.set(identity, lessons.size + 1);
        e.lessonNumber = lessons.get(identity);
        counters.set(key, lessons);
    }
    return result;
}
