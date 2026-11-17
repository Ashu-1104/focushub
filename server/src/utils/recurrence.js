export const RECURRENCE_TYPES = ['none', 'daily', 'weekly', 'monthly'];

// Next due date for a repeating task. Monthly keeps the day of month, clamped
// to the last day of shorter months (Jan 31 -> Feb 28 -> Mar 28).
export const nextOccurrence = (date, recurrence) => {
  const next = new Date(date);
  if (recurrence === 'daily') {
    next.setDate(next.getDate() + 1);
  } else if (recurrence === 'weekly') {
    next.setDate(next.getDate() + 7);
  } else if (recurrence === 'monthly') {
    const day = next.getDate();
    next.setDate(1);
    next.setMonth(next.getMonth() + 1);
    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(day, lastDay));
  } else {
    return null;
  }
  return next;
};
