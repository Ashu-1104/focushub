// Productivity analytics: buckets completed tasks and focus sessions by the user's local day.
// Pure functions over plain objects so the maths is easy to test.

export const FOCUS_TYPES = ['pomodoro', 'focus', 'custom']; // breaks are not focus time
export const RANGES = [7, 30, 90];
export const HEATMAP_DAYS = 84; // 12 weeks
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const PRIORITIES = ['urgent', 'high', 'medium', 'low'];
const DAY_MS = 24 * 60 * 60 * 1000;

export const isValidTimeZone = (tz) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

// "2026-11-17" for an instant, in the given time zone
export const localDate = (date, tz) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(date));

const localHour = (date, tz) =>
  Number(new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', hourCycle: 'h23' }).format(new Date(date)));

// Monday = 0 … Sunday = 6, for a "YYYY-MM-DD" day
const weekdayOf = (day) => (new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7;

// The last `count` local days ending today, oldest first
export const lastDays = (count, now, tz) => {
  const today = localDate(now, tz);
  const anchor = new Date(`${today}T12:00:00Z`).getTime();
  return Array.from({ length: count }, (_, i) => new Date(anchor - (count - 1 - i) * DAY_MS).toISOString().slice(0, 10));
};

const completedAtOf = (task) => task.completedAt || (task.status === 'done' ? task.updatedAt : null);

const percentChange = (current, previous) => {
  if (!previous) return current ? null : 0; // null: no baseline to compare with
  return Math.round(((current - previous) / previous) * 100);
};

export function buildAnalytics({ tasks, sessions, days, now = new Date(), tz }) {
  const window = lastDays(days * 2, now, tz);
  const current = new Set(window.slice(days));
  const previous = new Set(window.slice(0, days));
  const heatDays = lastDays(HEATMAP_DAYS, now, tz);
  const heat = Object.fromEntries(heatDays.map((d) => [d, 0]));

  const daily = Object.fromEntries([...current].map((d) => [d, { date: d, completed: 0, created: 0, focusMinutes: 0 }]));
  const byWeekday = WEEKDAYS.map((day) => ({ day, completed: 0, focusMinutes: 0 }));
  const byHour = Array.from({ length: 24 }, (_, hour) => ({ hour, focusMinutes: 0 }));
  const byPriority = Object.fromEntries(PRIORITIES.map((p) => [p, 0]));
  const prev = { completed: 0, focusMinutes: 0 };
  let withDue = 0;
  let onTime = 0;

  for (const task of tasks) {
    const created = localDate(task.createdAt, tz);
    if (current.has(created)) daily[created].created += 1;
    const doneAt = completedAtOf(task);
    if (!doneAt) continue;
    const day = localDate(doneAt, tz);
    if (day in heat) heat[day] += 1;
    if (previous.has(day)) prev.completed += 1;
    if (!current.has(day)) continue;
    daily[day].completed += 1;
    byWeekday[weekdayOf(day)].completed += 1;
    byPriority[task.priority] = (byPriority[task.priority] || 0) + 1;
    if (task.dueDate) {
      withDue += 1;
      if (day <= localDate(task.dueDate, tz)) onTime += 1;
    }
  }

  let sessionCount = 0;
  for (const session of sessions) {
    if (!FOCUS_TYPES.includes(session.type)) continue;
    const day = localDate(session.completedAt, tz);
    if (day in heat) heat[day] += 1;
    if (previous.has(day)) prev.focusMinutes += session.duration;
    if (!current.has(day)) continue;
    sessionCount += 1;
    daily[day].focusMinutes += session.duration;
    byWeekday[weekdayOf(day)].focusMinutes += session.duration;
    byHour[localHour(session.completedAt, tz)].focusMinutes += session.duration;
  }

  const series = Object.values(daily);
  const completed = series.reduce((sum, d) => sum + d.completed, 0);
  const created = series.reduce((sum, d) => sum + d.created, 0);
  const focusMinutes = series.reduce((sum, d) => sum + d.focusMinutes, 0);
  const best = series.reduce((top, d) => (d.completed > (top?.completed ?? 0) ? d : top), null);

  return {
    range: { days, start: series[0].date, end: series[series.length - 1].date, timeZone: tz },
    totals: {
      completed,
      created,
      focusMinutes,
      sessions: sessionCount,
      avgFocusPerDay: Math.round(focusMinutes / days),
      completionRate: created ? Math.min(100, Math.round((completed / created) * 100)) : null,
      onTimeRate: withDue ? Math.round((onTime / withDue) * 100) : null,
      bestDay: best ? { date: best.date, completed: best.completed } : null,
    },
    change: {
      completed: percentChange(completed, prev.completed),
      focusMinutes: percentChange(focusMinutes, prev.focusMinutes),
    },
    daily: series,
    byWeekday,
    byHour,
    byPriority: PRIORITIES.map((priority) => ({ priority, completed: byPriority[priority] })),
    heatmap: heatDays.map((date) => ({ date, count: heat[date] })),
  };
}
