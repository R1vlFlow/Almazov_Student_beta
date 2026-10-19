const KEY = 'almazov.schedule-history.v1';
function signatures(data) { const result = new Map(); for (const row of [...data.events, ...data.weeklyBlocks ?? []]) {
    const r = row;
    const key = JSON.stringify(['group', 'stream', 'date', 'start', 'end', 'subject', 'type', 'location', 'teacher', 'weeks', 'weekNumber', 'cycleDates', 'weekRangeStart', 'weekRangeEnd', 'cycleDateStatus'].map(k => r[k] ?? null));
    result.set(key, (result.get(key) ?? 0) + 1);
} return result; }
export function compareSchedules(old, next) { const before = signatures(old), after = signatures(next); let added = 0, removed = 0; for (const [key, n] of after)
    added += Math.max(0, n - (before.get(key) ?? 0)); for (const [key, n] of before)
    removed += Math.max(0, n - (after.get(key) ?? 0)); return { added, removed }; }
export function readScheduleHistory(key) { try {
    return JSON.parse(localStorage.getItem(KEY) || '{}')[key] ?? null;
}
catch {
    return null;
} }
export function recordScheduleCheck(key, previous, next) { try {
    const all = JSON.parse(localStorage.getItem(KEY) || '{}');
    const old = readScheduleHistory(key);
    const diff = previous ? compareSchedules(previous, next) : { added: 0, removed: 0 };
    const at = new Date().toISOString();
    const changed = !!(diff.added || diff.removed);
    all[key] = { checkedAt: at, generatedAt: next.generatedAt, changedAt: changed ? at : old?.changedAt, added: diff.added, removed: diff.removed, history: changed ? [{ at, ...diff }, ...(old?.history ?? [])].slice(0, 20) : old?.history ?? [] };
    localStorage.setItem(KEY, JSON.stringify(all));
}
catch { /* Private mode or quota must not prevent displaying a schedule. */ } }
