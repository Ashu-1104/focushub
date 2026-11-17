// Date helpers for the task calendar. All dates are local time.

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DAY_MS = 24 * 60 * 60 * 1000;

export const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// Monday-based week start
export const startOfWeek = (date) => {
  const day = startOfDay(date);
  return addDays(day, -((day.getDay() + 6) % 7));
};

// "2026-11-17" for a local date, used as calendar cell ids
export const dateKey = (date) => {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
};

// Due dates are stored at local noon so they never shift a day across time zones.
export const dueDateFromKey = (key) => new Date(`${key}T12:00:00`).toISOString();

export const isSameDay = (a, b) => dateKey(a) === dateKey(b);

// Days shown for a month (6 full weeks) or for a single week.
export const getVisibleDays = (anchor, view) => {
  const first =
    view === 'week'
      ? startOfWeek(anchor)
      : startOfWeek(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
  const count = view === 'week' ? 7 : 42;
  return Array.from({ length: count }, (_, i) => addDays(first, i));
};

export const shiftAnchor = (anchor, view, direction) =>
  view === 'week'
    ? addDays(anchor, direction * 7)
    : new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1);

export const formatRangeTitle = (anchor, view) => {
  if (view === 'month') {
    return anchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }
  const start = startOfWeek(anchor);
  const end = addDays(start, 6);
  const fmt = (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}, ${end.getFullYear()}`;
};

export const groupTasksByDay = (tasks) =>
  tasks.reduce((groups, task) => {
    if (!task.dueDate) return groups;
    const key = dateKey(task.dueDate);
    (groups[key] ||= []).push(task);
    return groups;
  }, {});

export { DAY_MS };
